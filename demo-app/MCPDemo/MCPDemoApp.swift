import SwiftUI
import UserNotifications

@main
struct MCPDemoApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    init() {
        setupOnLaunch()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }

    private func setupOnLaunch() {
        // Write UserDefaults value for testing
        UserDefaults.standard.set("MCP Demo launched at \(Date())", forKey: "lastLaunch")
        UserDefaults.standard.set(42, forKey: "favoriteNumber")
        UserDefaults.standard.set(true, forKey: "hasLaunched")
        UserDefaults.standard.synchronize()

        // Write a file to Documents/ for testing read_app_file
        if let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
            let testFile = docs.appendingPathComponent("mcp_test_data.json")
            let data: [String: Any] = [
                "app": "MCPDemo",
                "version": "1.0",
                "launchedAt": ISO8601DateFormatter().string(from: Date()),
                "features": ["interactions", "location", "notifications", "settings"]
            ]
            if let jsonData = try? JSONSerialization.data(withJSONObject: data, options: .prettyPrinted) {
                try? jsonData.write(to: testFile)
            }

            let logFile = docs.appendingPathComponent("app_log.txt")
            let logEntry = "[\(Date())] App launched successfully\n"
            if let existing = try? String(contentsOf: logFile, encoding: .utf8) {
                try? (existing + logEntry).write(to: logFile, atomically: true, encoding: .utf8)
            } else {
                try? logEntry.write(to: logFile, atomically: true, encoding: .utf8)
            }
        }

        // Request notification permissions
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { _, _ in }
    }
}

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    static var shared: AppDelegate?
    var receivedNotifications: [NotificationItem] = []
    var onNotification: ((NotificationItem) -> Void)?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        AppDelegate.shared = self
        UNUserNotificationCenter.current().delegate = self
        UIApplication.shared.registerForRemoteNotifications()
        return true
    }

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("Device Token: \(token)")
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Failed to register for notifications: \(error)")
    }

    // Handle notifications when app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        let content = notification.request.content
        let item = NotificationItem(
            title: content.title,
            body: content.body,
            date: Date(),
            userInfo: content.userInfo as? [String: String] ?? [:]
        )
        receivedNotifications.append(item)
        onNotification?(item)
        completionHandler([.banner, .sound, .badge])
    }

    // Handle notification tap
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let content = response.notification.request.content
        let item = NotificationItem(
            title: content.title,
            body: content.body,
            date: Date(),
            userInfo: content.userInfo as? [String: String] ?? [:]
        )
        receivedNotifications.append(item)
        onNotification?(item)
        completionHandler()
    }
}

struct NotificationItem: Identifiable, Equatable {
    let id = UUID()
    let title: String
    let body: String
    let date: Date
    let userInfo: [String: String]

    static func == (lhs: NotificationItem, rhs: NotificationItem) -> Bool {
        lhs.id == rhs.id
    }
}

import SwiftUI
import CoreLocation
import LocalAuthentication
import Network

// MARK: - Main Content View

struct ContentView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            InteractionsTab()
                .tabItem {
                    Label("Interactions", systemImage: "hand.tap.fill")
                }
                .tag(0)
                .accessibilityLabel("Interactions Tab")

            LocationTab()
                .tabItem {
                    Label("Location", systemImage: "location.fill")
                }
                .tag(1)
                .accessibilityLabel("Location Tab")

            NotificationsTab()
                .tabItem {
                    Label("Notifications", systemImage: "bell.fill")
                }
                .tag(2)
                .accessibilityLabel("Notifications Tab")

            SettingsTab()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
                .tag(3)
                .accessibilityLabel("Settings Tab")

            StoreKitTab()
                .tabItem {
                    Label("StoreKit", systemImage: "cart.fill")
                }
                .tag(4)
                .accessibilityLabel("StoreKit Tab")

            NetworkTab()
                .tabItem {
                    Label("Network", systemImage: "wifi")
                }
                .tag(5)
                .accessibilityLabel("Network Tab")

            DebugTab()
                .tabItem {
                    Label("Debug", systemImage: "ant.fill")
                }
                .tag(6)
                .accessibilityLabel("Debug Tab")
        }
        .tint(.blue)
    }
}

// MARK: - Interactions Tab

struct InteractionsTab: View {
    @State private var textInput = ""
    @State private var tapCount = 0
    @State private var isLongPressed = false
    @State private var sliderValue: Double = 50
    @State private var toggleOn = false
    @State private var selectedSegment = 0
    @State private var showAlert = false
    @State private var alertMessage = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Tap Buttons Section
                    GroupBox {
                        VStack(spacing: 12) {
                            Text("Tap Counter: \(tapCount)")
                                .font(.title2)
                                .fontWeight(.semibold)
                                .accessibilityLabel("Tap Counter \(tapCount)")
                                .accessibilityIdentifier("tapCountLabel")

                            HStack(spacing: 12) {
                                Button(action: { tapCount += 1 }) {
                                    Label("Tap Me", systemImage: "plus.circle.fill")
                                        .frame(maxWidth: .infinity)
                                }
                                .buttonStyle(.borderedProminent)
                                .accessibilityLabel("Tap Me Button")
                                .accessibilityIdentifier("tapButton")

                                Button(action: { tapCount = 0 }) {
                                    Label("Reset", systemImage: "arrow.counterclockwise")
                                        .frame(maxWidth: .infinity)
                                }
                                .buttonStyle(.bordered)
                                .tint(.red)
                                .accessibilityLabel("Reset Button")
                                .accessibilityIdentifier("resetButton")
                            }

                            Button(action: {
                                tapCount += 10
                                alertMessage = "Added 10 taps! Total: \(tapCount)"
                                showAlert = true
                            }) {
                                Label("Add 10 Taps", systemImage: "hand.tap")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.orange)
                            .accessibilityLabel("Add Ten Taps Button")
                            .accessibilityIdentifier("addTenButton")
                        }
                    } label: {
                        Label("Buttons", systemImage: "rectangle.and.hand.point.up.left.fill")
                            .font(.headline)
                    }
                    .accessibilityLabel("Buttons Section")

                    // Text Input Section
                    GroupBox {
                        VStack(spacing: 12) {
                            TextField("Type something here...", text: $textInput)
                                .textFieldStyle(.roundedBorder)
                                .accessibilityLabel("Text Input Field")
                                .accessibilityIdentifier("textInputField")

                            if !textInput.isEmpty {
                                Text("You typed: \(textInput)")
                                    .font(.callout)
                                    .foregroundStyle(.secondary)
                                    .accessibilityLabel("Typed Text Display")
                                    .accessibilityIdentifier("typedTextLabel")
                            }

                            HStack {
                                Button("Clear") {
                                    textInput = ""
                                }
                                .buttonStyle(.bordered)
                                .accessibilityLabel("Clear Text Button")
                                .accessibilityIdentifier("clearTextButton")

                                Spacer()

                                Text("\(textInput.count) characters")
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                                    .accessibilityLabel("Character Count \(textInput.count)")
                            }
                        }
                    } label: {
                        Label("Text Input", systemImage: "keyboard")
                            .font(.headline)
                    }

                    // Long Press Section
                    GroupBox {
                        VStack(spacing: 12) {
                            RoundedRectangle(cornerRadius: 16)
                                .fill(isLongPressed
                                      ? LinearGradient(colors: [.green, .mint], startPoint: .topLeading, endPoint: .bottomTrailing)
                                      : LinearGradient(colors: [.blue, .cyan], startPoint: .topLeading, endPoint: .bottomTrailing))
                                .frame(height: 100)
                                .overlay {
                                    VStack {
                                        Image(systemName: isLongPressed ? "checkmark.circle.fill" : "hand.point.up.left.fill")
                                            .font(.largeTitle)
                                            .foregroundStyle(.white)
                                        Text(isLongPressed ? "Long Press Detected!" : "Long Press Here")
                                            .font(.headline)
                                            .foregroundStyle(.white)
                                    }
                                }
                                .onLongPressGesture(minimumDuration: 0.8) {
                                    withAnimation(.spring()) {
                                        isLongPressed = true
                                    }
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                                        withAnimation { isLongPressed = false }
                                    }
                                }
                                .accessibilityLabel("Long Press Area")
                                .accessibilityIdentifier("longPressArea")
                                .accessibilityHint("Long press to activate")
                        }
                    } label: {
                        Label("Long Press", systemImage: "hand.point.up.left.and.text")
                            .font(.headline)
                    }

                    // Controls Section
                    GroupBox {
                        VStack(spacing: 16) {
                            Toggle(isOn: $toggleOn) {
                                Text("Toggle Switch")
                            }
                            .accessibilityLabel("Toggle Switch")
                            .accessibilityIdentifier("toggleSwitch")

                            VStack(alignment: .leading) {
                                Text("Slider: \(Int(sliderValue))")
                                    .accessibilityLabel("Slider Value \(Int(sliderValue))")
                                Slider(value: $sliderValue, in: 0...100)
                                    .accessibilityLabel("Value Slider")
                                    .accessibilityIdentifier("valueSlider")
                            }

                            Picker("Segment", selection: $selectedSegment) {
                                Text("One").tag(0)
                                Text("Two").tag(1)
                                Text("Three").tag(2)
                            }
                            .pickerStyle(.segmented)
                            .accessibilityLabel("Segment Picker")
                            .accessibilityIdentifier("segmentPicker")
                        }
                    } label: {
                        Label("Controls", systemImage: "slider.horizontal.3")
                            .font(.headline)
                    }

                    // Navigation Section
                    GroupBox {
                        VStack(spacing: 12) {
                            NavigationLink(destination: DetailView(title: "Item Details")) {
                                HStack {
                                    Image(systemName: "arrow.right.circle.fill")
                                        .foregroundStyle(.blue)
                                    Text("Navigate to Detail View")
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .foregroundStyle(.tertiary)
                                }
                                .padding(.vertical, 4)
                            }
                            .accessibilityLabel("Navigate to Detail View")
                            .accessibilityIdentifier("detailNavLink")

                            NavigationLink(destination: ScrollableListView()) {
                                HStack {
                                    Image(systemName: "list.bullet")
                                        .foregroundStyle(.purple)
                                    Text("Scrollable List (50 items)")
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .foregroundStyle(.tertiary)
                                }
                                .padding(.vertical, 4)
                            }
                            .accessibilityLabel("Navigate to Scrollable List")
                            .accessibilityIdentifier("listNavLink")

                            NavigationLink(destination: DeepNavigationView(depth: 1)) {
                                HStack {
                                    Image(systemName: "arrow.triangle.branch")
                                        .foregroundStyle(.orange)
                                    Text("Deep Navigation (3 levels)")
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .foregroundStyle(.tertiary)
                                }
                                .padding(.vertical, 4)
                            }
                            .accessibilityLabel("Navigate to Deep Navigation")
                            .accessibilityIdentifier("deepNavLink")
                        }
                    } label: {
                        Label("Navigation", systemImage: "arrow.triangle.turn.up.right.diamond.fill")
                            .font(.headline)
                    }

                    // Scrollable Inline List
                    GroupBox {
                        VStack(spacing: 0) {
                            ForEach(1...10, id: \.self) { i in
                                HStack {
                                    Circle()
                                        .fill(Color(hue: Double(i) / 10.0, saturation: 0.7, brightness: 0.9))
                                        .frame(width: 32, height: 32)
                                        .overlay {
                                            Text("\(i)")
                                                .font(.caption)
                                                .fontWeight(.bold)
                                                .foregroundStyle(.white)
                                        }
                                    Text("List Item \(i)")
                                        .accessibilityLabel("List Item \(i)")
                                    Spacer()
                                    Image(systemName: "star")
                                        .foregroundStyle(.yellow)
                                }
                                .padding(.vertical, 6)
                                .accessibilityIdentifier("listItem\(i)")
                                if i < 10 {
                                    Divider()
                                }
                            }
                        }
                    } label: {
                        Label("Inline List", systemImage: "list.number")
                            .font(.headline)
                    }
                }
                .padding()
            }
            .navigationTitle("Interactions")
            .alert("Action", isPresented: $showAlert) {
                Button("OK") { }
            } message: {
                Text(alertMessage)
            }
        }
    }
}

// MARK: - Detail View (for navigation testing)

struct DetailView: View {
    let title: String

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 80))
                .foregroundStyle(.green)
                .accessibilityLabel("Success Icon")

            Text("Detail View")
                .font(.largeTitle)
                .fontWeight(.bold)
                .accessibilityIdentifier("detailTitle")

            Text("You navigated here successfully!")
                .font(.body)
                .foregroundStyle(.secondary)

            Text("Use the back button or swipe from the left edge to go back.")
                .font(.callout)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            GroupBox {
                VStack(alignment: .leading, spacing: 8) {
                    Label("Title: \(title)", systemImage: "doc.text")
                    Label("Timestamp: \(Date().formatted())", systemImage: "clock")
                    Label("View Depth: 1", systemImage: "arrow.down.right")
                }
            }
            .padding()
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .accessibilityLabel("Detail View Screen")
    }
}

// MARK: - Scrollable List View

struct ScrollableListView: View {
    var body: some View {
        List(1...50, id: \.self) { i in
            HStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color(hue: Double(i) / 50.0, saturation: 0.6, brightness: 0.85))
                    .frame(width: 44, height: 44)
                    .overlay {
                        Text("\(i)")
                            .font(.headline)
                            .foregroundStyle(.white)
                    }

                VStack(alignment: .leading) {
                    Text("Item \(i)")
                        .font(.headline)
                    Text("Scrollable list item for testing swipe gestures")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.vertical, 2)
            .accessibilityLabel("Scrollable Item \(i)")
            .accessibilityIdentifier("scrollItem\(i)")
        }
        .navigationTitle("Scrollable List")
        .accessibilityLabel("Scrollable List Screen")
    }
}

// MARK: - Deep Navigation View

struct DeepNavigationView: View {
    let depth: Int
    let maxDepth = 3

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "arrow.triangle.branch")
                .font(.system(size: 60))
                .foregroundStyle(.orange)

            Text("Navigation Level \(depth)")
                .font(.largeTitle)
                .fontWeight(.bold)
                .accessibilityIdentifier("depthLabel\(depth)")

            ProgressView(value: Double(depth), total: Double(maxDepth))
                .scaleEffect(x: 1, y: 2, anchor: .center)
                .padding(.horizontal, 40)
                .tint(.orange)

            Text("Depth \(depth) of \(maxDepth)")
                .foregroundStyle(.secondary)

            if depth < maxDepth {
                NavigationLink(destination: DeepNavigationView(depth: depth + 1)) {
                    Label("Go Deeper (Level \(depth + 1))", systemImage: "arrow.right.circle.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)
                .padding(.horizontal, 40)
                .accessibilityLabel("Go to Level \(depth + 1)")
                .accessibilityIdentifier("goDeeper\(depth)")
            } else {
                VStack(spacing: 12) {
                    Image(systemName: "flag.checkered")
                        .font(.system(size: 40))
                        .foregroundStyle(.green)
                    Text("Maximum depth reached!")
                        .font(.headline)
                        .foregroundStyle(.green)
                    Text("Navigate back using the back button or edge swipe")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .accessibilityLabel("Maximum Depth Reached")
            }

            Spacer()
        }
        .padding()
        .navigationTitle("Level \(depth)")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Location Tab

struct LocationTab: View {
    @StateObject private var locationManager = LocationViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Current Location Display
                    GroupBox {
                        VStack(spacing: 16) {
                            Image(systemName: locationManager.isAuthorized ? "location.fill" : "location.slash.fill")
                                .font(.system(size: 60))
                                .foregroundStyle(locationManager.isAuthorized ? .blue : .red)
                                .accessibilityLabel(locationManager.isAuthorized ? "Location Authorized" : "Location Not Authorized")

                            if let location = locationManager.lastLocation {
                                VStack(spacing: 8) {
                                    HStack {
                                        Text("Latitude:")
                                            .fontWeight(.semibold)
                                        Spacer()
                                        Text(String(format: "%.6f", location.coordinate.latitude))
                                            .font(.system(.body, design: .monospaced))
                                            .accessibilityIdentifier("latitudeValue")
                                    }
                                    HStack {
                                        Text("Longitude:")
                                            .fontWeight(.semibold)
                                        Spacer()
                                        Text(String(format: "%.6f", location.coordinate.longitude))
                                            .font(.system(.body, design: .monospaced))
                                            .accessibilityIdentifier("longitudeValue")
                                    }
                                    HStack {
                                        Text("Altitude:")
                                            .fontWeight(.semibold)
                                        Spacer()
                                        Text(String(format: "%.1f m", location.altitude))
                                            .font(.system(.body, design: .monospaced))
                                    }
                                    HStack {
                                        Text("Accuracy:")
                                            .fontWeight(.semibold)
                                        Spacer()
                                        Text(String(format: "%.1f m", location.horizontalAccuracy))
                                            .font(.system(.body, design: .monospaced))
                                    }
                                    HStack {
                                        Text("Speed:")
                                            .fontWeight(.semibold)
                                        Spacer()
                                        Text(String(format: "%.1f m/s", max(0, location.speed)))
                                            .font(.system(.body, design: .monospaced))
                                    }
                                    HStack {
                                        Text("Updated:")
                                            .fontWeight(.semibold)
                                        Spacer()
                                        Text(location.timestamp.formatted(date: .omitted, time: .standard))
                                            .font(.system(.body, design: .monospaced))
                                    }
                                }
                            } else {
                                Text(locationManager.statusMessage)
                                    .foregroundStyle(.secondary)
                                    .multilineTextAlignment(.center)
                                    .accessibilityIdentifier("locationStatus")
                            }
                        }
                    } label: {
                        Label("Current Location", systemImage: "mappin.and.ellipse")
                            .font(.headline)
                    }
                    .accessibilityLabel("Current Location Section")

                    // Location Controls
                    GroupBox {
                        VStack(spacing: 12) {
                            Button(action: {
                                locationManager.requestLocation()
                            }) {
                                Label("Request Location Update", systemImage: "location.magnifyingglass")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .accessibilityLabel("Request Location Button")
                            .accessibilityIdentifier("requestLocationButton")

                            Button(action: {
                                locationManager.startUpdating()
                            }) {
                                Label("Start Continuous Updates", systemImage: "location.circle.fill")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.bordered)
                            .tint(.green)
                            .accessibilityLabel("Start Location Updates Button")
                            .accessibilityIdentifier("startLocationButton")

                            Button(action: {
                                locationManager.stopUpdating()
                            }) {
                                Label("Stop Updates", systemImage: "location.slash")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.bordered)
                            .tint(.red)
                            .accessibilityLabel("Stop Location Updates Button")
                            .accessibilityIdentifier("stopLocationButton")
                        }
                    } label: {
                        Label("Controls", systemImage: "gearshape")
                            .font(.headline)
                    }

                    // Location History
                    if !locationManager.locationHistory.isEmpty {
                        GroupBox {
                            VStack(spacing: 8) {
                                ForEach(locationManager.locationHistory.suffix(5).reversed(), id: \.timestamp) { loc in
                                    HStack {
                                        VStack(alignment: .leading) {
                                            Text(String(format: "%.4f, %.4f", loc.coordinate.latitude, loc.coordinate.longitude))
                                                .font(.system(.caption, design: .monospaced))
                                            Text(loc.timestamp.formatted(date: .omitted, time: .standard))
                                                .font(.caption2)
                                                .foregroundStyle(.tertiary)
                                        }
                                        Spacer()
                                        Image(systemName: "mappin")
                                            .foregroundStyle(.red)
                                    }
                                }
                            }
                        } label: {
                            Label("Recent Locations (\(locationManager.locationHistory.count))", systemImage: "clock.arrow.circlepath")
                                .font(.headline)
                        }
                    }

                    // Instructions
                    GroupBox {
                        Text("Use simulator_set_location to change the GPS coordinates and see them update here in real time.")
                            .font(.callout)
                            .foregroundStyle(.secondary)
                    } label: {
                        Label("Testing Tip", systemImage: "lightbulb.fill")
                            .font(.headline)
                            .foregroundStyle(.yellow)
                    }
                }
                .padding()
            }
            .navigationTitle("Location")
        }
    }
}

class LocationViewModel: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()

    @Published var lastLocation: CLLocation?
    @Published var isAuthorized = false
    @Published var statusMessage = "Tap 'Request Location' to begin"
    @Published var locationHistory: [CLLocation] = []

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        checkAuthorization()
    }

    func requestLocation() {
        manager.requestWhenInUseAuthorization()
        manager.requestLocation()
        statusMessage = "Requesting location..."
    }

    func startUpdating() {
        manager.requestWhenInUseAuthorization()
        manager.startUpdatingLocation()
        statusMessage = "Updating continuously..."
    }

    func stopUpdating() {
        manager.stopUpdatingLocation()
        statusMessage = "Updates stopped"
    }

    private func checkAuthorization() {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            isAuthorized = true
        default:
            isAuthorized = false
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        lastLocation = location
        locationHistory.append(location)
        isAuthorized = true
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        statusMessage = "Error: \(error.localizedDescription)"
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        checkAuthorization()
    }
}

// MARK: - Notifications Tab

struct NotificationsTab: View {
    @State private var notifications: [NotificationItem] = []
    @State private var permissionStatus = "Unknown"

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Permission Status
                    GroupBox {
                        VStack(spacing: 12) {
                            Image(systemName: permissionStatus == "Authorized" ? "bell.badge.fill" : "bell.slash.fill")
                                .font(.system(size: 50))
                                .foregroundStyle(permissionStatus == "Authorized" ? .green : .orange)

                            Text("Permission: \(permissionStatus)")
                                .font(.headline)
                                .accessibilityIdentifier("notificationPermission")

                            Button(action: checkPermission) {
                                Label("Check Permission", systemImage: "arrow.clockwise")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.bordered)
                            .accessibilityLabel("Check Notification Permission")
                            .accessibilityIdentifier("checkPermissionButton")

                            Button(action: sendLocalNotification) {
                                Label("Send Local Notification", systemImage: "bell.fill")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .accessibilityLabel("Send Local Notification Button")
                            .accessibilityIdentifier("sendLocalNotifButton")
                        }
                    } label: {
                        Label("Push Notifications", systemImage: "bell.badge")
                            .font(.headline)
                    }

                    // Received Notifications
                    GroupBox {
                        if notifications.isEmpty {
                            VStack(spacing: 8) {
                                Image(systemName: "tray")
                                    .font(.system(size: 40))
                                    .foregroundStyle(.tertiary)
                                Text("No notifications received yet")
                                    .foregroundStyle(.secondary)
                                Text("Use simulator_send_push to send a test notification")
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 20)
                        } else {
                            VStack(spacing: 12) {
                                ForEach(notifications.reversed()) { notif in
                                    VStack(alignment: .leading, spacing: 4) {
                                        HStack {
                                            Image(systemName: "bell.fill")
                                                .foregroundStyle(.blue)
                                            Text(notif.title)
                                                .fontWeight(.semibold)
                                            Spacer()
                                            Text(notif.date.formatted(date: .omitted, time: .shortened))
                                                .font(.caption)
                                                .foregroundStyle(.tertiary)
                                        }
                                        Text(notif.body)
                                            .font(.callout)
                                            .foregroundStyle(.secondary)
                                        if !notif.userInfo.isEmpty {
                                            Text("Data: \(notif.userInfo.description)")
                                                .font(.caption)
                                                .foregroundStyle(.tertiary)
                                        }
                                    }
                                    .padding(10)
                                    .background(Color(.systemGray6))
                                    .cornerRadius(10)
                                    .accessibilityLabel("Notification: \(notif.title)")
                                }
                            }
                        }
                    } label: {
                        Label("Received (\(notifications.count))", systemImage: "tray.full.fill")
                            .font(.headline)
                    }
                    .accessibilityIdentifier("receivedNotificationsSection")

                    // Instructions
                    GroupBox {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Test push notifications with:")
                                .font(.callout)
                                .fontWeight(.semibold)
                            Text("simulator_send_push with payload:")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text("""
                            {
                              "aps": {
                                "alert": {
                                  "title": "Hello",
                                  "body": "Test message"
                                },
                                "sound": "default"
                              }
                            }
                            """)
                            .font(.system(.caption, design: .monospaced))
                            .padding(8)
                            .background(Color(.systemGray6))
                            .cornerRadius(8)
                        }
                    } label: {
                        Label("Testing Tip", systemImage: "lightbulb.fill")
                            .font(.headline)
                            .foregroundStyle(.yellow)
                    }
                }
                .padding()
            }
            .navigationTitle("Notifications")
            .onAppear {
                checkPermission()
                setupNotificationListener()
            }
        }
    }

    private func checkPermission() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                switch settings.authorizationStatus {
                case .authorized: permissionStatus = "Authorized"
                case .denied: permissionStatus = "Denied"
                case .notDetermined: permissionStatus = "Not Determined"
                case .provisional: permissionStatus = "Provisional"
                case .ephemeral: permissionStatus = "Ephemeral"
                @unknown default: permissionStatus = "Unknown"
                }
            }
        }
    }

    private func sendLocalNotification() {
        let content = UNMutableNotificationContent()
        content.title = "Local Test"
        content.body = "This is a local notification from MCPDemo"
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger)

        UNUserNotificationCenter.current().add(request)
    }

    private func setupNotificationListener() {
        // Load any already-received notifications
        if let delegate = AppDelegate.shared {
            notifications = delegate.receivedNotifications
            delegate.onNotification = { item in
                DispatchQueue.main.async {
                    notifications.append(item)
                }
            }
        }
    }
}

// MARK: - Settings Tab

struct SettingsTab: View {
    @State private var clipboardContent = ""
    @State private var accessibilityToggle = true
    @State private var darkModeToggle = false
    @State private var fontSize: Double = 16
    @State private var username = ""
    @State private var fileContent = ""
    @State private var documentsFiles: [String] = []
    @State private var userDefaultsInfo = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Clipboard Section
                    GroupBox {
                        VStack(spacing: 12) {
                            HStack {
                                Image(systemName: "doc.on.clipboard")
                                    .foregroundStyle(.blue)
                                Text("Clipboard Content:")
                                    .fontWeight(.semibold)
                                Spacer()
                            }

                            Text(clipboardContent.isEmpty ? "(empty)" : clipboardContent)
                                .font(.system(.body, design: .monospaced))
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(10)
                                .background(Color(.systemGray6))
                                .cornerRadius(8)
                                .accessibilityLabel("Clipboard Content")
                                .accessibilityIdentifier("clipboardContent")

                            HStack {
                                Button(action: readClipboard) {
                                    Label("Read Clipboard", systemImage: "arrow.down.doc")
                                        .frame(maxWidth: .infinity)
                                }
                                .buttonStyle(.bordered)
                                .accessibilityLabel("Read Clipboard Button")
                                .accessibilityIdentifier("readClipboardButton")

                                Button(action: {
                                    UIPasteboard.general.string = "MCPDemo clipboard test"
                                }) {
                                    Label("Write to Clipboard", systemImage: "arrow.up.doc")
                                        .frame(maxWidth: .infinity)
                                }
                                .buttonStyle(.bordered)
                                .tint(.green)
                                .accessibilityLabel("Write Clipboard Button")
                                .accessibilityIdentifier("writeClipboardButton")
                            }
                        }
                    } label: {
                        Label("Clipboard", systemImage: "clipboard")
                            .font(.headline)
                    }

                    // Accessibility Settings
                    GroupBox {
                        VStack(spacing: 12) {
                            Toggle(isOn: $accessibilityToggle) {
                                Label("VoiceOver Friendly", systemImage: "accessibility")
                            }
                            .accessibilityLabel("VoiceOver Toggle")
                            .accessibilityIdentifier("voiceOverToggle")

                            Toggle(isOn: $darkModeToggle) {
                                Label("Dark Mode Preference", systemImage: "moon.fill")
                            }
                            .accessibilityLabel("Dark Mode Toggle")
                            .accessibilityIdentifier("darkModeToggle")

                            VStack(alignment: .leading) {
                                Text("Font Size: \(Int(fontSize))pt")
                                Slider(value: $fontSize, in: 12...32, step: 1)
                                    .accessibilityLabel("Font Size Slider")
                                    .accessibilityIdentifier("fontSizeSlider")
                            }

                            TextField("Username", text: $username)
                                .textFieldStyle(.roundedBorder)
                                .accessibilityLabel("Username Field")
                                .accessibilityIdentifier("usernameField")
                        }
                    } label: {
                        Label("Accessibility & Preferences", systemImage: "accessibility.fill")
                            .font(.headline)
                    }

                    // File System Section
                    GroupBox {
                        VStack(spacing: 12) {
                            Button(action: writeTestFile) {
                                Label("Write Test File to Documents/", systemImage: "doc.badge.plus")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.purple)
                            .accessibilityLabel("Write Test File Button")
                            .accessibilityIdentifier("writeFileButton")

                            Button(action: listDocumentsFiles) {
                                Label("List Documents/ Files", systemImage: "folder")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.bordered)
                            .accessibilityLabel("List Files Button")
                            .accessibilityIdentifier("listFilesButton")

                            if !documentsFiles.isEmpty {
                                VStack(alignment: .leading, spacing: 4) {
                                    ForEach(documentsFiles, id: \.self) { file in
                                        HStack {
                                            Image(systemName: "doc.fill")
                                                .foregroundStyle(.blue)
                                                .font(.caption)
                                            Text(file)
                                                .font(.system(.caption, design: .monospaced))
                                        }
                                    }
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(10)
                                .background(Color(.systemGray6))
                                .cornerRadius(8)
                                .accessibilityIdentifier("filesList")
                            }

                            if !fileContent.isEmpty {
                                Text(fileContent)
                                    .font(.system(.caption, design: .monospaced))
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(10)
                                    .background(Color(.systemGray6))
                                    .cornerRadius(8)
                                    .accessibilityIdentifier("fileContentDisplay")
                            }
                        }
                    } label: {
                        Label("File System", systemImage: "internaldrive")
                            .font(.headline)
                    }

                    // UserDefaults Section
                    GroupBox {
                        VStack(spacing: 12) {
                            Button(action: readUserDefaults) {
                                Label("Read UserDefaults", systemImage: "square.and.arrow.down")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.bordered)
                            .accessibilityLabel("Read UserDefaults Button")
                            .accessibilityIdentifier("readDefaultsButton")

                            if !userDefaultsInfo.isEmpty {
                                Text(userDefaultsInfo)
                                    .font(.system(.caption, design: .monospaced))
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(10)
                                    .background(Color(.systemGray6))
                                    .cornerRadius(8)
                                    .accessibilityIdentifier("userDefaultsDisplay")
                            }
                        }
                    } label: {
                        Label("UserDefaults", systemImage: "tray.2.fill")
                            .font(.headline)
                    }

                    // App Info Section
                    GroupBox {
                        VStack(alignment: .leading, spacing: 8) {
                            infoRow("Bundle ID", value: Bundle.main.bundleIdentifier ?? "N/A")
                            infoRow("Version", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")
                            infoRow("Build", value: Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1")
                            infoRow("Device", value: UIDevice.current.name)
                            infoRow("iOS", value: UIDevice.current.systemVersion)
                            infoRow("Model", value: UIDevice.current.model)
                        }
                    } label: {
                        Label("App Info", systemImage: "info.circle.fill")
                            .font(.headline)
                    }
                    .accessibilityIdentifier("appInfoSection")
                }
                .padding()
            }
            .navigationTitle("Settings")
            .onAppear {
                readClipboard()
                listDocumentsFiles()
            }
        }
    }

    private func infoRow(_ label: String, value: String) -> some View {
        HStack {
            Text(label)
                .fontWeight(.semibold)
                .foregroundStyle(.primary)
            Spacer()
            Text(value)
                .font(.system(.body, design: .monospaced))
                .foregroundStyle(.secondary)
        }
    }

    private func readClipboard() {
        clipboardContent = UIPasteboard.general.string ?? ""
    }

    private func writeTestFile() {
        guard let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return }
        let file = docs.appendingPathComponent("settings_test_\(Int(Date().timeIntervalSince1970)).txt")
        let content = """
        MCP Demo Test File
        Written at: \(Date())
        Username: \(username.isEmpty ? "Not set" : username)
        Font Size: \(Int(fontSize))
        Dark Mode: \(darkModeToggle)
        Accessibility: \(accessibilityToggle)
        """
        try? content.write(to: file, atomically: true, encoding: .utf8)
        fileContent = "File written: \(file.lastPathComponent)"
        listDocumentsFiles()
    }

    private func listDocumentsFiles() {
        guard let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return }
        documentsFiles = (try? FileManager.default.contentsOfDirectory(atPath: docs.path)) ?? []
    }

    private func readUserDefaults() {
        let lastLaunch = UserDefaults.standard.string(forKey: "lastLaunch") ?? "N/A"
        let favNumber = UserDefaults.standard.integer(forKey: "favoriteNumber")
        let hasLaunched = UserDefaults.standard.bool(forKey: "hasLaunched")
        userDefaultsInfo = """
        lastLaunch: \(lastLaunch)
        favoriteNumber: \(favNumber)
        hasLaunched: \(hasLaunched)
        """
    }
}

import UserNotifications

// MARK: - StoreKit Tab

struct StoreKitTab: View {
    @State private var purchaseStatus = "No purchases"
    @State private var subscriptionState = "None"

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Mock Product
                    GroupBox {
                        VStack(spacing: 12) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Premium Upgrade")
                                        .font(.headline)
                                        .accessibilityIdentifier("productName")
                                    Text("Unlock all features")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text("$4.99")
                                    .font(.title3)
                                    .fontWeight(.bold)
                                    .foregroundStyle(.blue)
                                    .accessibilityIdentifier("productPrice")
                            }

                            Button(action: {
                                purchaseStatus = "Purchased"
                            }) {
                                Label("Buy Now", systemImage: "cart.badge.plus")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .accessibilityLabel("Buy Now Button")
                            .accessibilityIdentifier("buyButton")

                            Text("Status: \(purchaseStatus)")
                                .font(.callout)
                                .foregroundStyle(.secondary)
                                .accessibilityIdentifier("purchaseStatus")
                        }
                    } label: {
                        Label("In-App Purchase", systemImage: "creditcard.fill")
                            .font(.headline)
                    }

                    // Subscription
                    GroupBox {
                        VStack(spacing: 12) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Monthly Pro")
                                        .font(.headline)
                                        .accessibilityIdentifier("subscriptionName")
                                    Text("$9.99/month")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(subscriptionState)
                                    .font(.callout)
                                    .fontWeight(.semibold)
                                    .foregroundStyle(subscriptionState == "Active" ? .green : .orange)
                                    .accessibilityIdentifier("subscriptionStatus")
                            }

                            HStack(spacing: 12) {
                                Button("Subscribe") {
                                    subscriptionState = "Active"
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(.green)
                                .accessibilityIdentifier("subscribeButton")

                                Button("Expire") {
                                    subscriptionState = "Expired"
                                }
                                .buttonStyle(.bordered)
                                .tint(.red)
                                .accessibilityIdentifier("expireButton")
                            }
                        }
                    } label: {
                        Label("Subscription", systemImage: "arrow.triangle.2.circlepath")
                            .font(.headline)
                    }

                    // Testing Tip
                    GroupBox {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Test StoreKit with these MCP tools:")
                                .font(.callout)
                                .fontWeight(.semibold)
                            Text("• simulator_storekit_config — enable/disable testing")
                                .font(.caption)
                            Text("• simulator_storekit_transactions — list transactions")
                                .font(.caption)
                            Text("• simulator_storekit_manage_subscription — expire/renew")
                                .font(.caption)
                            Text("• simulator_storekit_reset_eligibility — reset offers")
                                .font(.caption)
                        }
                        .foregroundStyle(.secondary)
                    } label: {
                        Label("Testing Tip", systemImage: "lightbulb.fill")
                            .font(.headline)
                            .foregroundStyle(.yellow)
                    }
                }
                .padding()
            }
            .navigationTitle("StoreKit")
        }
    }
}

// MARK: - Network Tab

struct NetworkTab: View {
    @StateObject private var networkMonitor = NetworkMonitorViewModel()
    @State private var requestResult = ""
    @State private var requestLatency = ""
    @State private var isLoading = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Connection Status
                    GroupBox {
                        VStack(spacing: 12) {
                            Image(systemName: networkMonitor.isConnected ? "wifi" : "wifi.slash")
                                .font(.system(size: 50))
                                .foregroundStyle(networkMonitor.isConnected ? .green : .red)
                                .accessibilityIdentifier("networkIcon")

                            Text(networkMonitor.isConnected ? "Connected" : "Disconnected")
                                .font(.title2)
                                .fontWeight(.semibold)
                                .accessibilityIdentifier("connectionStatus")

                            Text("Type: \(networkMonitor.connectionType)")
                                .font(.callout)
                                .foregroundStyle(.secondary)
                                .accessibilityIdentifier("connectionType")
                        }
                    } label: {
                        Label("Connection Status", systemImage: "antenna.radiowaves.left.and.right")
                            .font(.headline)
                    }

                    // Network Request Test
                    GroupBox {
                        VStack(spacing: 12) {
                            Button(action: performNetworkRequest) {
                                if isLoading {
                                    ProgressView()
                                        .frame(maxWidth: .infinity)
                                } else {
                                    Label("Fetch apple.com", systemImage: "arrow.down.circle.fill")
                                        .frame(maxWidth: .infinity)
                                }
                            }
                            .buttonStyle(.borderedProminent)
                            .disabled(isLoading)
                            .accessibilityLabel("Fetch Button")
                            .accessibilityIdentifier("fetchButton")

                            if !requestLatency.isEmpty {
                                HStack {
                                    Text("Latency:")
                                        .fontWeight(.semibold)
                                    Spacer()
                                    Text(requestLatency)
                                        .font(.system(.body, design: .monospaced))
                                        .accessibilityIdentifier("latencyValue")
                                }
                            }

                            if !requestResult.isEmpty {
                                Text(requestResult)
                                    .font(.system(.caption, design: .monospaced))
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(10)
                                    .background(Color(.systemGray6))
                                    .cornerRadius(8)
                                    .accessibilityIdentifier("requestResult")
                            }
                        }
                    } label: {
                        Label("Network Request", systemImage: "arrow.up.arrow.down.circle")
                            .font(.headline)
                    }

                    // Testing Tip
                    GroupBox {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Test network conditions with:")
                                .font(.callout)
                                .fontWeight(.semibold)
                            Text("• simulator_network_condition preset=\"3G\"")
                                .font(.caption)
                            Text("• simulator_network_condition preset=\"100%-loss\"")
                                .font(.caption)
                            Text("• simulator_network_condition action=\"clear\"")
                                .font(.caption)
                            Text("• simulator_network_capture — view connections")
                                .font(.caption)
                        }
                        .foregroundStyle(.secondary)
                    } label: {
                        Label("Testing Tip", systemImage: "lightbulb.fill")
                            .font(.headline)
                            .foregroundStyle(.yellow)
                    }
                }
                .padding()
            }
            .navigationTitle("Network")
        }
    }

    private func performNetworkRequest() {
        isLoading = true
        requestResult = ""
        requestLatency = ""
        let start = Date()

        let url = URL(string: "https://www.apple.com")!
        URLSession.shared.dataTask(with: url) { data, response, error in
            let elapsed = Date().timeIntervalSince(start)
            DispatchQueue.main.async {
                isLoading = false
                requestLatency = String(format: "%.0f ms", elapsed * 1000)
                if let error = error {
                    requestResult = "Error: \(error.localizedDescription)"
                } else if let httpResponse = response as? HTTPURLResponse {
                    requestResult = "Status: \(httpResponse.statusCode) — \(data?.count ?? 0) bytes"
                }
            }
        }.resume()
    }
}

class NetworkMonitorViewModel: ObservableObject {
    private let monitor = NWPathMonitor()
    @Published var isConnected = true
    @Published var connectionType = "Unknown"

    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isConnected = path.status == .satisfied
                if path.usesInterfaceType(.wifi) {
                    self?.connectionType = "WiFi"
                } else if path.usesInterfaceType(.cellular) {
                    self?.connectionType = "Cellular"
                } else if path.usesInterfaceType(.wiredEthernet) {
                    self?.connectionType = "Ethernet"
                } else {
                    self?.connectionType = path.status == .satisfied ? "Other" : "None"
                }
            }
        }
        monitor.start(queue: DispatchQueue.global(qos: .background))
    }

    deinit {
        monitor.cancel()
    }
}

// MARK: - Debug Tab

struct DebugTab: View {
    @State private var memoryAllocated = false
    @State private var memoryChunks: [[UInt8]] = []
    @State private var cpuRunning = false
    @State private var thermalState = "Nominal"
    @State private var biometricResult = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Memory Stress
                    GroupBox {
                        VStack(spacing: 12) {
                            HStack {
                                Text("Allocated: \(memoryChunks.count) MB")
                                    .font(.system(.body, design: .monospaced))
                                    .accessibilityIdentifier("memoryAllocated")
                                Spacer()
                            }

                            HStack(spacing: 12) {
                                Button("Allocate 10 MB") {
                                    for _ in 0..<10 {
                                        memoryChunks.append([UInt8](repeating: 1, count: 1024 * 1024))
                                    }
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(.orange)
                                .accessibilityIdentifier("allocateButton")

                                Button("Free All") {
                                    memoryChunks.removeAll()
                                }
                                .buttonStyle(.bordered)
                                .tint(.red)
                                .accessibilityIdentifier("freeMemoryButton")
                            }
                        }
                    } label: {
                        Label("Memory Stress", systemImage: "memorychip")
                            .font(.headline)
                    }

                    // CPU Stress
                    GroupBox {
                        VStack(spacing: 12) {
                            Text(cpuRunning ? "CPU busy..." : "CPU idle")
                                .font(.system(.body, design: .monospaced))
                                .accessibilityIdentifier("cpuStatus")

                            Button(cpuRunning ? "Running..." : "Run CPU Loop (3s)") {
                                guard !cpuRunning else { return }
                                cpuRunning = true
                                DispatchQueue.global(qos: .userInitiated).async {
                                    let end = Date().addingTimeInterval(3)
                                    var x: Double = 0
                                    while Date() < end {
                                        x += sin(Double.random(in: 0...1000))
                                    }
                                    _ = x
                                    DispatchQueue.main.async { cpuRunning = false }
                                }
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.purple)
                            .disabled(cpuRunning)
                            .accessibilityIdentifier("cpuStressButton")
                        }
                    } label: {
                        Label("CPU Stress", systemImage: "cpu")
                            .font(.headline)
                    }

                    // Thermal State
                    GroupBox {
                        VStack(spacing: 8) {
                            HStack {
                                Text("Thermal State:")
                                    .fontWeight(.semibold)
                                Spacer()
                                Text(thermalState)
                                    .font(.system(.body, design: .monospaced))
                                    .foregroundStyle(thermalState == "Nominal" ? .green : .orange)
                                    .accessibilityIdentifier("thermalState")
                            }

                            Button("Refresh") {
                                updateThermalState()
                            }
                            .buttonStyle(.bordered)
                            .accessibilityIdentifier("refreshThermalButton")
                        }
                    } label: {
                        Label("Thermal State", systemImage: "thermometer.medium")
                            .font(.headline)
                    }

                    // Accessibility Settings Observer
                    GroupBox {
                        VStack(alignment: .leading, spacing: 8) {
                            accessibilityRow("Reduce Motion", value: UIAccessibility.isReduceMotionEnabled, id: "reduceMotion")
                            accessibilityRow("Bold Text", value: UIAccessibility.isBoldTextEnabled, id: "boldText")
                            accessibilityRow("Reduce Transparency", value: UIAccessibility.isReduceTransparencyEnabled, id: "reduceTransparency")
                            accessibilityRow("Invert Colors", value: UIAccessibility.isInvertColorsEnabled, id: "invertColors")
                            accessibilityRow("Increase Contrast", value: UIAccessibility.isDarkerSystemColorsEnabled, id: "increaseContrast")
                        }
                    } label: {
                        Label("Accessibility Settings", systemImage: "accessibility")
                            .font(.headline)
                    }
                    .accessibilityIdentifier("accessibilitySection")

                    // Biometric Auth
                    GroupBox {
                        VStack(spacing: 12) {
                            Button(action: authenticateBiometric) {
                                Label("Authenticate with Face ID", systemImage: "faceid")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.indigo)
                            .accessibilityLabel("Authenticate Biometric Button")
                            .accessibilityIdentifier("biometricButton")

                            if !biometricResult.isEmpty {
                                Text(biometricResult)
                                    .font(.callout)
                                    .foregroundStyle(biometricResult.contains("Success") ? .green : .red)
                                    .accessibilityIdentifier("biometricResult")
                            }
                        }
                    } label: {
                        Label("Biometric Auth", systemImage: "lock.shield.fill")
                            .font(.headline)
                    }

                    // Testing Tip
                    GroupBox {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Debug tools available:")
                                .font(.callout)
                                .fontWeight(.semibold)
                            Text("• simulator_leak_check — detect memory leaks")
                                .font(.caption)
                            Text("• simulator_heap_info — heap allocation summary")
                                .font(.caption)
                            Text("• simulator_sample_process — CPU hotspot sampling")
                                .font(.caption)
                            Text("• simulator_thermal_state — simulate thermal pressure")
                                .font(.caption)
                            Text("• simulator_biometric — match/fail Face ID")
                                .font(.caption)
                            Text("• simulator_set_reduce_motion — toggle accessibility")
                                .font(.caption)
                        }
                        .foregroundStyle(.secondary)
                    } label: {
                        Label("Testing Tip", systemImage: "lightbulb.fill")
                            .font(.headline)
                            .foregroundStyle(.yellow)
                    }
                }
                .padding()
            }
            .navigationTitle("Debug")
            .onAppear { updateThermalState() }
        }
    }

    private func accessibilityRow(_ label: String, value: Bool, id: String) -> some View {
        HStack {
            Text(label)
                .fontWeight(.semibold)
            Spacer()
            Text(value ? "ON" : "OFF")
                .font(.system(.body, design: .monospaced))
                .foregroundStyle(value ? .green : .secondary)
                .accessibilityIdentifier(id + "Value")
        }
    }

    private func updateThermalState() {
        switch ProcessInfo.processInfo.thermalState {
        case .nominal: thermalState = "Nominal"
        case .fair: thermalState = "Fair"
        case .serious: thermalState = "Serious"
        case .critical: thermalState = "Critical"
        @unknown default: thermalState = "Unknown"
        }
    }

    private func authenticateBiometric() {
        let context = LAContext()
        var error: NSError?
        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "Authenticate to test biometrics") { success, error in
                DispatchQueue.main.async {
                    if success {
                        biometricResult = "Success — Authenticated!"
                    } else {
                        biometricResult = "Failed: \(error?.localizedDescription ?? "unknown error")"
                    }
                }
            }
        } else {
            biometricResult = "Biometrics unavailable: \(error?.localizedDescription ?? "not enrolled")"
        }
    }
}

// MARK: - Preview

#Preview {
    ContentView()
}

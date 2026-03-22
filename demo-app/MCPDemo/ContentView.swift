import SwiftUI
import CoreLocation

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

// MARK: - Preview

#Preview {
    ContentView()
}

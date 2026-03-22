# iOS Simulator MCP Server

The most comprehensive MCP (Model Context Protocol) server for iOS Simulator automation. Gives AI agents like Claude full control over iOS Simulators — tap, swipe, type, read accessibility trees, inspect app data, capture screenshots, record video, manage devices, and debug apps in real time.

**37 tools** across 9 categories. Zero cursor interference — works silently in the background while you use your Mac.

## Why This Server?

| Feature | This Server | [ios-simulator-mcp](https://github.com/joshuayoes/ios-simulator-mcp) |
|---------|-------------|------|
| **Total tools** | **37** | 13 |
| **Touch injection** | idb (IndigoHID) — cursor-free | idb |
| **Accessibility tree** | Real iOS elements via idb | idb |
| **Device logs** | Filter by process, level, time | None |
| **Live log streaming** | Start/read/stop with buffer | None |
| **Crash reports** | Stack traces, thread states | None |
| **App file access** | Read plists, SQLite, Documents/ | None |
| **App container paths** | Bundle, data, shared groups | None |
| **Permission management** | Grant/revoke camera, location, etc. | None |
| **GPS simulation** | Set lat/lng coordinates | None |
| **Push notifications** | Send APNs payloads to any app | None |
| **Clipboard read/write** | Get and set pasteboard text | None |
| **Dark mode toggle** | Light/dark appearance | None |
| **Status bar override** | Time, battery, signal, carrier | None |
| **Video recording** | H.264/HEVC with start/stop | H.264/HEVC |
| **Long press** | Configurable duration | Via tap duration |
| **Key press** | Special keys + modifiers (Cmd+[, etc.) | None |
| **Navigate back** | Convenience tool for back nav | None |
| **Media import** | Add photos/videos to camera roll | None |
| **Device management** | Boot, shutdown, erase, list | Partial |
| **App management** | Install, launch, terminate, uninstall, list, info | Install, launch |
| **Screenshot format** | JPEG compressed (~300KB) | JPEG compressed |
| **CGEvent fallback** | Works without idb installed | Requires idb |
| **Diagnostics** | Xcode version, disk usage, device info | None |

## Quick Start

### Prerequisites

- macOS with Xcode and iOS Simulator installed
- Node.js 18+
- [Facebook idb](https://fbidb.io/) (recommended for cursor-free operation)

### Install idb (recommended)

```bash
brew tap facebook/fb
brew install idb-companion
pip3 install fb-idb
```

> Without idb, the server falls back to CGEvent mouse injection (works but briefly moves your cursor).

### Add to Claude Code

```bash
# Option 1: Add via CLI
claude mcp add ios-simulator node /path/to/ios-simulator-mcp/dist/index.js

# Option 2: Add .mcp.json to your project root
```

**.mcp.json:**
```json
{
  "mcpServers": {
    "ios-simulator": {
      "command": "node",
      "args": ["/path/to/ios-simulator-mcp/dist/index.js"],
      "env": {
        "LOG_LEVEL": "info",
        "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

> Add your Python bin directory to `PATH` if idb was installed via pip (e.g., `~/Library/Python/3.x/bin`).

### Add to Cursor

**~/.cursor/mcp.json:**
```json
{
  "mcpServers": {
    "ios-simulator": {
      "command": "node",
      "args": ["/path/to/ios-simulator-mcp/dist/index.js"]
    }
  }
}
```

### Build from Source

```bash
git clone https://github.com/YOUR_USERNAME/ios-simulator-mcp.git
cd ios-simulator-mcp
npm install
npm run build
```

## Tools Reference

### Observation (6 tools)

| Tool | Description |
|------|-------------|
| `simulator_screenshot` | Take a JPEG screenshot (~300KB). Auto-saved to `~/Desktop/SimulatorScreenshots/`. |
| `simulator_list_devices` | List simulators with name, UDID, state, runtime. Filter: `booted`, `available`, `all`. |
| `simulator_list_apps` | List installed apps with bundle IDs. Toggle `includeSystem` for system apps. |
| `simulator_app_info` | Get app metadata: name, version, bundle path, data path, type. |
| `simulator_get_clipboard` | Read the simulator's clipboard text. |
| `simulator_get_screen_info` | Window geometry, coordinate mapping, scale factor. Debug tap accuracy. |

### User Interaction (6 tools)

| Tool | Description |
|------|-------------|
| `simulator_tap` | Tap at (x, y) in simulator screen points. Cursor-free via idb. |
| `simulator_swipe` | Swipe between two points. Supports edge-swipe-back from x=1. |
| `simulator_long_press` | Long press with configurable duration. Context menus, drag initiation. |
| `simulator_type_text` | Type text into the focused field. |
| `simulator_press_key` | Press special keys (return, escape, arrows, F-keys) with modifiers. |
| `simulator_navigate_back` | Navigate back via Cmd+[. Workaround for edge-swipe limitations. |

### Device Management (4 tools)

| Tool | Description |
|------|-------------|
| `simulator_boot` | Boot a device by name or UDID. Optional `waitForBoot` polling. |
| `simulator_shutdown` | Shut down a running simulator. |
| `simulator_erase` | Factory reset — erases all content and settings. |
| `simulator_open_url` | Open URLs or deep links (e.g., `myapp://screen`). |

### App Management (4 tools)

| Tool | Description |
|------|-------------|
| `simulator_launch_app` | Launch by bundle ID with optional args and env vars. |
| `simulator_terminate_app` | Force-terminate a running app. |
| `simulator_install_app` | Install a .app bundle from a local path. |
| `simulator_uninstall_app` | Uninstall by bundle ID. |

### Debugging & Diagnostics (8 tools)

| Tool | Description |
|------|-------------|
| `simulator_get_logs` | Query device logs. Filter by process, subsystem, level, time range, message content. |
| `simulator_stream_logs` | Live log streaming with start/read/stop lifecycle. Configurable buffer. |
| `simulator_get_app_container` | Get filesystem path to app's bundle, data, or shared group container. |
| `simulator_list_app_files` | Browse an app's Documents/, Library/, Caches/, tmp/ directories. |
| `simulator_read_app_file` | Read plists (→JSON), SQLite (→schema), and text files from app data. |
| `simulator_get_crash_logs` | Retrieve crash reports with stack traces and thread states. |
| `simulator_diagnose` | Xcode version, disk usage, booted devices, system info. |
| `simulator_accessibility_audit` | Full iOS accessibility tree — real UIButton/UILabel elements with labels, frames, roles. |

### System Simulation (5 tools)

| Tool | Description |
|------|-------------|
| `simulator_set_location` | Set GPS coordinates (lat/lng). Test location-based features. |
| `simulator_send_push` | Send push notifications with full APNs payload JSON. |
| `simulator_set_clipboard` | Set the simulator clipboard text. |
| `simulator_add_media` | Add photos/videos to the camera roll from local files. |
| `simulator_grant_permission` | Grant, revoke, or reset permissions (camera, location, photos, contacts, microphone, etc.). |

### UI Configuration (4 tools)

| Tool | Description |
|------|-------------|
| `simulator_set_appearance` | Switch between light and dark mode. |
| `simulator_override_status_bar` | Set time, battery, signal, carrier, network type. |
| `simulator_record_video` | Start screen recording (H.264/HEVC). Saves to `~/Desktop/SimulatorRecordings/`. |
| `simulator_stop_recording` | Stop recording and finalize the video file. |

## Architecture

```
src/
├── index.ts                    # MCP server entry, 37 tool registrations
├── helpers/
│   ├── idb.ts                  # Facebook idb CLI wrapper (cursor-free touch)
│   ├── simctl.ts               # xcrun simctl command wrapper
│   ├── applescript.ts          # Keyboard input + CGEvent fallback
│   ├── coordinate-mapper.ts    # Simulator points → macOS screen coords
│   ├── mouse-events.swift      # Native Swift CGEvent binary (fallback)
│   └── logger.ts               # Structured stderr logging
└── tools/
    ├── screenshot.ts           # JPEG capture with compression
    ├── interaction.ts          # Tap, swipe, long press, type, key
    ├── device.ts               # Boot, shutdown, erase, open URL
    ├── app.ts                  # Install, launch, terminate, list
    ├── system.ts               # Location, push, clipboard, media, permissions
    ├── ui.ts                   # Appearance, status bar, video, navigate back
    └── debug.ts                # Logs, files, crash reports, accessibility
```

### Touch Injection Pipeline

```
simulator_tap(x=200, y=400)
    │
    ├─ idb available? ──YES──► idb ui tap --udid <UDID> 200 400
    │                           (IndigoHID → real iOS touch event)
    │                           (zero cursor movement)
    │
    └─ idb unavailable? ──► coordinate mapper → macOS screen coords
                             → Swift CGEvent binary → mouse down/up
                             → cursor save/restore (CGWarp)
```

### Accessibility Pipeline

```
simulator_accessibility_audit()
    │
    ├─ idb available? ──YES──► idb ui describe-all --udid <UDID>
    │                           Returns: UIButton "Settings" @(306,389) 68x91
    │                                    UILabel "Calendar" @(121,289) ...
    │
    └─ idb unavailable? ──► AppleScript System Events traversal (4 levels)
                             Returns: AXButton, AXGroup, AXToolbar (limited)
```

## Demo App

A SwiftUI demo app is included in `demo-app/` for testing all MCP features:

```bash
cd demo-app
xcodebuild -project MCPDemo.xcodeproj -scheme MCPDemo \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' \
  build
```

The demo app has 4 tabs exercising every tool category:
- **Interactions**: Buttons, text fields, long-press zones, navigation stack, scrollable lists
- **Location**: Live GPS display for testing `simulator_set_location`
- **Notifications**: Push notification display for testing `simulator_send_push`
- **Settings**: Clipboard, file I/O, accessibility toggles, UserDefaults

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `PATH` | System PATH | Must include idb binary location |

### File Locations

| Path | Description |
|------|-------------|
| `~/Desktop/SimulatorScreenshots/` | Auto-saved screenshots (JPEG) |
| `~/Desktop/SimulatorRecordings/` | Video recordings (MP4) |

## Example Prompts

### QA Testing
> "Boot the iPhone 16 Pro simulator, install my app at ./build/MyApp.app, launch it, and take a screenshot of the home screen. Then tap the login button, type test@email.com in the email field, and verify the form validation works."

### Debugging
> "My app is crashing on launch. Check the crash logs for MyApp, then get the last 5 minutes of device logs filtered to the MyApp process. Also read the UserDefaults plist from the app container."

### Accessibility Audit
> "Run an accessibility audit on the current screen. Are all interactive elements properly labeled? Check if the login button has an accessibility label."

### Location Testing
> "Set the simulator location to Tokyo (35.6762, 139.6503), then take a screenshot to verify the map updated. Now set it to London and check again."

### Dark Mode Testing
> "Switch to dark mode, take a screenshot, then switch back to light mode and screenshot again. Compare the two for any contrast issues."

## Troubleshooting

### idb not detected
If tools show `[CGEvent fallback]` instead of `[cursor-free]`:

1. Verify idb is installed: `which idb` or check `~/Library/Python/3.x/bin/idb`
2. Add the idb path to your `.mcp.json` `PATH` env var
3. Restart the MCP server: `pkill -f ios-simulator-mcp`

### Simulator not found
If tools report "No simulator is currently booted":

1. Open Simulator.app: `open -a Simulator`
2. Boot a device: use `simulator_boot` or `xcrun simctl boot "iPhone 16 Pro"`

### Accessibility permission errors
If touch/keyboard tools fail with "not allowed":

1. Go to System Settings → Privacy & Security → Accessibility
2. Add your terminal app (Terminal.app, iTerm, Claude Code, etc.)

### Screenshots are too large
Screenshots default to JPEG at quality 70 (~300KB). If still too large, they auto-compress to quality 40. For PNG, pass `format: "png"`.

## Development

```bash
# Watch mode (TypeScript only)
npm run dev

# Full rebuild (TypeScript + Swift binary)
npm run build

# Run directly
node dist/index.js
```

## License

MIT License — see [LICENSE](LICENSE) for details.

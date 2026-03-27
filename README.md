# Preflight MCP

The most comprehensive MCP (Model Context Protocol) server for iOS Simulator automation. Gives AI agents like Claude, ChatGPT, Cursor, Windsurf, and any MCP-compatible tool full control over iOS Simulators — tap, swipe, type, read accessibility trees, inspect app data, capture screenshots, record video, manage devices, and debug apps in real time.

**82 tools** across 15 categories. Zero cursor interference — works silently in the background while you use your Mac.

Inspired by [Playwright MCP](https://github.com/anthropics/mcp-server-playwright) for web automation — Preflight brings the same structured accessibility-first approach to iOS.

[![npm version](https://img.shields.io/npm/v/preflight-ios-mcp)](https://www.npmjs.com/package/preflight-ios-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why Preflight?

- **No disk clutter** — Screenshots and video frames return directly in chat. No folders filling up.
- **AI-optimized** — Images compressed for minimal token usage. Video → key frames (most AI models can't view video files).
- **Accessibility-first** — Like Playwright's `browser_snapshot`, use `simulator_snapshot` to understand the screen without vision models.
- **Cursor-free** — Touch injection via idb (IndigoHID) — your Mac cursor stays put.
- **82 tools** — From basic tap/swipe to StoreKit testing, network conditioning, memory profiling, and crash log analysis.

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

### Install via npm (recommended)

```bash
npm install -g preflight-ios-mcp
```

### Build from Source

```bash
git clone https://github.com/EthanAckerman-git/Preflight.git
cd Preflight
npm install
npm run build
```

## Setup by IDE / AI Tool

> Add your Python bin directory to `PATH` if idb was installed via pip (e.g., `~/Library/Python/3.x/bin`).

### Claude Code

```bash
claude mcp add preflight -- npx preflight-ios-mcp
```

Or add to **.mcp.json** in your project root:

```json
{
  "mcpServers": {
    "preflight": {
      "command": "npx",
      "args": ["preflight-ios-mcp"],
      "env": {
        "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

### Cursor

Add to **~/.cursor/mcp.json** (global) or **.cursor/mcp.json** (per-project):

```json
{
  "mcpServers": {
    "preflight": {
      "command": "npx",
      "args": ["preflight-ios-mcp"],
      "env": {
        "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

Then in Cursor: **Settings → MCP** — verify "preflight" shows as connected.

### Windsurf

Add to **~/.codeium/windsurf/mcp_config.json**:

```json
{
  "mcpServers": {
    "preflight": {
      "command": "npx",
      "args": ["preflight-ios-mcp"],
      "env": {
        "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

Then in Windsurf: **Settings → Cascade → MCP** — verify "preflight" appears.

### VS Code (Copilot / Cline / Continue)

Add to **.vscode/mcp.json** in your project:

```json
{
  "servers": {
    "preflight": {
      "command": "npx",
      "args": ["preflight-ios-mcp"],
      "env": {
        "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

For **Cline** (VS Code extension), add to **~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json**:

```json
{
  "mcpServers": {
    "preflight": {
      "command": "npx",
      "args": ["preflight-ios-mcp"],
      "env": {
        "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

### Zed

Add to **~/.config/zed/settings.json**:

```json
{
  "context_servers": {
    "preflight": {
      "command": {
        "path": "npx",
        "args": ["preflight-ios-mcp"],
        "env": {
          "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
        }
      }
    }
  }
}
```

### Any MCP-Compatible Client

Preflight uses the standard MCP stdio transport. Configure your client to run:

```bash
npx preflight-ios-mcp
```

Set the `PATH` environment variable to include idb's location for cursor-free touch injection.

## Tools Reference

### Observation (6 tools)

| Tool | Description |
|------|-------------|
| `simulator_screenshot` | Take a JPEG screenshot optimized for AI chat (~200-400KB). Returns image inline. |
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

### Playwright-Inspired (3 tools)

| Tool | Description |
|------|-------------|
| `simulator_snapshot` | **Preferred over screenshots.** Structured accessibility tree — roles, labels, values, positions. No vision model needed. Like Playwright's `browser_snapshot`. |
| `simulator_wait_for_element` | Wait for an element to appear (by label, role, or text). Polls with configurable timeout. Like Playwright's `browser_wait_for`. |
| `simulator_element_exists` | Quick boolean check: does an element matching criteria exist on screen right now? |

### Device Management (6 tools)

| Tool | Description |
|------|-------------|
| `simulator_boot` | Boot a device by name or UDID. Optional `waitForBoot` polling. |
| `simulator_shutdown` | Shut down a running simulator. |
| `simulator_erase` | Factory reset — erases all content and settings. |
| `simulator_open_url` | Open URLs or deep links (e.g., `myapp://screen`). |
| `simulator_open_simulator` | Open the Simulator.app application. |
| `simulator_get_booted_sim_id` | Get the UDID of the currently booted simulator. |

### App Management (4 tools)

| Tool | Description |
|------|-------------|
| `simulator_launch_app` | Launch by bundle ID with optional args and env vars. |
| `simulator_terminate_app` | Force-terminate a running app. |
| `simulator_install_app` | Install a .app bundle or .ipa from a local path. |
| `simulator_uninstall_app` | Uninstall by bundle ID. |

### Debugging & Diagnostics (9 tools)

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
| `simulator_describe_point` | Returns the accessibility element at given coordinates. |

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
| `simulator_record_video` | Start screen recording. On stop, key frames are extracted as images for AI chat. |
| `simulator_stop_recording` | Stop recording. Returns key frames inline (no disk clutter). Optional `savePath` to keep the video. |

### Advanced Debugging & Testing (18 tools)

| Tool | Description |
|------|-------------|
| `simulator_set_content_size` | Set Dynamic Type preferred size (13 categories from extra-small to accessibility-XXXL). |
| `simulator_set_increase_contrast` | Toggle Increase Contrast accessibility setting. |
| `simulator_location_scenario` | Run predefined GPS routes: Freeway Drive, City Run, City Bicycle Ride. |
| `simulator_location_route` | Simulate movement along custom waypoints with configurable speed. |
| `simulator_memory_warning` | Trigger simulated memory warning (didReceiveMemoryWarning). |
| `simulator_keychain` | Add root certificates, add certificates, or reset the device keychain. |
| `simulator_icloud_sync` | Trigger iCloud synchronization on the device. |
| `simulator_verbose_logging` | Enable/disable verbose device logging for deep debugging. |
| `simulator_install_app_data` | Install .xcappdata packages to restore test data snapshots. |
| `simulator_get_env` | Read environment variables from the running simulator. |
| `simulator_biometric` | Enroll, unenroll, match, or fail Face ID / Touch ID for auth testing. |
| `simulator_network_status` | Get network configuration — DNS, interfaces, connectivity status. |
| `simulator_defaults_read` | Read UserDefaults from inside the simulator (inspect app prefs, feature flags). |
| `simulator_defaults_write` | Write UserDefaults inside the simulator (set flags, inject test config). |
| `simulator_rotate` | Rotate the simulator left or right. |
| `simulator_notify_post` | Post a Darwin notification to trigger system events. |
| `simulator_set_locale` | Set device locale for internationalization testing. |
| `simulator_trigger_siri` | Invoke Siri for voice command testing. |

### Accessibility Settings (4 tools)

| Tool | Description |
|------|-------------|
| `simulator_set_reduce_motion` | Toggle Reduce Motion accessibility setting (via defaults write + notification). |
| `simulator_set_smart_invert` | Toggle Smart Invert Colors (via defaults write + notification). |
| `simulator_set_bold_text` | Toggle Bold Text (via defaults write + notification). |
| `simulator_set_reduce_transparency` | Toggle Reduce Transparency (via defaults write + notification). |

### Device Creation & Management (4 tools)

| Tool | Description |
|------|-------------|
| `simulator_create_device` | Create a new simulator with device type and runtime. |
| `simulator_delete_device` | Permanently delete a simulator device. |
| `simulator_rename_device` | Rename an existing device. |
| `simulator_clone_device` | Clone a device with all its state. |

### StoreKit Testing (6 tools) — Xcode 14-16

| Tool | Description |
|------|-------------|
| `simulator_storekit_config` | Enable or disable StoreKit test mode. |
| `simulator_storekit_transactions` | List all StoreKit test transactions. |
| `simulator_storekit_delete_transactions` | Clear all test transactions. |
| `simulator_storekit_manage_subscription` | Expire or force-renew a subscription. |
| `simulator_storekit_manage_transaction` | Refund, approve, or decline ask-to-buy transactions. |
| `simulator_storekit_reset_eligibility` | Reset introductory offer eligibility for all products. |

### Network Testing (2 tools)

| Tool | Description |
|------|-------------|
| `simulator_network_condition` | Apply network throttling with presets (3G, LTE, Edge, WiFi, 100% loss) or custom bandwidth/latency/loss. |
| `simulator_network_capture` | Capture network activity summary — active connections, DNS, interfaces. |

### Debugging & Profiling (5 tools)

| Tool | Description |
|------|-------------|
| `simulator_leak_check` | Check a running app for memory leaks via Apple's `leaks` tool. |
| `simulator_heap_info` | Dump heap allocation summary — object counts by class, total memory. |
| `simulator_vmmap` | Show virtual memory map — regions, sizes, permissions. |
| `simulator_sample_process` | Sample a process for CPU hotspot detection and hang analysis. |
| `simulator_thermal_state` | Simulate thermal pressure state changes (nominal, fair, serious, critical). |

## Architecture

```
src/
├── index.ts                    # MCP server entry, 82 tool registrations
├── helpers/
│   ├── idb.ts                  # Facebook idb CLI wrapper (cursor-free touch)
│   ├── simctl.ts               # xcrun simctl command wrapper
│   ├── applescript.ts          # Keyboard input + CGEvent fallback
│   ├── coordinate-mapper.ts    # Simulator points → macOS screen coords
│   ├── mouse-events.swift      # Native Swift CGEvent binary (fallback)
│   └── logger.ts               # Structured stderr logging
└── tools/
    ├── screenshot.ts           # JPEG capture optimized for AI chat
    ├── interaction.ts          # Tap, swipe, long press, type, key
    ├── device.ts               # Boot, shutdown, erase, open URL
    ├── app.ts                  # Install, launch, terminate, list
    ├── system.ts               # Location, push, clipboard, media, permissions
    ├── ui.ts                   # Appearance, status bar, video recording, navigate back
    ├── debug.ts                # Logs, files, crash reports, accessibility
    ├── advanced.ts             # Dynamic Type, keychain, iCloud, biometric, defaults, accessibility, rotation, locale
    ├── storekit.ts             # StoreKit testing — transactions, subscriptions, eligibility
    ├── network.ts              # Network conditioning (dnctl/pfctl) and capture
    ├── profiling.ts            # Memory profiling — leaks, heap, vmmap, sample, thermal
    └── playwright.ts           # Snapshot, wait_for_element, element_exists
```

### Design Philosophy

**Accessibility-first, like Playwright MCP:**
1. Use `simulator_snapshot` to understand the screen (structured text, no vision model)
2. Use coordinates from the snapshot to `simulator_tap`, `simulator_swipe`, etc.
3. Use `simulator_screenshot` when you need visual verification
4. Use `simulator_wait_for_element` before interacting with elements that appear after transitions

**No disk clutter:**
- Screenshots return as base64 in chat — no folders filling up your Desktop
- Video recordings extract key frames as inline images on stop
- Optional `savePath` parameter if you actually need files on disk

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
```

## Demo App

A SwiftUI demo app is included in `demo-app/` for testing all MCP features:

```bash
cd demo-app
xcodebuild -project MCPDemo.xcodeproj -scheme MCPDemo \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' \
  build
```

The demo app has 7 tabs exercising every tool category:
- **Interactions**: Buttons, text fields, long-press zones, navigation stack, scrollable lists
- **Location**: Live GPS display for testing `simulator_set_location`
- **Notifications**: Push notification display for testing `simulator_send_push`
- **Settings**: Clipboard, file I/O, accessibility toggles, UserDefaults
- **StoreKit**: Mock purchases and subscriptions for testing StoreKit tools
- **Network**: Connection monitoring and latency testing for network conditioning
- **Debug**: Memory/CPU stress tests, thermal state, accessibility settings observer, biometric auth

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `PREFLIGHT_FILTERED_TOOLS` | (none) | Comma-separated list of tool names to disable |
| `PREFLIGHT_IDB_PATH` | (auto-detect) | Custom path to idb binary |
| `PATH` | System PATH | Must include idb binary location |

## Example Prompts

### QA Testing
> "Boot the iPhone 16 Pro simulator, install my app at ./build/MyApp.app, launch it, and take a screenshot of the home screen. Then tap the login button, type test@email.com in the email field, and verify the form validation works."

### Accessibility-First Workflow (Playwright-style)
> "Take a snapshot of the current screen to see what elements are available. Then tap the button labeled 'Sign In' and wait for the email text field to appear."

### Debugging
> "My app is crashing on launch. Check the crash logs for MyApp, then get the last 5 minutes of device logs filtered to the MyApp process."

### Dark Mode Testing
> "Switch to dark mode, take a screenshot, then switch to light mode and screenshot again."

## Troubleshooting

### idb not detected
If tools show `[CGEvent fallback]` instead of `[cursor-free]`:

1. Verify idb is installed: `which idb` or check `~/Library/Python/3.x/bin/idb`
2. Add the idb path to your MCP config's `PATH` env var
3. Or set `PREFLIGHT_IDB_PATH` directly

### Simulator not found
1. Open Simulator.app: `open -a Simulator`
2. Boot a device: use `simulator_boot` or `xcrun simctl boot "iPhone 16 Pro"`

### Accessibility permission errors
1. Go to System Settings → Privacy & Security → Accessibility
2. Add your terminal app (Terminal.app, iTerm, Claude Code, Cursor, Windsurf, etc.)

## Development

```bash
npm run dev    # Watch mode (TypeScript only)
npm run build  # Full rebuild (TypeScript + Swift binary)
node dist/index.js  # Run directly
```

## License

MIT License — see [LICENSE](LICENSE) for details.

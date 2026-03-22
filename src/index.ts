#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as logger from './helpers/logger.js';

// Tool imports
import { screenshotParams, handleScreenshot } from './tools/screenshot.js';
import {
  listDevicesParams, handleListDevices,
  bootParams, handleBoot,
  shutdownParams, handleShutdown,
  eraseParams, handleErase,
  openUrlParams, handleOpenUrl,
  openSimulatorParams, handleOpenSimulator,
  getBootedSimIdParams, handleGetBootedSimId,
} from './tools/device.js';
import {
  listAppsParams, handleListApps,
  appInfoParams, handleAppInfo,
  launchAppParams, handleLaunchApp,
  terminateAppParams, handleTerminateApp,
  installAppParams, handleInstallApp,
  uninstallAppParams, handleUninstallApp,
} from './tools/app.js';
import {
  tapParams, handleTap,
  swipeParams, handleSwipe,
  longPressParams, handleLongPress,
  describePointParams, handleDescribePoint,
  typeTextParams, handleTypeText,
  pressKeyParams, handlePressKey,
} from './tools/interaction.js';
import {
  setLocationParams, handleSetLocation,
  sendPushParams, handleSendPush,
  setClipboardParams, handleSetClipboard,
  getClipboardParams, handleGetClipboard,
  addMediaParams, handleAddMedia,
  grantPermissionParams, handleGrantPermission,
} from './tools/system.js';
import {
  setAppearanceParams, handleSetAppearance,
  overrideStatusBarParams, handleOverrideStatusBar,
  recordVideoParams, handleRecordVideo,
  stopRecordingParams, handleStopRecording,
  navigateBackParams, handleNavigateBack,
} from './tools/ui.js';
import {
  getLogsParams, handleGetLogs,
  streamLogsParams, handleStreamLogs,
  getAppContainerParams, handleGetAppContainer,
  listAppFilesParams, handleListAppFiles,
  readAppFileParams, handleReadAppFile,
  getCrashLogsParams, handleGetCrashLogs,
  diagnoseParams, handleDiagnose,
  accessibilityAuditParams, handleAccessibilityAudit,
  getScreenInfoParams, handleGetScreenInfo,
} from './tools/debug.js';
import {
  icloudSyncParams, handleIcloudSync,
  keychainParams, handleKeychain,
  contentSizeParams, handleContentSize,
  increaseContrastParams, handleIncreaseContrast,
  locationScenarioParams, handleLocationScenario,
  locationRouteParams, handleLocationRoute,
  verboseLoggingParams, handleVerboseLogging,
  installAppDataParams, handleInstallAppData,
  getEnvParams, handleGetEnv,
  memoryWarningParams, handleMemoryWarning,
  biometricParams, handleBiometric,
  networkStatusParams, handleNetworkStatus,
  defaultsReadParams, handleDefaultsRead,
  defaultsWriteParams, handleDefaultsWrite,
} from './tools/advanced.js';
import {
  snapshotParams, handleSnapshot,
  waitForElementParams, handleWaitForElement,
  elementExistsParams, handleElementExists,
} from './tools/playwright.js';

// Support tool filtering via environment variable
const filteredTools = new Set(
  (process.env.PREFLIGHT_FILTERED_TOOLS || process.env.IOS_SIMULATOR_MCP_FILTERED_TOOLS || '')
    .split(',').map(s => s.trim()).filter(Boolean)
);

const server = new McpServer({
  name: 'preflight-mcp',
  version: '1.0.0',
});

// Register a tool, skipping if it's in the filtered list
function registerTool(name: string, description: string, params: any, handler: any) {
  if (filteredTools.has(name)) {
    logger.debug('server', `Tool ${name} filtered out by PREFLIGHT_FILTERED_TOOLS`);
    return;
  }
  server.tool(name, description, params, handler);
}

// Helper to wrap tool handlers with logging and error handling
function wrapHandler<T>(name: string, handler: (args: T) => Promise<any>) {
  return async (args: T) => {
    const start = Date.now();
    logger.toolStart(name, args);
    try {
      const result = await handler(args);
      logger.toolEnd(name, Date.now() - start, true);
      return result;
    } catch (err: unknown) {
      const e = err as Error;
      logger.toolEnd(name, Date.now() - start, false);
      logger.error(`tool:${name}`, e.message, { stack: e.stack });
      return {
        content: [{
          type: 'text' as const,
          text: `Error: ${e.message}`,
        }],
        isError: true,
      };
    }
  };
}

// ========== Observation Tools ==========

registerTool(
  'simulator_screenshot',
  'Take a screenshot of the iOS Simulator screen. Returns the image directly for viewing.',
  screenshotParams,
  wrapHandler('simulator_screenshot', handleScreenshot),
);

registerTool(
  'simulator_list_devices',
  'List iOS Simulator devices. Shows name, UDID, state, and runtime.',
  listDevicesParams,
  wrapHandler('simulator_list_devices', handleListDevices),
);

registerTool(
  'simulator_list_apps',
  'List all installed apps on the simulator with their bundle IDs.',
  listAppsParams,
  wrapHandler('simulator_list_apps', handleListApps),
);

registerTool(
  'simulator_app_info',
  'Get detailed metadata about an installed app (bundle ID, paths, version, etc.).',
  appInfoParams,
  wrapHandler('simulator_app_info', handleAppInfo),
);

registerTool(
  'simulator_get_clipboard',
  'Read the text content of the simulator clipboard.',
  getClipboardParams,
  wrapHandler('simulator_get_clipboard', handleGetClipboard),
);

registerTool(
  'simulator_get_screen_info',
  'Get diagnostic info about the Simulator window geometry and coordinate mapping. Useful for debugging tap/swipe accuracy.',
  getScreenInfoParams,
  wrapHandler('simulator_get_screen_info', handleGetScreenInfo),
);

// ========== User Interaction Tools ==========

registerTool(
  'simulator_tap',
  'Tap at a point on the simulator screen. Coordinates are in simulator screen points (e.g., 0-393 for iPhone width). Take a screenshot first to identify coordinates.',
  tapParams,
  wrapHandler('simulator_tap', handleTap),
);

registerTool(
  'simulator_swipe',
  'Swipe/drag from one point to another on the simulator screen. Coordinates are in simulator screen points. Use for scrolling, pulling down, or any drag gesture.',
  swipeParams,
  wrapHandler('simulator_swipe', handleSwipe),
);

registerTool(
  'simulator_long_press',
  'Long press at a point on the simulator screen. Useful for context menus, drag-and-drop initiation, etc.',
  longPressParams,
  wrapHandler('simulator_long_press', handleLongPress),
);

registerTool(
  'simulator_describe_point',
  'Returns the accessibility element at given coordinates on the iOS Simulator screen. Shows element type, label, value, and frame.',
  describePointParams,
  wrapHandler('simulator_describe_point', handleDescribePoint),
);

registerTool(
  'simulator_type_text',
  'Type text into the currently focused text field in the simulator. Make sure a text field is focused first (tap on it).',
  typeTextParams,
  wrapHandler('simulator_type_text', handleTypeText),
);

registerTool(
  'simulator_press_key',
  'Press a special key (return, escape, delete, tab, arrows, etc.) with optional modifiers (command, shift, option, control).',
  pressKeyParams,
  wrapHandler('simulator_press_key', handlePressKey),
);

// ========== Device Management Tools ==========

registerTool(
  'simulator_boot',
  'Boot an iOS Simulator device. Opens the Simulator app. Use simulator_list_devices to find device names/UDIDs.',
  bootParams,
  wrapHandler('simulator_boot', handleBoot),
);

registerTool(
  'simulator_shutdown',
  'Shut down a running simulator device.',
  shutdownParams,
  wrapHandler('simulator_shutdown', handleShutdown),
);

registerTool(
  'simulator_erase',
  'Factory reset a simulator device. Erases all content and settings.',
  eraseParams,
  wrapHandler('simulator_erase', handleErase),
);

registerTool(
  'simulator_open_url',
  'Open a URL or deep link in the simulator (e.g., "https://example.com" or "myapp://screen").',
  openUrlParams,
  wrapHandler('simulator_open_url', handleOpenUrl),
);

registerTool(
  'simulator_open_simulator',
  'Opens the iOS Simulator application.',
  openSimulatorParams,
  wrapHandler('simulator_open_simulator', handleOpenSimulator),
);

registerTool(
  'simulator_get_booted_sim_id',
  'Get the UDID of the currently booted iOS Simulator.',
  getBootedSimIdParams,
  wrapHandler('simulator_get_booted_sim_id', handleGetBootedSimId),
);

// ========== App Management Tools ==========

registerTool(
  'simulator_launch_app',
  'Launch an app by bundle ID. Optionally pass launch arguments and environment variables.',
  launchAppParams,
  wrapHandler('simulator_launch_app', handleLaunchApp),
);

registerTool(
  'simulator_terminate_app',
  'Force-terminate a running app by bundle ID.',
  terminateAppParams,
  wrapHandler('simulator_terminate_app', handleTerminateApp),
);

registerTool(
  'simulator_install_app',
  'Install a .app bundle onto the simulator from a local file path.',
  installAppParams,
  wrapHandler('simulator_install_app', handleInstallApp),
);

registerTool(
  'simulator_uninstall_app',
  'Uninstall an app from the simulator by bundle ID.',
  uninstallAppParams,
  wrapHandler('simulator_uninstall_app', handleUninstallApp),
);

// ========== Developer Debugging Tools ==========

registerTool(
  'simulator_get_logs',
  'Get recent device/app logs. Filter by process name, subsystem, log level, time range, and message content. Essential for debugging app behavior.',
  getLogsParams,
  wrapHandler('simulator_get_logs', handleGetLogs),
);

registerTool(
  'simulator_stream_logs',
  'Start/read/stop a live log stream. Use action="start" to begin, "read" to get the buffer, "stop" to end. Great for watching app behavior in real-time.',
  streamLogsParams,
  wrapHandler('simulator_stream_logs', handleStreamLogs),
);

registerTool(
  'simulator_get_app_container',
  'Get the filesystem path to an app\'s container (bundle, data, or shared groups). Use this to find where the app stores its files.',
  getAppContainerParams,
  wrapHandler('simulator_get_app_container', handleGetAppContainer),
);

registerTool(
  'simulator_list_app_files',
  'List files in an app\'s data container. Shows Documents, Library, Preferences, Caches, tmp, etc. Use to find databases, plists, caches.',
  listAppFilesParams,
  wrapHandler('simulator_list_app_files', handleListAppFiles),
);

registerTool(
  'simulator_read_app_file',
  'Read a file from an app\'s data container. Handles plists (converts to JSON), SQLite databases (shows schema), and text files. Specify path relative to data container.',
  readAppFileParams,
  wrapHandler('simulator_read_app_file', handleReadAppFile),
);

registerTool(
  'simulator_get_crash_logs',
  'Retrieve crash reports from ~/Library/Logs/DiagnosticReports/. Shows stack traces, exception info, and thread states. Filter by process name.',
  getCrashLogsParams,
  wrapHandler('simulator_get_crash_logs', handleGetCrashLogs),
);

registerTool(
  'simulator_diagnose',
  'Generate a diagnostic summary: booted devices, Xcode version, disk usage, and system info.',
  diagnoseParams,
  wrapHandler('simulator_diagnose', handleDiagnose),
);

registerTool(
  'simulator_accessibility_audit',
  'Get the accessibility element tree of the current Simulator screen. Shows roles, labels, values, and positions of UI elements.',
  accessibilityAuditParams,
  wrapHandler('simulator_accessibility_audit', handleAccessibilityAudit),
);

// ========== System Simulation Tools ==========

registerTool(
  'simulator_set_location',
  'Set the simulated GPS location (latitude, longitude). Useful for testing location-based features.',
  setLocationParams,
  wrapHandler('simulator_set_location', handleSetLocation),
);

registerTool(
  'simulator_send_push',
  'Send a push notification to an app. Provide the full APNs payload JSON (e.g., {"aps": {"alert": "Hello"}}).',
  sendPushParams,
  wrapHandler('simulator_send_push', handleSendPush),
);

registerTool(
  'simulator_set_clipboard',
  'Set text on the simulator clipboard. Useful for pasting content into apps.',
  setClipboardParams,
  wrapHandler('simulator_set_clipboard', handleSetClipboard),
);

registerTool(
  'simulator_add_media',
  'Add photos or videos to the simulator\'s camera roll from local file paths.',
  addMediaParams,
  wrapHandler('simulator_add_media', handleAddMedia),
);

registerTool(
  'simulator_grant_permission',
  'Grant, revoke, or reset app permissions (camera, location, photos, contacts, microphone, etc.).',
  grantPermissionParams,
  wrapHandler('simulator_grant_permission', handleGrantPermission),
);

// ========== UI Configuration Tools ==========

registerTool(
  'simulator_set_appearance',
  'Switch the simulator between light and dark mode.',
  setAppearanceParams,
  wrapHandler('simulator_set_appearance', handleSetAppearance),
);

registerTool(
  'simulator_override_status_bar',
  'Override the simulator status bar: set time, battery, signal bars, carrier name, network type. Use clear=true to reset.',
  overrideStatusBarParams,
  wrapHandler('simulator_override_status_bar', handleOverrideStatusBar),
);

registerTool(
  'simulator_record_video',
  'Start recording the simulator screen to a video file. Use simulator_stop_recording to stop. Supports H.264 and HEVC codecs.',
  recordVideoParams,
  wrapHandler('simulator_record_video', handleRecordVideo),
);

registerTool(
  'simulator_stop_recording',
  'Stop an active video recording and save the file.',
  stopRecordingParams,
  wrapHandler('simulator_stop_recording', handleStopRecording),
);

registerTool(
  'simulator_navigate_back',
  'Navigate back in the current app. Sends Cmd+[ (standard back navigation). Works in Safari and apps with standard UINavigationController. Workaround for edge-swipe-back gesture limitation.',
  navigateBackParams,
  wrapHandler('simulator_navigate_back', handleNavigateBack),
);

// ========== Advanced Tools ==========

registerTool(
  'simulator_icloud_sync',
  'Trigger iCloud sync on the device. Requires the device to be signed into an Apple ID.',
  icloudSyncParams,
  wrapHandler('simulator_icloud_sync', handleIcloudSync),
);

registerTool(
  'simulator_keychain',
  'Manipulate the device keychain: add root certificates, add certificates, or reset the entire keychain.',
  keychainParams,
  wrapHandler('simulator_keychain', handleKeychain),
);

registerTool(
  'simulator_set_content_size',
  'Set the preferred content size for Dynamic Type testing. Test your app with accessibility text sizes without changing device settings manually.',
  contentSizeParams,
  wrapHandler('simulator_set_content_size', handleContentSize),
);

registerTool(
  'simulator_set_increase_contrast',
  'Enable or disable the Increase Contrast accessibility setting. Test how your app responds to high contrast mode.',
  increaseContrastParams,
  wrapHandler('simulator_set_increase_contrast', handleIncreaseContrast),
);

registerTool(
  'simulator_location_scenario',
  'Run predefined GPS location scenarios (Freeway Drive, City Run, City Bicycle Ride). Simulates realistic movement patterns for testing location features.',
  locationScenarioParams,
  wrapHandler('simulator_location_scenario', handleLocationScenario),
);

registerTool(
  'simulator_location_route',
  'Simulate movement along a custom route with waypoints. Specify GPS coordinates and speed for realistic location testing.',
  locationRouteParams,
  wrapHandler('simulator_location_route', handleLocationRoute),
);

registerTool(
  'simulator_verbose_logging',
  'Enable or disable verbose device logging for deep debugging. Requires device reboot to take effect.',
  verboseLoggingParams,
  wrapHandler('simulator_verbose_logging', handleVerboseLogging),
);

registerTool(
  'simulator_install_app_data',
  'Install an .xcappdata package to replace the current app container contents. Useful for restoring test data snapshots.',
  installAppDataParams,
  wrapHandler('simulator_install_app_data', handleInstallAppData),
);

registerTool(
  'simulator_get_env',
  'Read an environment variable from the running simulator device (e.g., HOME, TMPDIR, PATH).',
  getEnvParams,
  wrapHandler('simulator_get_env', handleGetEnv),
);

registerTool(
  'simulator_memory_warning',
  'Trigger a simulated memory warning. Apps will receive didReceiveMemoryWarning and can be tested for proper memory cleanup.',
  memoryWarningParams,
  wrapHandler('simulator_memory_warning', handleMemoryWarning),
);

registerTool(
  'simulator_biometric',
  'Set Face ID / Touch ID enrollment state. Test biometric authentication flows.',
  biometricParams,
  wrapHandler('simulator_biometric', handleBiometric),
);

registerTool(
  'simulator_network_status',
  'Get the current network configuration inside the simulator — interfaces, IP addresses, DNS config.',
  networkStatusParams,
  wrapHandler('simulator_network_status', handleNetworkStatus),
);

registerTool(
  'simulator_defaults_read',
  'Read UserDefaults values from inside the simulator. Inspect app preferences, feature flags, and configuration.',
  defaultsReadParams,
  wrapHandler('simulator_defaults_read', handleDefaultsRead),
);

registerTool(
  'simulator_defaults_write',
  'Write UserDefaults values inside the simulator. Set feature flags, change app configuration, or inject test data.',
  defaultsWriteParams,
  wrapHandler('simulator_defaults_write', handleDefaultsWrite),
);

// ========== Playwright-Inspired Tools ==========

registerTool(
  'simulator_snapshot',
  'Capture a structured accessibility snapshot of the current screen — like Playwright\'s browser_snapshot. Returns roles, labels, values, and positions. PREFERRED over screenshots for understanding UI structure and targeting interactions. No vision model needed.',
  snapshotParams,
  wrapHandler('simulator_snapshot', handleSnapshot),
);

registerTool(
  'simulator_wait_for_element',
  'Wait for an accessibility element to appear on screen. Polls until the element matching your criteria (label, role, or text) appears, or times out. Like Playwright\'s browser_wait_for.',
  waitForElementParams,
  wrapHandler('simulator_wait_for_element', handleWaitForElement),
);

registerTool(
  'simulator_element_exists',
  'Quick check: does an element matching your criteria exist on screen right now? Returns true/false. Useful for conditional logic.',
  elementExistsParams,
  wrapHandler('simulator_element_exists', handleElementExists),
);

// ========== Start Server ==========

async function main() {
  logger.info('server', 'Preflight MCP server starting...');

  // Detect idb for cursor-free touch injection
  const { checkIdbAvailable } = await import('./helpers/idb.js');
  const hasIdb = await checkIdbAvailable();
  if (hasIdb) {
    logger.info('server', 'idb detected — using cursor-free touch injection (IndigoHID)');
  } else {
    logger.warn('server', 'idb not found — using CGEvent fallback. Install for cursor-free touch: brew tap facebook/fb && brew install idb-companion && pip3 install fb-idb');
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('server', 'Preflight MCP server connected and ready.');
}

main().catch((err) => {
  logger.error('server', 'Fatal error', { error: err.message, stack: err.stack });
  process.exit(1);
});

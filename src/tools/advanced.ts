import { z } from 'zod';
import { execSimctl, execCommand, resolveDevice, runAppleScript } from '../helpers/simctl.js';
import * as logger from '../helpers/logger.js';
import { writeFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// --- icloud_sync ---

export const icloudSyncParams = {
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleIcloudSync(args: { deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  try {
    await execSimctl(['icloud_sync', device], 'tool:icloudSync');
    return { content: [{ type: 'text' as const, text: 'iCloud sync triggered.' }] };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { content: [{ type: 'text' as const, text: `iCloud sync failed (device may not be signed in): ${e.message}` }] };
  }
}

// --- keychain ---

export const keychainParams = {
  action: z.enum(['add-root-cert', 'add-cert', 'reset']).describe('"add-root-cert" to add trusted root CA, "add-cert" to add certificate, "reset" to clear keychain'),
  path: z.string().optional().describe('Path to certificate file (required for add-root-cert and add-cert)'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleKeychain(args: { action: string; path?: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);

  if (args.action === 'reset') {
    await execSimctl(['keychain', device, 'reset'], 'tool:keychain');
    return { content: [{ type: 'text' as const, text: 'Keychain reset.' }] };
  }

  if (!args.path) {
    return { content: [{ type: 'text' as const, text: `Certificate path is required for ${args.action}.` }] };
  }

  await execSimctl(['keychain', device, args.action, args.path], 'tool:keychain');
  return { content: [{ type: 'text' as const, text: `Certificate added via ${args.action}: ${args.path}` }] };
}

// --- content_size (Dynamic Type) ---

export const contentSizeParams = {
  size: z.enum([
    'extra-small', 'small', 'medium', 'large', 'extra-large', 'extra-extra-large', 'extra-extra-extra-large',
    'accessibility-medium', 'accessibility-large', 'accessibility-extra-large',
    'accessibility-extra-extra-large', 'accessibility-extra-extra-extra-large',
  ]).describe('Preferred content size category for Dynamic Type testing'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleContentSize(args: { size: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  await execSimctl(['ui', device, 'content_size', args.size], 'tool:contentSize');
  return { content: [{ type: 'text' as const, text: `Content size set to "${args.size}". Apps using Dynamic Type will update.` }] };
}

// --- increase_contrast ---

export const increaseContrastParams = {
  enabled: z.boolean().describe('Enable or disable Increase Contrast accessibility setting'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleIncreaseContrast(args: { enabled: boolean; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  await execSimctl(['ui', device, 'increase_contrast', args.enabled ? 'enabled' : 'disabled'], 'tool:increaseContrast');
  return { content: [{ type: 'text' as const, text: `Increase Contrast ${args.enabled ? 'enabled' : 'disabled'}.` }] };
}

// --- location_scenario ---

export const locationScenarioParams = {
  action: z.enum(['list', 'run', 'clear']).describe('"list" available scenarios, "run" a scenario, "clear" to stop'),
  scenario: z.string().optional().describe('Scenario name (e.g., "Freeway Drive", "City Run", "City Bicycle Ride", "Apple")'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleLocationScenario(args: { action: string; scenario?: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);

  if (args.action === 'list') {
    const { stdout } = await execSimctl(['location', device, 'list'], 'tool:locationScenario');
    return { content: [{ type: 'text' as const, text: `Available location scenarios:\n${stdout}` }] };
  }

  if (args.action === 'clear') {
    await execSimctl(['location', device, 'clear'], 'tool:locationScenario');
    return { content: [{ type: 'text' as const, text: 'Location scenario stopped and location cleared.' }] };
  }

  if (!args.scenario) {
    return { content: [{ type: 'text' as const, text: 'Scenario name required for "run". Use action="list" to see available scenarios.' }] };
  }

  await execSimctl(['location', device, 'run', args.scenario], 'tool:locationScenario');
  return { content: [{ type: 'text' as const, text: `Running location scenario: "${args.scenario}". Use action="clear" to stop.` }] };
}

// --- location_route (simulate movement between waypoints) ---

export const locationRouteParams = {
  waypoints: z.array(z.object({
    lat: z.number().describe('Latitude'),
    lng: z.number().describe('Longitude'),
  })).describe('Array of {lat, lng} waypoints to traverse'),
  speed: z.number().optional().describe('Speed in meters/second (default: ~walking speed)'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleLocationRoute(args: {
  waypoints: Array<{ lat: number; lng: number }>;
  speed?: number;
  deviceId?: string;
}) {
  const device = await resolveDevice(args.deviceId);

  if (args.waypoints.length < 2) {
    return { content: [{ type: 'text' as const, text: 'At least 2 waypoints required.' }] };
  }

  // Generate proper GPX XML for simctl location start (incremental timestamps for movement)
  const baseTime = Date.now();
  const gpxWaypoints = args.waypoints.map((w, i) =>
    `      <trkpt lat="${w.lat}" lon="${w.lng}"><time>${new Date(baseTime + i * 1000).toISOString()}</time></trkpt>`
  ).join('\n');
  const gpxData = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="preflight-mcp">
  <trk>
    <name>Preflight Route</name>
    <trkseg>
${gpxWaypoints}
    </trkseg>
  </trk>
</gpx>
`;

  const cmdArgs = ['simctl', 'location', device, 'start'];
  if (args.speed) cmdArgs.push('--speed=' + args.speed);

  try {
    const { spawn } = await import('node:child_process');

    await new Promise<void>((resolve, reject) => {
      const child = spawn('xcrun', cmdArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
      let stderr = '';
      child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(stderr || `exit code ${code}`));
      });
      child.stdin.write(gpxData);
      child.stdin.end();
    });

    return {
      content: [{
        type: 'text' as const,
        text: `Simulating route with ${args.waypoints.length} waypoints${args.speed ? ` at ${args.speed}m/s` : ''}. Use simulator_location_scenario action="clear" to stop.`,
      }],
    };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { content: [{ type: 'text' as const, text: `Route simulation failed: ${e.message}` }] };
  }
}

// --- verbose_logging ---

export const verboseLoggingParams = {
  enabled: z.boolean().describe('Enable or disable verbose logging (device reboot may be required)'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleVerboseLogging(args: { enabled: boolean; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  await execSimctl(['logverbose', device, args.enabled ? 'enable' : 'disable'], 'tool:verboseLogging');
  return {
    content: [{
      type: 'text' as const,
      text: `Verbose logging ${args.enabled ? 'enabled' : 'disabled'}. Reboot the device for changes to take effect.`,
    }],
  };
}

// --- install_app_data ---

export const installAppDataParams = {
  path: z.string().describe('Path to .xcappdata package to install'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleInstallAppData(args: { path: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  await execSimctl(['install_app_data', device, args.path], 'tool:installAppData');
  return { content: [{ type: 'text' as const, text: `App data installed from: ${args.path}` }] };
}

// --- get_env ---

export const getEnvParams = {
  variable: z.string().describe('Environment variable name to read (e.g., "HOME", "TMPDIR", "PATH")'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleGetEnv(args: { variable: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  const { stdout } = await execSimctl(['getenv', device, args.variable], 'tool:getEnv');
  return { content: [{ type: 'text' as const, text: `${args.variable}=${stdout.trim()}` }] };
}

// --- simulate_memory_warning ---

export const memoryWarningParams = {
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleMemoryWarning(args: { deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  try {
    // Trigger UIKit memory warning via notification
    await execSimctl(
      ['spawn', device, 'notifyutil', '-p', 'com.apple.UIKit.lowMemory'],
      'tool:memoryWarning'
    );
    return { content: [{ type: 'text' as const, text: 'Memory warning triggered. Apps will receive didReceiveMemoryWarning.' }] };
  } catch {
    // Fallback: try via launchctl
    try {
      await execSimctl(
        ['spawn', device, 'notifyutil', '-p', 'com.apple.system.memorystatus.level.warning'],
        'tool:memoryWarning'
      );
      return { content: [{ type: 'text' as const, text: 'Memory pressure warning triggered.' }] };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return { content: [{ type: 'text' as const, text: `Memory warning simulation failed: ${e.message}. Use Xcode Debug > Simulate Memory Warning as alternative.` }] };
    }
  }
}

// --- biometric_enrollment ---

export const biometricParams = {
  action: z.enum(['enroll', 'unenroll', 'match', 'fail']).optional().describe('"enroll" to enable biometrics, "unenroll" to disable, "match" to simulate successful auth, "fail" to simulate failed auth'),
  enrolled: z.boolean().optional().describe('(Deprecated: use action instead) Whether Face ID / Touch ID is enrolled'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleBiometric(args: { action?: string; enrolled?: boolean; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);

  // Backward compat: map enrolled boolean to action
  let action = args.action;
  if (!action && args.enrolled !== undefined) {
    action = args.enrolled ? 'enroll' : 'unenroll';
  }
  if (!action) {
    return { content: [{ type: 'text' as const, text: 'Provide action ("enroll", "unenroll", "match", or "fail") or enrolled (true/false).' }] };
  }

  try {
    switch (action) {
      case 'enroll':
        await execSimctl(['spawn', device, 'notifyutil', '-s', 'com.apple.BiometricKit.enrollmentChanged', '1'], 'tool:biometric');
        return { content: [{ type: 'text' as const, text: 'Biometric enrollment enabled (Face ID / Touch ID enrolled).' }] };
      case 'unenroll':
        await execSimctl(['spawn', device, 'notifyutil', '-s', 'com.apple.BiometricKit.enrollmentChanged', '0'], 'tool:biometric');
        return { content: [{ type: 'text' as const, text: 'Biometric enrollment disabled.' }] };
      case 'match':
        await execSimctl(['spawn', device, 'notifyutil', '-p', 'com.apple.BiometricKit_Sim.fingerTouch.match'], 'tool:biometric');
        return { content: [{ type: 'text' as const, text: 'Biometric match triggered — app should receive successful authentication.' }] };
      case 'fail':
        await execSimctl(['spawn', device, 'notifyutil', '-p', 'com.apple.BiometricKit_Sim.fingerTouch.nomatch'], 'tool:biometric');
        return { content: [{ type: 'text' as const, text: 'Biometric failure triggered — app should receive authentication failure.' }] };
      default:
        return { content: [{ type: 'text' as const, text: `Unknown action: ${action}` }] };
    }
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { content: [{ type: 'text' as const, text: `Biometric action failed: ${e.message}. Use Simulator > Features > Face ID/Touch ID menu as alternative.` }] };
  }
}

// --- network_status (read/display network configuration) ---

export const networkStatusParams = {
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleNetworkStatus(args: { deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  const results: string[] = [];

  // Get network info from host perspective (simulator shares host network)
  try {
    const { execFile: ef } = await import('node:child_process');
    const { promisify: p } = await import('node:util');
    const exec = p(ef);
    const { stdout } = await exec('networksetup', ['-listallhardwareports'], { encoding: 'utf-8', timeout: 5000 });
    const lines = stdout.split('\n').filter(l => l.includes('Hardware Port:') || l.includes('Device:'));
    results.push('Host Network Ports:\n' + lines.join('\n'));
  } catch { /* skip */ }

  // Check connectivity from inside simulator
  try {
    const { stdout } = await execSimctl(
      ['spawn', device, 'nslookup', 'apple.com'],
      'tool:networkStatus'
    );
    const serverLine = stdout.split('\n').find(l => l.includes('Server:'));
    results.push('\nDNS Resolution: ' + (serverLine || 'working'));
  } catch {
    results.push('\nDNS Resolution: failed (may be offline)');
  }

  // Get simulator's env for network-related vars
  try {
    const { stdout: home } = await execSimctl(['getenv', device, 'HOME'], 'tool:networkStatus');
    results.push(`\nSimulator data path: ${home.trim()}`);
  } catch { /* skip */ }

  return { content: [{ type: 'text' as const, text: results.join('\n') || 'No network info available.' }] };
}

// --- defaults_read (read UserDefaults from inside simulator) ---

export const defaultsReadParams = {
  domain: z.string().describe('Defaults domain (bundle ID like "com.apple.mobilesafari" or "NSGlobalDomain")'),
  key: z.string().optional().describe('Specific key to read (omit for all keys)'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleDefaultsRead(args: { domain: string; key?: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  const cmdArgs = ['spawn', device, 'defaults', 'read', args.domain];
  if (args.key) cmdArgs.push(args.key);

  try {
    const { stdout } = await execSimctl(cmdArgs, 'tool:defaultsRead');
    return { content: [{ type: 'text' as const, text: `${args.domain}${args.key ? '.' + args.key : ''}:\n${stdout.trim()}` }] };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { content: [{ type: 'text' as const, text: `defaults read failed: ${e.message}` }] };
  }
}

// --- defaults_write (write UserDefaults inside simulator) ---

export const defaultsWriteParams = {
  domain: z.string().describe('Defaults domain (bundle ID)'),
  key: z.string().describe('Key to write'),
  value: z.string().describe('Value to set'),
  type: z.enum(['string', 'int', 'float', 'bool']).optional().describe('Value type (default: string)'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleDefaultsWrite(args: {
  domain: string; key: string; value: string; type?: string; deviceId?: string;
}) {
  const device = await resolveDevice(args.deviceId);
  const typeFlag = args.type === 'int' ? '-int' : args.type === 'float' ? '-float' : args.type === 'bool' ? '-bool' : '-string';
  await execSimctl(
    ['spawn', device, 'defaults', 'write', args.domain, args.key, typeFlag, args.value],
    'tool:defaultsWrite'
  );
  return { content: [{ type: 'text' as const, text: `Set ${args.domain}.${args.key} = ${args.value} (${args.type || 'string'})` }] };
}

// --- reduce_motion ---

export const reduceMotionParams = {
  enabled: z.boolean().describe('Enable or disable Reduce Motion accessibility setting'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleReduceMotion(args: { enabled: boolean; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  await execSimctl(['spawn', device, 'defaults', 'write', 'com.apple.Accessibility', 'ReduceMotionEnabled', '-bool', args.enabled ? 'true' : 'false'], 'tool:reduceMotion');
  await execSimctl(['spawn', device, 'notifyutil', '-p', 'com.apple.accessibility.reduceMotionStatusDidChange'], 'tool:reduceMotion');
  return { content: [{ type: 'text' as const, text: `Reduce Motion ${args.enabled ? 'enabled' : 'disabled'}.` }] };
}

// --- smart_invert ---

export const smartInvertParams = {
  enabled: z.boolean().describe('Enable or disable Smart Invert Colors'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleSmartInvert(args: { enabled: boolean; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  await execSimctl(['spawn', device, 'defaults', 'write', 'com.apple.Accessibility', 'AXSSystemUIProcessAppSmartInvertEnabledPreference', '-bool', args.enabled ? 'true' : 'false'], 'tool:smartInvert');
  await execSimctl(['spawn', device, 'notifyutil', '-p', 'com.apple.accessibility.invertColorsStatusDidChange'], 'tool:smartInvert');
  return { content: [{ type: 'text' as const, text: `Smart Invert ${args.enabled ? 'enabled' : 'disabled'}.` }] };
}

// --- bold_text ---

export const boldTextParams = {
  enabled: z.boolean().describe('Enable or disable Bold Text'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleBoldText(args: { enabled: boolean; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  await execSimctl(['spawn', device, 'defaults', 'write', 'com.apple.Accessibility', 'BoldTextEnabled', '-bool', args.enabled ? 'true' : 'false'], 'tool:boldText');
  await execSimctl(['spawn', device, 'notifyutil', '-p', 'com.apple.accessibility.boldTextStatusDidChange'], 'tool:boldText');
  return { content: [{ type: 'text' as const, text: `Bold Text ${args.enabled ? 'enabled' : 'disabled'}.` }] };
}

// --- reduce_transparency ---

export const reduceTransparencyParams = {
  enabled: z.boolean().describe('Enable or disable Reduce Transparency'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleReduceTransparency(args: { enabled: boolean; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  await execSimctl(['spawn', device, 'defaults', 'write', 'com.apple.Accessibility', 'EnhancedBackgroundContrastEnabled', '-bool', args.enabled ? 'true' : 'false'], 'tool:reduceTransparency');
  await execSimctl(['spawn', device, 'notifyutil', '-p', 'com.apple.accessibility.reduceTransparencyStatusDidChange'], 'tool:reduceTransparency');
  return { content: [{ type: 'text' as const, text: `Reduce Transparency ${args.enabled ? 'enabled' : 'disabled'}.` }] };
}

// --- rotate ---

export const rotateParams = {
  direction: z.enum(['left', 'right']).describe('Rotation direction'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleRotate(args: { direction: 'left' | 'right'; deviceId?: string }) {
  await resolveDevice(args.deviceId);
  // Cmd+Left/Right arrow in Simulator.app rotates the device
  const keyCode = args.direction === 'left' ? 123 : 124; // left=123, right=124
  const script = `
tell application "Simulator" to activate
delay 0.3
tell application "System Events"
  key code ${keyCode} using command down
end tell`;
  await runAppleScript(script, 'tool:rotate');
  return { content: [{ type: 'text' as const, text: `Device rotated ${args.direction}.` }] };
}

// --- notify_post ---

export const notifyPostParams = {
  notification: z.string().describe('Darwin notification name to post (e.g., "com.apple.MobileDataSettingsUpdated")'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleNotifyPost(args: { notification: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  await execSimctl(['spawn', device, 'notifyutil', '-p', args.notification], 'tool:notifyPost');
  return { content: [{ type: 'text' as const, text: `Darwin notification posted: ${args.notification}` }] };
}

// --- set_locale ---

export const setLocaleParams = {
  locale: z.string().describe('Locale identifier (e.g., "en_US", "ja_JP", "fr_FR", "de_DE")'),
  language: z.string().optional().describe('Language identifier (e.g., "en", "ja", "fr"). If omitted, derived from locale'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleSetLocale(args: { locale: string; language?: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  const lang = args.language || args.locale.split('_')[0];

  await execSimctl(
    ['spawn', device, 'defaults', 'write', '.GlobalPreferences', 'AppleLocale', '-string', args.locale],
    'tool:setLocale'
  );
  await execSimctl(
    ['spawn', device, 'defaults', 'write', '.GlobalPreferences', 'AppleLanguages', '-array', lang],
    'tool:setLocale'
  );

  return {
    content: [{
      type: 'text' as const,
      text: `Locale set to "${args.locale}", language to "${lang}". Reboot the simulator for changes to take effect (use simulator_shutdown then simulator_boot).`,
    }],
  };
}

// --- trigger_siri ---

export const triggerSiriParams = {
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleTriggerSiri(args: { deviceId?: string }) {
  await resolveDevice(args.deviceId);
  const script = `
tell application "Simulator" to activate
delay 0.3
tell application "System Events"
  key code 49 using command down
end tell`;
  try {
    await runAppleScript(script, 'tool:triggerSiri');
    return { content: [{ type: 'text' as const, text: 'Siri invoked (Cmd+Space). Use simulator_type_text to enter a query if text input is available.' }] };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { content: [{ type: 'text' as const, text: `Failed to trigger Siri: ${e.message}` }] };
  }
}

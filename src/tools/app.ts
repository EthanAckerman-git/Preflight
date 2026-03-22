import { z } from 'zod';
import { execSimctl, resolveDevice } from '../helpers/simctl.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const execFileAsync = promisify(execFile);

// --- list_apps ---

export const listAppsParams = {
  deviceId: z.string().optional().describe('Device UDID, name, or "booted" (default: booted)'),
  includeSystem: z.boolean().optional().describe('Include system apps (default: false)'),
};

export async function handleListApps(args: { deviceId?: string; includeSystem?: boolean }) {
  const device = await resolveDevice(args.deviceId);

  // Use JSON output via plutil for reliable parsing
  const { stdout } = await execSimctl(['listapps', device], 'tool:listApps');

  let apps: { name: string; bundleId: string; version?: string; isSystem?: boolean }[] = [];

  try {
    // Write plist to temp file then convert to JSON
    const tmpFile = join(tmpdir(), `simctl-apps-${Date.now()}.plist`);
    await writeFile(tmpFile, stdout as string, 'utf-8');
    let data: Record<string, any>;
    try {
      const result = await execFileAsync('plutil', ['-convert', 'json', '-o', '-', tmpFile], {
        maxBuffer: 50 * 1024 * 1024,
        encoding: 'utf-8',
        timeout: 15000,
      });
      data = JSON.parse(result.stdout);
    } finally {
      await unlink(tmpFile).catch(() => {});
    }
    for (const [bundleId, info] of Object.entries(data as Record<string, any>)) {
      const name = info.CFBundleDisplayName || info.CFBundleName || bundleId;
      const version = info.CFBundleShortVersionString || info.CFBundleVersion;
      const isSystem = info.ApplicationType === 'System';

      if (!args.includeSystem && isSystem) continue;

      apps.push({ name, bundleId, version, isSystem });
    }
  } catch {
    // Fallback: regex parsing
    const bundleIdMatches = [...stdout.matchAll(/CFBundleIdentifier\s*=\s*"?([^";\n]+)"?/g)];
    const nameMatches = [...stdout.matchAll(/(?:CFBundleDisplayName|CFBundleName)\s*=\s*"?([^";\n]+)"?/g)];
    apps = bundleIdMatches.map((m, i) => ({
      bundleId: m[1].trim(),
      name: nameMatches[i]?.[1]?.trim() || m[1].trim(),
    }));
  }

  apps.sort((a, b) => a.name.localeCompare(b.name));

  const lines = apps.map(a => `${a.name} — ${a.bundleId}${a.version ? ` (v${a.version})` : ''}`);

  return {
    content: [{
      type: 'text' as const,
      text: apps.length === 0
        ? 'No apps found.'
        : `Installed apps (${apps.length}):\n\n${lines.join('\n')}`,
    }],
  };
}

// --- app_info ---

export const appInfoParams = {
  bundleId: z.string().describe('App bundle identifier (e.g., "com.apple.mobilesafari")'),
  deviceId: z.string().optional().describe('Device UDID, name, or "booted" (default: booted)'),
};

export async function handleAppInfo(args: { bundleId: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  const { stdout } = await execSimctl(['appinfo', device, args.bundleId], 'tool:appInfo');

  // Convert plist to JSON for readability
  try {
    const tmpFile2 = join(tmpdir(), `simctl-appinfo-${Date.now()}.plist`);
    await writeFile(tmpFile2, stdout as string, 'utf-8');
    let data: Record<string, any>;
    try {
      const result = await execFileAsync('plutil', ['-convert', 'json', '-o', '-', tmpFile2], {
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf-8',
        timeout: 5000,
      });
      data = JSON.parse(result.stdout);
    } finally {
      await unlink(tmpFile2).catch(() => {});
    }
    const fields = [
      `Bundle ID:   ${data.CFBundleIdentifier || args.bundleId}`,
      `Name:        ${data.CFBundleDisplayName || data.CFBundleName || '—'}`,
      `Version:     ${data.CFBundleShortVersionString || '—'} (${data.CFBundleVersion || '—'})`,
      `Type:        ${data.ApplicationType || '—'}`,
      `Bundle Path: ${data.Path || data.CFBundleExecutable || '—'}`,
      `Data Path:   ${data.DataContainer || '—'}`,
      `SDK:         ${data.DTSDKName || '—'}`,
      `Min iOS:     ${data.MinimumOSVersion || '—'}`,
    ];
    return { content: [{ type: 'text' as const, text: fields.join('\n') }] };
  } catch {
    return { content: [{ type: 'text' as const, text: stdout }] };
  }
}

// --- launch_app ---

export const launchAppParams = {
  bundleId: z.string().describe('App bundle identifier to launch'),
  terminateRunning: z.boolean().optional().describe('Terminate the app first if already running (default: false)'),
  args: z.array(z.string()).optional().describe('Launch arguments to pass to the app'),
  env: z.record(z.string()).optional().describe('Environment variables to set (will be prefixed with SIMCTL_CHILD_)'),
  deviceId: z.string().optional().describe('Device UDID, name, or "booted" (default: booted)'),
};

export async function handleLaunchApp(args: {
  bundleId: string;
  terminateRunning?: boolean;
  args?: string[];
  env?: Record<string, string>;
  deviceId?: string;
}) {
  const device = await resolveDevice(args.deviceId);

  // Terminate first if requested
  if (args.terminateRunning) {
    try {
      await execSimctl(['terminate', device, args.bundleId], 'tool:launchApp');
    } catch { /* app may not be running, ignore */ }
  }

  if (args.env) {
    for (const [key, value] of Object.entries(args.env)) {
      process.env[`SIMCTL_CHILD_${key}`] = value;
    }
  }

  const cmdArgs = ['launch', device, args.bundleId, ...(args.args || [])];
  const { stdout } = await execSimctl(cmdArgs, 'tool:launchApp');

  if (args.env) {
    for (const key of Object.keys(args.env)) {
      delete process.env[`SIMCTL_CHILD_${key}`];
    }
  }

  return {
    content: [{
      type: 'text' as const,
      text: `Launched ${args.bundleId}. ${stdout.trim()}`,
    }],
  };
}

// --- terminate_app ---

export const terminateAppParams = {
  bundleId: z.string().describe('App bundle identifier to terminate'),
  deviceId: z.string().optional().describe('Device UDID, name, or "booted" (default: booted)'),
};

export async function handleTerminateApp(args: { bundleId: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  try {
    await execSimctl(['terminate', device, args.bundleId], 'tool:terminateApp');
  } catch (err) {
    // Not running is not an error
    const msg = (err as Error).message;
    if (!msg.includes('not running') && !msg.includes('No such process')) throw err;
  }
  return { content: [{ type: 'text' as const, text: `Terminated ${args.bundleId}.` }] };
}

// --- install_app ---

export const installAppParams = {
  path: z.string().describe('Path to .app bundle or .ipa file to install'),
  deviceId: z.string().optional().describe('Device UDID, name, or "booted" (default: booted)'),
};

export async function handleInstallApp(args: { path: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  await execSimctl(['install', device, args.path], 'tool:installApp');
  return { content: [{ type: 'text' as const, text: `Installed app from ${args.path}.` }] };
}

// --- uninstall_app ---

export const uninstallAppParams = {
  bundleId: z.string().describe('App bundle identifier to uninstall'),
  deviceId: z.string().optional().describe('Device UDID, name, or "booted" (default: booted)'),
};

export async function handleUninstallApp(args: { bundleId: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  await execSimctl(['uninstall', device, args.bundleId], 'tool:uninstallApp');
  return { content: [{ type: 'text' as const, text: `Uninstalled ${args.bundleId}.` }] };
}

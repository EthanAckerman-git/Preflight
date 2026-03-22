import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as logger from './logger.js';

const execFileAsync = promisify(execFile);

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export interface ExecBufferResult {
  stdout: Buffer;
  stderr: Buffer;
}

export interface SimDevice {
  name: string;
  udid: string;
  state: string;
  runtime: string;
  isAvailable: boolean;
  deviceTypeIdentifier?: string;
}

/**
 * Execute an xcrun simctl command and return stdout/stderr as strings.
 */
export async function execSimctl(args: string[], ctx = 'simctl'): Promise<ExecResult> {
  const cmd = ['simctl', ...args];
  logger.debug(ctx, `Running: xcrun ${cmd.join(' ')}`);
  try {
    const result = await execFileAsync('xcrun', cmd, {
      maxBuffer: 50 * 1024 * 1024,
      encoding: 'utf-8',
    });
    logger.debug(ctx, `Exit code: 0, stdout=${result.stdout.length}b, stderr=${result.stderr.length}b`);
    return result;
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number; message?: string };
    logger.error(ctx, `Command failed: xcrun ${cmd.join(' ')}`, {
      code: e.code,
      stderr: e.stderr?.slice(0, 500),
    });
    throw new Error(
      `simctl ${args[0]} failed: ${e.stderr || e.message || 'unknown error'}`
    );
  }
}

/**
 * Execute an xcrun simctl command and return stdout as a Buffer (for binary data like screenshots).
 */
export async function execSimctlBuffer(args: string[], ctx = 'simctl'): Promise<ExecBufferResult> {
  const cmd = ['simctl', ...args];
  logger.debug(ctx, `Running (buffer): xcrun ${cmd.join(' ')}`);
  try {
    const result = await execFileAsync('xcrun', cmd, {
      maxBuffer: 50 * 1024 * 1024,
      encoding: 'buffer',
    });
    logger.debug(ctx, `Exit code: 0, stdout=${result.stdout.length}b`);
    return result;
  } catch (err: unknown) {
    const e = err as { stderr?: Buffer; code?: number; message?: string };
    const stderrStr = e.stderr ? e.stderr.toString('utf-8').slice(0, 500) : '';
    logger.error(ctx, `Command failed: xcrun ${cmd.join(' ')}`, {
      code: e.code,
      stderr: stderrStr,
    });
    throw new Error(`simctl ${args[0]} failed: ${stderrStr || e.message || 'unknown error'}`);
  }
}

/**
 * Execute an arbitrary command (not simctl).
 */
export async function execCommand(command: string, args: string[], ctx = 'exec'): Promise<ExecResult> {
  logger.debug(ctx, `Running: ${command} ${args.join(' ')}`);
  try {
    const result = await execFileAsync(command, args, {
      maxBuffer: 50 * 1024 * 1024,
      encoding: 'utf-8',
    });
    return result;
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number; message?: string };
    logger.error(ctx, `Command failed: ${command} ${args.join(' ')}`, {
      code: e.code,
      stderr: e.stderr?.slice(0, 500),
    });
    throw new Error(`${command} failed: ${e.stderr || e.message || 'unknown error'}`);
  }
}

/**
 * List all simulator devices. Optionally filter by state.
 */
export async function listDevices(filter?: 'booted' | 'available' | 'all'): Promise<SimDevice[]> {
  const { stdout } = await execSimctl(['list', '-j', 'devices'], 'listDevices');
  const data = JSON.parse(stdout);
  const devices: SimDevice[] = [];

  for (const [runtime, devs] of Object.entries(data.devices)) {
    for (const dev of devs as any[]) {
      devices.push({
        name: dev.name,
        udid: dev.udid,
        state: dev.state,
        runtime,
        isAvailable: dev.isAvailable ?? false,
        deviceTypeIdentifier: dev.deviceTypeIdentifier,
      });
    }
  }

  if (filter === 'booted') return devices.filter(d => d.state === 'Booted');
  if (filter === 'available') return devices.filter(d => d.isAvailable);
  return devices;
}

/**
 * Resolve a device identifier to a UDID. Accepts:
 * - undefined / "booted" → "booted" (with validation)
 * - A UDID string → returned as-is
 * - A device name → resolved to UDID
 */
export async function resolveDevice(deviceId?: string): Promise<string> {
  if (!deviceId || deviceId === 'booted') {
    const booted = await listDevices('booted');
    if (booted.length === 0) {
      const available = await listDevices('available');
      const suggestions = available
        .filter(d => d.runtime.includes('iOS'))
        .slice(0, 5)
        .map(d => `  - ${d.name} (${d.udid})`)
        .join('\n');
      throw new Error(
        `No simulator is currently booted. Use simulator_boot to start one.\n\nAvailable iOS devices:\n${suggestions}`
      );
    }
    return 'booted';
  }

  // Check if it's a UDID pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deviceId)) {
    return deviceId;
  }

  // Try name match
  const devices = await listDevices();
  const match = devices.find(d => d.name.toLowerCase() === deviceId.toLowerCase());
  if (match) return match.udid;

  throw new Error(
    `Device "${deviceId}" not found. Use simulator_list_devices to see available devices.`
  );
}

/**
 * Run osascript (AppleScript) and return stdout.
 */
export async function runAppleScript(script: string, ctx = 'applescript'): Promise<string> {
  logger.debug(ctx, 'Executing AppleScript', { scriptLength: script.length });
  try {
    const result = await execFileAsync('osascript', ['-e', script], {
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      timeout: 15000,
    });
    return result.stdout.trim();
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string };
    const stderr = e.stderr || '';
    if (stderr.includes('not allowed') || stderr.includes('accessibility')) {
      throw new Error(
        'Accessibility permission required. Go to System Settings → Privacy & Security → Accessibility and add your terminal app.'
      );
    }
    logger.error(ctx, 'AppleScript failed', { stderr, script: script.slice(0, 200) });
    throw new Error(`AppleScript failed: ${stderr || e.message}`);
  }
}

/**
 * Run osascript with the ObjC bridge (for CGEvents).
 */
export async function runJXA(script: string, ctx = 'jxa'): Promise<string> {
  logger.debug(ctx, 'Executing JXA script', { scriptLength: script.length });
  try {
    const result = await execFileAsync('osascript', ['-l', 'JavaScript', '-e', script], {
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      timeout: 15000,
    });
    return result.stdout.trim();
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string };
    const stderr = e.stderr || '';
    if (stderr.includes('not allowed') || stderr.includes('accessibility')) {
      throw new Error(
        'Accessibility permission required. Go to System Settings → Privacy & Security → Accessibility and add your terminal app.'
      );
    }
    logger.error(ctx, 'JXA script failed', { stderr });
    throw new Error(`JXA script failed: ${stderr || e.message}`);
  }
}

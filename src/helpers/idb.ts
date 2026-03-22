import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { listDevices } from './simctl.js';
import * as logger from './logger.js';

const execFileAsync = promisify(execFile);

// Module-level cache for idb availability
let idbAvailable: boolean | null = null;
let idbPath: string | null = null;

// Common install locations for idb (pip3 installs to user bin)
const IDB_SEARCH_PATHS = [
  '/opt/homebrew/bin/idb',
  '/usr/local/bin/idb',
  `${process.env.HOME}/Library/Python/3.9/bin/idb`,
  `${process.env.HOME}/Library/Python/3.10/bin/idb`,
  `${process.env.HOME}/Library/Python/3.11/bin/idb`,
  `${process.env.HOME}/Library/Python/3.12/bin/idb`,
  `${process.env.HOME}/Library/Python/3.13/bin/idb`,
  `${process.env.HOME}/.local/bin/idb`,
];

/**
 * Check if idb CLI is installed and available.
 * Checks PATH via `which`, then searches common install locations.
 * Caches the result for the lifetime of the server process.
 */
export async function checkIdbAvailable(): Promise<boolean> {
  if (idbAvailable !== null) return idbAvailable;

  // Check env var first (custom idb path)
  const envPath = process.env.PREFLIGHT_IDB_PATH || process.env.IOS_SIMULATOR_MCP_IDB_PATH;
  if (envPath) {
    const { access } = await import('node:fs/promises');
    try {
      await access(envPath);
      idbPath = envPath;
      idbAvailable = true;
      logger.debug('idb', `idb found via env var: ${idbPath}`);
      return true;
    } catch {
      logger.warn('idb', `idb path from env var not found: ${envPath}`);
    }
  }

  // Try `which idb` (respects PATH)
  try {
    const { stdout } = await execFileAsync('which', ['idb'], {
      encoding: 'utf-8',
      timeout: 5000,
    });
    const found = stdout.trim();
    if (found) {
      idbPath = found;
      idbAvailable = true;
      logger.debug('idb', `idb found via PATH: ${idbPath}`);
      return true;
    }
  } catch { /* not in PATH */ }

  // Search common install locations
  const { access } = await import('node:fs/promises');
  for (const candidate of IDB_SEARCH_PATHS) {
    try {
      await access(candidate);
      idbPath = candidate;
      idbAvailable = true;
      logger.debug('idb', `idb found at: ${idbPath}`);
      return true;
    } catch { /* not here */ }
  }

  idbAvailable = false;
  logger.debug('idb', 'idb not found in PATH or common locations');
  return false;
}

/**
 * Resolve a device identifier to an actual UDID.
 * idb requires real UDIDs — it doesn't support "booted".
 */
async function resolveUdid(deviceId: string): Promise<string> {
  if (deviceId === 'booted') {
    const booted = await listDevices('booted');
    if (booted.length === 0) {
      throw new Error('No booted simulator found');
    }
    return booted[0].udid;
  }
  return deviceId;
}

/**
 * Execute an idb command. Throws on failure.
 */
async function runIdb(args: string[], ctx: string): Promise<string> {
  const cmd = idbPath || 'idb';
  logger.debug(ctx, `Running: idb ${args.join(' ')}`);
  try {
    const result = await execFileAsync(cmd, args, {
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      timeout: 30000,
    });
    return result.stdout;
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    logger.error(ctx, `idb failed: ${e.stderr || e.message}`);
    throw new Error(`idb ${args[0]} failed: ${e.stderr || e.message}`);
  }
}

/**
 * Tap at simulator screen coordinates using idb.
 * No macOS coordinate mapping needed — idb uses sim points directly.
 */
export async function idbTap(x: number, y: number, deviceId: string, duration?: number): Promise<void> {
  const udid = await resolveUdid(deviceId);
  const args = ['ui', 'tap', '--udid', udid, String(Math.round(x)), String(Math.round(y))];
  if (duration !== undefined) args.push('--duration', String(duration));
  await runIdb(args, 'idb:tap');
}

/**
 * Swipe between two points using idb.
 * idb takes duration in fractional seconds.
 */
export async function idbSwipe(
  startX: number, startY: number,
  endX: number, endY: number,
  durationMs: number,
  deviceId: string,
  delta?: number,
): Promise<void> {
  const udid = await resolveUdid(deviceId);
  const durationSec = (durationMs / 1000).toFixed(2);
  const args = [
    'ui', 'swipe',
    '--udid', udid,
    String(Math.round(startX)), String(Math.round(startY)),
    String(Math.round(endX)), String(Math.round(endY)),
    '--duration', durationSec,
  ];
  if (delta !== undefined) args.push('--delta', String(delta));
  await runIdb(args, 'idb:swipe');
}

/**
 * Long press at simulator screen coordinates using idb.
 * idb uses `tap --duration` for long presses (no separate long-press command).
 */
export async function idbLongPress(
  x: number, y: number,
  durationMs: number,
  deviceId: string,
): Promise<void> {
  const udid = await resolveUdid(deviceId);
  const durationSec = (durationMs / 1000).toFixed(2);
  await runIdb([
    'ui', 'tap',
    '--udid', udid,
    '--duration', durationSec,
    String(Math.round(x)), String(Math.round(y)),
  ], 'idb:longPress');
}

/**
 * Get the full iOS accessibility tree via idb.
 * Returns actual iOS UI elements (UIButton, UILabel, etc.) with labels, frames, and enabled state.
 */
export async function idbDescribeAll(deviceId: string): Promise<string> {
  const udid = await resolveUdid(deviceId);
  return await runIdb(['ui', 'describe-all', '--udid', udid], 'idb:describeAll');
}

/**
 * Describe the iOS UI element at a specific point.
 */
export async function idbDescribePoint(x: number, y: number, deviceId: string): Promise<string> {
  const udid = await resolveUdid(deviceId);
  return await runIdb([
    'ui', 'describe-point',
    '--udid', udid,
    String(Math.round(x)), String(Math.round(y)),
  ], 'idb:describePoint');
}

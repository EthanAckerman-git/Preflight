import { z } from 'zod';
import { execSimctl, resolveDevice } from '../helpers/simctl.js';
import * as logger from '../helpers/logger.js';
import { spawn, ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { mkdir } from 'node:fs/promises';

// Active video recording processes
const activeRecordings = new Map<string, { process: ChildProcess; outputPath: string; startTime: number }>();
const RECORDINGS_DIR = join(homedir(), 'Desktop', 'SimulatorRecordings');

// --- set_appearance ---

export const setAppearanceParams = {
  mode: z.enum(['light', 'dark']).describe('Appearance mode'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleSetAppearance(args: { mode: 'light' | 'dark'; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  await execSimctl(['ui', device, 'appearance', args.mode], 'tool:setAppearance');
  return { content: [{ type: 'text' as const, text: `Appearance set to ${args.mode} mode.` }] };
}

// --- override_status_bar ---

export const overrideStatusBarParams = {
  time: z.string().optional().describe('Status bar time string (e.g., "9:41")'),
  batteryLevel: z.number().optional().describe('Battery level 0-100'),
  batteryState: z.enum(['charging', 'charged', 'discharging']).optional().describe('Battery state'),
  cellularBars: z.number().optional().describe('Cellular signal bars 0-4'),
  wifiBars: z.number().optional().describe('WiFi signal bars 0-3'),
  networkType: z.string().optional().describe('Data network type: wifi, 3g, 4g, lte, lte-a, lte+, 5g, 5g+, 5g-uwb, 5g-uc'),
  operatorName: z.string().optional().describe('Carrier/operator name'),
  clear: z.boolean().optional().describe('Set to true to clear all overrides'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleOverrideStatusBar(args: {
  time?: string;
  batteryLevel?: number;
  batteryState?: string;
  cellularBars?: number;
  wifiBars?: number;
  networkType?: string;
  operatorName?: string;
  clear?: boolean;
  deviceId?: string;
}) {
  const device = await resolveDevice(args.deviceId);

  if (args.clear) {
    await execSimctl(['status_bar', device, 'clear'], 'tool:statusBar');
    return { content: [{ type: 'text' as const, text: 'Status bar overrides cleared.' }] };
  }

  const flags: string[] = [];
  if (args.time) flags.push('--time', args.time);
  if (args.batteryLevel !== undefined) flags.push('--batteryLevel', String(args.batteryLevel));
  if (args.batteryState) flags.push('--batteryState', args.batteryState);
  if (args.cellularBars !== undefined) flags.push('--cellularBars', String(args.cellularBars));
  if (args.wifiBars !== undefined) flags.push('--wifiBars', String(args.wifiBars));
  if (args.networkType) flags.push('--dataNetwork', args.networkType);
  if (args.operatorName) flags.push('--operatorName', args.operatorName);

  if (flags.length === 0) {
    return { content: [{ type: 'text' as const, text: 'No overrides specified. Provide at least one parameter or set clear=true.' }] };
  }

  await execSimctl(['status_bar', device, 'override', ...flags], 'tool:statusBar');

  return {
    content: [{
      type: 'text' as const,
      text: `Status bar overrides applied: ${flags.filter((_, i) => i % 2 === 0).map(f => f.replace('--', '')).join(', ')}`,
    }],
  };
}

// --- record_video ---

export const recordVideoParams = {
  outputPath: z.string().optional().describe('Path to save the video file. Defaults to ~/Desktop/SimulatorRecordings/<timestamp>.mp4'),
  codec: z.enum(['h264', 'hevc']).optional().describe('Video codec (default: h264)'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleRecordVideo(args: { outputPath?: string; codec?: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  const codec = args.codec || 'h264';

  // Check for existing recording on this device
  if (activeRecordings.has(device)) {
    return { content: [{ type: 'text' as const, text: 'A recording is already in progress. Use simulator_stop_recording to stop it first.' }] };
  }

  // Determine output path
  await mkdir(RECORDINGS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputPath = args.outputPath || join(RECORDINGS_DIR, `recording-${timestamp}.mp4`);

  const cmdArgs = ['simctl', 'io', device, 'recordVideo', '--codec', codec, outputPath];
  const child = spawn('xcrun', cmdArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

  activeRecordings.set(device, { process: child, outputPath, startTime: Date.now() });

  child.on('exit', () => {
    activeRecordings.delete(device);
  });

  logger.debug('tool:recordVideo', `Recording started: ${outputPath}`);

  return {
    content: [{
      type: 'text' as const,
      text: `Video recording started (${codec}). Output: ${outputPath}\nUse simulator_stop_recording to stop.`,
    }],
  };
}

// --- stop_recording ---

export const stopRecordingParams = {
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleStopRecording(args: { deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  const recording = activeRecordings.get(device);

  if (!recording) {
    return { content: [{ type: 'text' as const, text: 'No active recording to stop.' }] };
  }

  // Send SIGINT to gracefully stop recording (simctl finishes writing the file)
  recording.process.kill('SIGINT');
  const duration = Math.round((Date.now() - recording.startTime) / 1000);

  // Wait a moment for the file to be finalized
  await new Promise(resolve => setTimeout(resolve, 1000));
  activeRecordings.delete(device);

  return {
    content: [{
      type: 'text' as const,
      text: `Recording stopped after ${duration}s. Saved to: ${recording.outputPath}`,
    }],
  };
}

// --- navigate_back ---

export const navigateBackParams = {
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleNavigateBack(args: { deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);

  // Use Hardware > Shake gesture or Cmd+[ for Safari-like back navigation
  // Cmd+Left bracket is the standard macOS back navigation shortcut
  // which the Simulator forwards to the iOS app
  const { pressKey } = await import('../helpers/applescript.js');
  try {
    await pressKey('[', ['command']);
    return {
      content: [{
        type: 'text' as const,
        text: 'Sent back navigation command (Cmd+[). Works in Safari and apps with standard navigation.',
      }],
    };
  } catch {
    // Fallback: try tapping a common back button location
    const { checkIdbAvailable, idbTap } = await import('../helpers/idb.js');
    if (await checkIdbAvailable()) {
      // Common iOS back button position: top-left area
      await idbTap(30, 55, device);
      return {
        content: [{
          type: 'text' as const,
          text: 'Tapped back button area (30, 55) via idb. Use simulator_accessibility_audit to find exact back button coordinates if this didn\'t work.',
        }],
      };
    }
    return {
      content: [{
        type: 'text' as const,
        text: 'Back navigation failed. Use simulator_tap on the visible back button, or simulator_accessibility_audit to find its coordinates.',
      }],
    };
  }
}

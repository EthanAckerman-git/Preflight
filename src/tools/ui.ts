import { z } from 'zod';
import { execSimctl, execSimctlBuffer, resolveDevice } from '../helpers/simctl.js';
import * as logger from '../helpers/logger.js';
import { spawn, ChildProcess, execFile } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdir, writeFile, unlink, readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Active video recording state
const activeRecordings = new Map<string, { process: ChildProcess; tmpPath: string; startTime: number }>();

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
// Records to a temp file. On stop, extracts key frames and returns them as images
// directly in chat. No permanent disk clutter. Most AI models can't view video files
// so key frames are much more useful.

export const recordVideoParams = {
  codec: z.enum(['h264', 'hevc']).optional().describe('Video codec (default: h264)'),
  display: z.enum(['internal', 'external']).optional().describe('Display to capture (default: internal)'),
  mask: z.enum(['ignored', 'alpha', 'black']).optional().describe('For non-rectangular displays, handle mask by policy'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleRecordVideo(args: {
  codec?: string; display?: string; mask?: string; deviceId?: string;
}) {
  const device = await resolveDevice(args.deviceId);
  const codec = args.codec || 'h264';

  if (activeRecordings.has(device)) {
    return { content: [{ type: 'text' as const, text: 'A recording is already in progress. Use simulator_stop_recording to stop it first.' }] };
  }

  // Record to temp file — will be cleaned up after frame extraction
  const tmpPath = join(tmpdir(), `preflight-rec-${Date.now()}.mp4`);

  const cmdArgs = ['simctl', 'io', device, 'recordVideo', '--codec', codec];
  if (args.display) cmdArgs.push(`--display=${args.display}`);
  if (args.mask) cmdArgs.push(`--mask=${args.mask}`);
  cmdArgs.push('--force', tmpPath);
  const child = spawn('xcrun', cmdArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

  activeRecordings.set(device, { process: child, tmpPath, startTime: Date.now() });

  child.on('exit', () => { activeRecordings.delete(device); });
  child.on('error', (err) => {
    logger.error('tool:recordVideo', `Recording process error: ${err.message}`);
    activeRecordings.delete(device);
  });

  return {
    content: [{
      type: 'text' as const,
      text: `Video recording started (${codec}). Use simulator_stop_recording to stop and get key frames.`,
    }],
  };
}

// --- stop_recording ---
// Stops recording, extracts key frames as JPEG images, returns them inline.
// Cleans up the temp video file. No disk clutter.

export const stopRecordingParams = {
  savePath: z.string().optional().describe('Optional: save the video file to this path instead of discarding it'),
  maxFrames: z.number().optional().describe('Max number of key frames to extract (default: 3, max: 6)'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleStopRecording(args: { savePath?: string; maxFrames?: number; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  const recording = activeRecordings.get(device);

  if (!recording) {
    return { content: [{ type: 'text' as const, text: 'No active recording to stop.' }] };
  }

  // Gracefully stop recording
  recording.process.kill('SIGINT');
  const duration = Math.round((Date.now() - recording.startTime) / 1000);
  activeRecordings.delete(device);

  // Wait for file to finalize
  await new Promise(resolve => setTimeout(resolve, 1500));

  const maxFrames = Math.min(args.maxFrames || 3, 6);
  const content: Array<{ type: 'text' | 'image'; text?: string; data?: string; mimeType?: string }> = [];

  // Extract key frames using ffmpeg if available, otherwise use sips on a single frame
  try {
    // Check if ffmpeg is available for frame extraction
    let hasFFmpeg = false;
    try {
      await execFileAsync('which', ['ffmpeg'], { timeout: 3000 });
      hasFFmpeg = true;
    } catch { /* no ffmpeg */ }

    if (hasFFmpeg && duration > 0) {
      // Extract evenly spaced frames
      const interval = Math.max(1, Math.floor(duration / maxFrames));
      const frameDir = join(tmpdir(), `preflight-frames-${Date.now()}`);
      await mkdir(frameDir, { recursive: true });

      await execFileAsync('ffmpeg', [
        '-i', recording.tmpPath,
        '-vf', `fps=1/${interval}`,
        '-frames:v', String(maxFrames),
        '-q:v', '8',
        join(frameDir, 'frame-%02d.jpg'),
      ], { timeout: 15000 }).catch(() => {});

      // Read extracted frames
      const { readdir } = await import('node:fs/promises');
      const frames = (await readdir(frameDir).catch(() => [] as string[]))
        .filter(f => f.endsWith('.jpg'))
        .sort()
        .slice(0, maxFrames);

      for (const frame of frames) {
        try {
          const buf = await readFile(join(frameDir, frame));
          content.push({ type: 'image' as const, data: buf.toString('base64'), mimeType: 'image/jpeg' });
        } catch { /* skip unreadable frame */ }
      }

      // Cleanup frame dir
      for (const frame of frames) {
        await unlink(join(frameDir, frame)).catch(() => {});
      }
      await unlink(frameDir).catch(() => {});
    }
  } catch (err) {
    logger.debug('tool:stopRecording', `Frame extraction failed: ${(err as Error).message}`);
  }

  // If no frames extracted, take a final screenshot as fallback
  if (content.length === 0) {
    try {
      const { stdout: pngBuffer } = await execSimctlBuffer(['io', device, 'screenshot', '--type=png', '-'], 'tool:stopRecording');
      // Compress to JPEG
      const tmpPng = join(tmpdir(), `stoprec-${Date.now()}.png`);
      const tmpJpg = join(tmpdir(), `stoprec-${Date.now()}.jpg`);
      await writeFile(tmpPng, pngBuffer);
      await execFileAsync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '60', tmpPng, '--out', tmpJpg], { timeout: 10000 });
      const jpgBuf = await readFile(tmpJpg);
      content.push({ type: 'image' as const, data: jpgBuf.toString('base64'), mimeType: 'image/jpeg' });
      await unlink(tmpPng).catch(() => {});
      await unlink(tmpJpg).catch(() => {});
    } catch {
      content.push({ type: 'text' as const, text: '(Could not capture final frame)' });
    }
  }

  // Handle the video file
  let videoNote = '';
  if (args.savePath) {
    try {
      const { copyFile } = await import('node:fs/promises');
      const dir = args.savePath.substring(0, args.savePath.lastIndexOf('/'));
      if (dir) await mkdir(dir, { recursive: true });
      await copyFile(recording.tmpPath, args.savePath);
      videoNote = `\nVideo saved to: ${args.savePath}`;
    } catch (err) {
      videoNote = `\nFailed to save video: ${(err as Error).message}`;
    }
  }

  // Clean up temp video
  await unlink(recording.tmpPath).catch(() => {});

  content.push({
    type: 'text' as const,
    text: `Recording stopped (${duration}s). ${content.filter(c => c.type === 'image').length} key frame(s) extracted.${videoNote}`,
  });

  return { content };
}

// --- navigate_back ---

export const navigateBackParams = {
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleNavigateBack(args: { deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);

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
    const { checkIdbAvailable, idbTap } = await import('../helpers/idb.js');
    if (await checkIdbAvailable()) {
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

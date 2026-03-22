import { z } from 'zod';
import { execSimctlBuffer, execCommand, resolveDevice } from '../helpers/simctl.js';
import * as logger from '../helpers/logger.js';
import { writeFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Auto-save directory — always on Desktop for easy access
const SCREENSHOT_DIR = join(homedir(), 'Desktop', 'SimulatorScreenshots');
const MAX_BYTES = 2 * 1024 * 1024; // 2MB cap for efficient transmission

export const screenshotParams = {
  deviceId: z.string().optional().describe('Device UDID, name, or "booted" (default: booted)'),
  format: z.enum(['png', 'jpeg']).optional().describe('Image format (default: jpeg)'),
  savePath: z.string().optional().describe('Optional custom path to save the screenshot. Defaults to ~/Desktop/SimulatorScreenshots/<timestamp>.<format>'),
  autoDelete: z.boolean().optional().describe('Delete the saved file after returning it (saves disk space). Default: false'),
};

/**
 * Compress a PNG buffer to JPEG using sips, capping at ~2MB.
 * Returns the JPEG buffer. Falls back to the original if sips fails.
 */
async function compressToJpeg(pngBuffer: Buffer): Promise<Buffer> {
  const tmpPng = join(tmpdir(), `simscr-${Date.now()}.png`);
  const tmpJpg = join(tmpdir(), `simscr-${Date.now()}.jpg`);
  try {
    await writeFile(tmpPng, pngBuffer);
    // Convert to JPEG with sips (macOS built-in)
    await execFileAsync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '70', tmpPng, '--out', tmpJpg], {
      timeout: 10000,
    });
    const { readFile: rf } = await import('node:fs/promises');
    let jpgBuffer = await rf(tmpJpg);

    // If still over 2MB, reduce quality further
    if (jpgBuffer.length > MAX_BYTES) {
      await execFileAsync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '40', tmpPng, '--out', tmpJpg], {
        timeout: 10000,
      });
      jpgBuffer = await rf(tmpJpg);
    }

    return jpgBuffer;
  } catch (err) {
    logger.debug('tool:screenshot', `JPEG compression failed: ${(err as Error).message}`);
    return pngBuffer; // fallback to original
  } finally {
    await unlink(tmpPng).catch(() => {});
    await unlink(tmpJpg).catch(() => {});
  }
}

export async function handleScreenshot(args: { deviceId?: string; format?: string; savePath?: string; autoDelete?: boolean }) {
  const start = Date.now();
  const device = await resolveDevice(args.deviceId);
  const requestedFormat = args.format || 'jpeg'; // default to jpeg for efficiency

  // Always capture as PNG from simctl (highest quality source)
  const { stdout: pngBuffer } = await execSimctlBuffer(
    ['io', device, 'screenshot', '--type=png', '-'],
    'tool:screenshot'
  );

  let outputBuffer: Buffer;
  let mimeType: string;
  let format: string;

  if (requestedFormat === 'jpeg') {
    outputBuffer = await compressToJpeg(pngBuffer);
    mimeType = 'image/jpeg';
    format = 'jpeg';
  } else {
    outputBuffer = pngBuffer;
    mimeType = 'image/png';
    format = 'png';
  }

  // Auto-save screenshot to Desktop folder
  let savedPath = '';
  try {
    await mkdir(SCREENSHOT_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const ext = format === 'jpeg' ? 'jpg' : format;
    const filename = args.savePath || join(SCREENSHOT_DIR, `screenshot-${timestamp}.${ext}`);
    await writeFile(filename, outputBuffer);
    savedPath = filename;
  } catch (err) {
    logger.debug('tool:screenshot', `Failed to auto-save screenshot: ${(err as Error).message}`);
  }

  const base64Data = outputBuffer.toString('base64');
  logger.toolEnd('simulator_screenshot', Date.now() - start, true);

  // Auto-delete if requested (data already encoded as base64 for transmission)
  let deleteNote = '';
  if (args.autoDelete && savedPath) {
    try {
      await unlink(savedPath);
      deleteNote = ' (auto-deleted after encoding)';
      savedPath = '';
    } catch { /* ignore */ }
  }

  return {
    content: [
      {
        type: 'image' as const,
        data: base64Data,
        mimeType,
      },
      {
        type: 'text' as const,
        text: `Screenshot captured (${format}, ${Math.round(outputBuffer.length / 1024)}KB)${savedPath ? `\nSaved to: ${savedPath}` : ''}${deleteNote}`,
      },
    ],
  };
}

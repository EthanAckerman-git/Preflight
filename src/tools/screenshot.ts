import { z } from 'zod';
import { execSimctl, resolveDevice } from '../helpers/simctl.js';
import * as logger from '../helpers/logger.js';
import { writeFile, mkdir, unlink, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Optimized for AI chat: small images that fit in context windows
// Target ~200-400KB JPEG — enough detail for UI analysis, minimal token waste
const MAX_BYTES = 1.5 * 1024 * 1024; // 1.5MB absolute cap

export const screenshotParams = {
  deviceId: z.string().optional().describe('Device UDID, name, or "booted" (default: booted)'),
  format: z.enum(['png', 'jpeg']).optional().describe('Image format (default: jpeg). JPEG recommended for AI — smaller, faster.'),
  display: z.enum(['internal', 'external']).optional().describe('Display to capture (default: internal)'),
  mask: z.enum(['ignored', 'alpha', 'black']).optional().describe('For non-rectangular displays, handle mask by policy'),
  savePath: z.string().optional().describe('Optional: save a copy to this path on disk'),
};

/**
 * Compress a PNG buffer to JPEG using sips, optimized for AI chat.
 * Targets ~200-400KB — enough for UI analysis without wasting tokens.
 */
async function compressToJpeg(pngBuffer: Buffer): Promise<Buffer> {
  const tmpPng = join(tmpdir(), `simscr-${Date.now()}.png`);
  const tmpJpg = join(tmpdir(), `simscr-${Date.now()}.jpg`);
  try {
    await writeFile(tmpPng, pngBuffer);

    // First pass: quality 60 (good for AI analysis, small file)
    await execFileAsync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '60', tmpPng, '--out', tmpJpg], { timeout: 10000 });
    const { readFile: rf } = await import('node:fs/promises');
    let jpgBuffer = await rf(tmpJpg);

    // If still too large, compress harder
    if (jpgBuffer.length > MAX_BYTES) {
      await execFileAsync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '35', tmpPng, '--out', tmpJpg], { timeout: 10000 });
      jpgBuffer = await rf(tmpJpg);
    }

    return jpgBuffer;
  } catch (err) {
    logger.debug('tool:screenshot', `JPEG compression failed: ${(err as Error).message}`);
    return pngBuffer;
  } finally {
    await unlink(tmpPng).catch(() => {});
    await unlink(tmpJpg).catch(() => {});
  }
}

export async function handleScreenshot(args: {
  deviceId?: string; format?: string; display?: string; mask?: string;
  savePath?: string;
}) {
  const device = await resolveDevice(args.deviceId);
  const requestedFormat = args.format || 'jpeg';

  // Capture PNG from simctl (always start with PNG for best quality source)
  // Write to temp file instead of piping to stdout (fixes "read-only file system" on newer macOS)
  const tmpCapture = join(tmpdir(), `simscr-cap-${Date.now()}.png`);
  const simctlArgs = ['io', device, 'screenshot', '--type=png'];
  if (args.display) simctlArgs.push(`--display=${args.display}`);
  if (args.mask) simctlArgs.push(`--mask=${args.mask}`);
  simctlArgs.push(tmpCapture);

  await execSimctl(simctlArgs, 'tool:screenshot');
  const pngBuffer = await readFile(tmpCapture);
  await unlink(tmpCapture).catch(() => {});

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

  // Only save to disk if explicitly requested
  let savedPath = '';
  if (args.savePath) {
    try {
      const dir = args.savePath.substring(0, args.savePath.lastIndexOf('/'));
      if (dir) await mkdir(dir, { recursive: true });
      await writeFile(args.savePath, outputBuffer);
      savedPath = args.savePath;
    } catch (err) {
      logger.debug('tool:screenshot', `Failed to save to ${args.savePath}: ${(err as Error).message}`);
    }
  }

  const base64Data = outputBuffer.toString('base64');

  return {
    content: [
      { type: 'image' as const, data: base64Data, mimeType },
      {
        type: 'text' as const,
        text: `Screenshot captured (${format}, ${Math.round(outputBuffer.length / 1024)}KB)${savedPath ? `\nSaved to: ${savedPath}` : ''}`,
      },
    ],
  };
}

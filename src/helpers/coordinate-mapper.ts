import { execSimctl, runAppleScript } from './simctl.js';
import * as logger from './logger.js';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFile, unlink } from 'node:fs/promises';

export interface WindowGeometry {
  windowX: number;
  windowY: number;
  windowWidth: number;
  windowHeight: number;
}

export interface ScreenMapping {
  windowGeometry: WindowGeometry;
  devicePointWidth: number;
  devicePointHeight: number;
  scaleFactor: number;
  titleBarHeight: number;
  contentWidth: number;
  contentHeight: number;
  scaleX: number;
  scaleY: number;
}

const TITLE_BAR_HEIGHT = 28;

/**
 * Get the Simulator.app front window position and size using AppleScript.
 */
export async function getSimulatorWindowGeometry(): Promise<WindowGeometry> {
  const script = `
tell application "System Events"
  tell process "Simulator"
    set frontWindow to front window
    set winPos to position of frontWindow
    set winSize to size of frontWindow
    return (item 1 of winPos as text) & "," & (item 2 of winPos as text) & "," & (item 1 of winSize as text) & "," & (item 2 of winSize as text)
  end tell
end tell`;

  const result = await runAppleScript(script, 'coordinate-mapper');
  const parts = result.split(',').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
    throw new Error(`Failed to parse window geometry: "${result}"`);
  }

  const geometry: WindowGeometry = {
    windowX: parts[0],
    windowY: parts[1],
    windowWidth: parts[2],
    windowHeight: parts[3],
  };
  logger.debug('coordinate-mapper', 'Window geometry', geometry);
  return geometry;
}

/**
 * Get the device screen dimensions in points by taking a screenshot and reading its pixel dimensions.
 * Returns { pointWidth, pointHeight, scaleFactor }.
 */
export async function getDeviceScreenDimensions(device: string): Promise<{
  pointWidth: number;
  pointHeight: number;
  scaleFactor: number;
  pixelWidth: number;
  pixelHeight: number;
}> {
  // Take a screenshot and get its pixel dimensions (temp file to avoid stdout piping issues)
  const tmpPath = join(tmpdir(), `simscr-dim-${Date.now()}.png`);
  await execSimctl(['io', device, 'screenshot', '--type=png', tmpPath], 'coordinate-mapper');
  const stdout = await readFile(tmpPath);
  await unlink(tmpPath).catch(() => {});

  // Parse PNG header to get dimensions (IHDR chunk at offset 16)
  // PNG signature (8 bytes) + IHDR length (4 bytes) + "IHDR" (4 bytes) + width (4 bytes) + height (4 bytes)
  if (stdout.length < 24) {
    throw new Error('Screenshot too small to parse dimensions');
  }

  const pixelWidth = stdout.readUInt32BE(16);
  const pixelHeight = stdout.readUInt32BE(20);

  // Determine scale factor from known device resolutions
  // Common: 3x for iPhones (Pro), 2x for iPads, 2x for older iPhones
  let scaleFactor = 3; // default to 3x for modern iPhones
  if (pixelWidth > 1500 && pixelHeight < 2000) {
    scaleFactor = 2; // likely iPad
  }

  // Try to infer from common resolutions
  const knownScales: Record<string, number> = {
    // iPhone pixel widths → scale
    '1179': 3, // iPhone 14/15/16 Pro
    '1206': 3, // iPhone 15/16 Pro Max
    '1170': 3, // iPhone 14/15/16
    '1290': 3, // iPhone 14/15/16 Pro Max
    '750': 2,  // iPhone SE
    '828': 2,  // iPhone 11
    // iPad pixel widths → scale
    '2048': 2, // iPad Air/Pro 10.5"
    '2224': 2, // iPad Pro 11"
    '2388': 2, // iPad Pro 11" M-series
    '2732': 2, // iPad Pro 12.9"
  };

  const widthStr = String(pixelWidth);
  if (knownScales[widthStr]) {
    scaleFactor = knownScales[widthStr];
  }

  const pointWidth = Math.round(pixelWidth / scaleFactor);
  const pointHeight = Math.round(pixelHeight / scaleFactor);

  logger.debug('coordinate-mapper', 'Device screen dimensions', {
    pixelWidth,
    pixelHeight,
    scaleFactor,
    pointWidth,
    pointHeight,
  });

  return { pointWidth, pointHeight, scaleFactor, pixelWidth, pixelHeight };
}

// Cache screen mapping for 10 seconds to avoid repeated AppleScript + screenshot calls
let cachedMapping: ScreenMapping | null = null;
let cachedMappingTime = 0;
const CACHE_TTL_MS = 10000;

/**
 * Compute the full screen mapping from simulator points to macOS screen coordinates.
 * Cached for 10 seconds to improve performance during rapid interactions.
 */
export async function getScreenMapping(device: string): Promise<ScreenMapping> {
  const now = Date.now();
  if (cachedMapping && (now - cachedMappingTime) < CACHE_TTL_MS) {
    logger.debug('coordinate-mapper', 'Using cached screen mapping');
    return cachedMapping;
  }

  const [windowGeometry, screenDims] = await Promise.all([
    getSimulatorWindowGeometry(),
    getDeviceScreenDimensions(device),
  ]);

  const contentWidth = windowGeometry.windowWidth;
  const contentHeight = windowGeometry.windowHeight - TITLE_BAR_HEIGHT;

  const scaleX = contentWidth / screenDims.pointWidth;
  const scaleY = contentHeight / screenDims.pointHeight;

  const mapping: ScreenMapping = {
    windowGeometry,
    devicePointWidth: screenDims.pointWidth,
    devicePointHeight: screenDims.pointHeight,
    scaleFactor: screenDims.scaleFactor,
    titleBarHeight: TITLE_BAR_HEIGHT,
    contentWidth,
    contentHeight,
    scaleX,
    scaleY,
  };

  logger.debug('coordinate-mapper', 'Screen mapping computed', mapping);
  cachedMapping = mapping;
  cachedMappingTime = Date.now();
  return mapping;
}

/**
 * Convert simulator screen point coordinates to macOS absolute screen coordinates.
 */
export function simToMac(
  simX: number,
  simY: number,
  mapping: ScreenMapping
): { macX: number; macY: number } {
  const macX = mapping.windowGeometry.windowX + simX * mapping.scaleX;
  const macY =
    mapping.windowGeometry.windowY +
    mapping.titleBarHeight +
    simY * mapping.scaleY;

  logger.debug('coordinate-mapper', `Mapped sim(${simX},${simY}) → mac(${Math.round(macX)},${Math.round(macY)})`, {
    scaleX: mapping.scaleX.toFixed(3),
    scaleY: mapping.scaleY.toFixed(3),
  });

  return { macX, macY };
}

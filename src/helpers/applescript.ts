import { execCommand, runAppleScript } from './simctl.js';
import * as logger from './logger.js';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOUSE_HELPER = path.join(__dirname, '..', 'mouse-events');

/**
 * Bring Simulator.app to the foreground.
 */
export async function activateSimulator(): Promise<void> {
  await runAppleScript('tell application "Simulator" to activate', 'applescript');
  // Small delay for window to come to front
  await new Promise(resolve => setTimeout(resolve, 200));
}

/**
 * Tap at absolute macOS screen coordinates using the compiled Swift mouse-events helper.
 */
export async function tap(macX: number, macY: number): Promise<void> {
  const x = Math.round(macX);
  const y = Math.round(macY);
  logger.debug('applescript', `Tap at mac(${x},${y})`);
  await activateSimulator();
  await execCommand(MOUSE_HELPER, ['tap', String(x), String(y)], 'applescript:tap');
}

/**
 * Long press at absolute macOS screen coordinates.
 */
export async function longPress(macX: number, macY: number, durationMs: number = 1000): Promise<void> {
  const x = Math.round(macX);
  const y = Math.round(macY);
  logger.debug('applescript', `Long press at mac(${x},${y}) for ${durationMs}ms`);
  await activateSimulator();
  await execCommand(MOUSE_HELPER, ['longpress', String(x), String(y), String(durationMs)], 'applescript:longPress');
}

/**
 * Swipe from one point to another using the compiled Swift mouse-events helper.
 */
export async function swipe(
  startMacX: number,
  startMacY: number,
  endMacX: number,
  endMacY: number,
  durationMs: number = 300,
  steps: number = 20
): Promise<void> {
  logger.debug('applescript', `Swipe from mac(${Math.round(startMacX)},${Math.round(startMacY)}) to mac(${Math.round(endMacX)},${Math.round(endMacY)}) in ${durationMs}ms`);
  await activateSimulator();
  await execCommand(
    MOUSE_HELPER,
    ['swipe', String(Math.round(startMacX)), String(Math.round(startMacY)), String(Math.round(endMacX)), String(Math.round(endMacY)), String(steps), String(durationMs)],
    'applescript:swipe'
  );
}

/**
 * Type text into the currently focused field in Simulator.
 */
export async function typeText(text: string): Promise<void> {
  logger.debug('applescript', `Typing text: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`);

  await activateSimulator();

  // Escape for AppleScript string
  const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  const script = `
tell application "System Events"
  keystroke "${escaped}"
end tell
`;

  await runAppleScript(script, 'applescript:type');
}

/**
 * Press a special key with optional modifiers.
 */
export async function pressKey(keyName: string, modifiers: string[] = []): Promise<void> {
  logger.debug('applescript', `Press key: ${keyName}`, { modifiers });

  await activateSimulator();

  const keyCodeMap: Record<string, number> = {
    return: 36,
    enter: 76,
    escape: 53,
    delete: 51,
    forwarddelete: 117,
    tab: 48,
    space: 49,
    up: 126,
    down: 125,
    left: 123,
    right: 124,
    home: 115,
    end: 119,
    pageup: 116,
    pagedown: 121,
    f1: 122, f2: 120, f3: 99, f4: 118, f5: 96,
    f6: 97, f7: 98, f8: 100, f9: 101, f10: 109,
    f11: 103, f12: 111,
    volumeup: 72,
    volumedown: 73,
    mute: 74,
    // Browser/editor navigation
    '[': 33, ']': 30,
    '-': 27, '=': 24,
    ',': 43, '.': 47, '/': 44,
    ';': 41, "'": 39, '`': 50,
    '\\': 42,
  };

  const code = keyCodeMap[keyName.toLowerCase()];
  if (code === undefined) {
    throw new Error(
      `Unknown key: "${keyName}". Valid keys: ${Object.keys(keyCodeMap).join(', ')}`
    );
  }

  const modParts = modifiers.map(m => {
    switch (m.toLowerCase()) {
      case 'command': case 'cmd': return 'command down';
      case 'shift': return 'shift down';
      case 'option': case 'alt': return 'option down';
      case 'control': case 'ctrl': return 'control down';
      default: throw new Error(`Unknown modifier: "${m}". Valid: command, shift, option, control`);
    }
  });

  const modStr = modParts.length > 0 ? ` using {${modParts.join(', ')}}` : '';

  const script = `
tell application "System Events"
  key code ${code}${modStr}
end tell
`;

  await runAppleScript(script, 'applescript:pressKey');
}

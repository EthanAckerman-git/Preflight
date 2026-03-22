import { z } from 'zod';
import { resolveDevice } from '../helpers/simctl.js';
import { getScreenMapping, simToMac } from '../helpers/coordinate-mapper.js';
import * as applescript from '../helpers/applescript.js';
import * as idb from '../helpers/idb.js';
import * as logger from '../helpers/logger.js';

// --- tap ---

export const tapParams = {
  x: z.number().describe('X coordinate in simulator screen points'),
  y: z.number().describe('Y coordinate in simulator screen points'),
  deviceId: z.string().optional().describe('Device UDID, name, or "booted" (default: booted)'),
};

export async function handleTap(args: { x: number; y: number; deviceId?: string }) {
  const start = Date.now();
  const device = await resolveDevice(args.deviceId);

  if (await idb.checkIdbAvailable()) {
    await idb.idbTap(args.x, args.y, device);
    logger.toolEnd('simulator_tap', Date.now() - start, true);
    return {
      content: [{
        type: 'text' as const,
        text: `Tapped at (${args.x}, ${args.y}) via idb [cursor-free]`,
      }],
    };
  }

  // CGEvent fallback: map sim coords → macOS screen coords
  const mapping = await getScreenMapping(device);
  const { macX, macY } = simToMac(args.x, args.y, mapping);
  await applescript.tap(macX, macY);
  logger.toolEnd('simulator_tap', Date.now() - start, true);

  return {
    content: [{
      type: 'text' as const,
      text: `Tapped at (${args.x}, ${args.y}) → macOS (${Math.round(macX)}, ${Math.round(macY)}) [CGEvent fallback]`,
    }],
  };
}

// --- swipe ---

export const swipeParams = {
  startX: z.number().describe('Start X in simulator screen points. Use 1 to trigger iOS left-edge-swipe-back gesture (iOS recognizes edge touches within ~20pt of edge)'),
  startY: z.number().describe('Start Y in simulator screen points'),
  endX: z.number().describe('End X in simulator screen points'),
  endY: z.number().describe('End Y in simulator screen points'),
  durationMs: z.number().optional().describe('Swipe duration in milliseconds (default: 300). Use 400-600ms for edge-swipe-back'),
  deviceId: z.string().optional().describe('Device UDID, name, or "booted" (default: booted)'),
};

export async function handleSwipe(args: {
  startX: number; startY: number;
  endX: number; endY: number;
  durationMs?: number;
  deviceId?: string;
}) {
  const start = Date.now();
  const device = await resolveDevice(args.deviceId);
  const duration = args.durationMs || 300;

  if (await idb.checkIdbAvailable()) {
    await idb.idbSwipe(args.startX, args.startY, args.endX, args.endY, duration, device);
    logger.toolEnd('simulator_swipe', Date.now() - start, true);
    return {
      content: [{
        type: 'text' as const,
        text: `Swiped from (${args.startX},${args.startY}) to (${args.endX},${args.endY}) via idb [cursor-free]`,
      }],
    };
  }

  // CGEvent fallback
  const mapping = await getScreenMapping(device);
  const from = simToMac(args.startX, args.startY, mapping);
  const to = simToMac(args.endX, args.endY, mapping);
  await applescript.swipe(from.macX, from.macY, to.macX, to.macY, duration);
  logger.toolEnd('simulator_swipe', Date.now() - start, true);

  return {
    content: [{
      type: 'text' as const,
      text: `Swiped from (${args.startX},${args.startY}) to (${args.endX},${args.endY}) [CGEvent fallback]`,
    }],
  };
}

// --- long_press ---

export const longPressParams = {
  x: z.number().describe('X coordinate in simulator screen points'),
  y: z.number().describe('Y coordinate in simulator screen points'),
  durationMs: z.number().optional().describe('Press duration in milliseconds (default: 1000)'),
  deviceId: z.string().optional().describe('Device UDID, name, or "booted" (default: booted)'),
};

export async function handleLongPress(args: {
  x: number; y: number;
  durationMs?: number;
  deviceId?: string;
}) {
  const device = await resolveDevice(args.deviceId);
  const duration = args.durationMs || 1000;

  if (await idb.checkIdbAvailable()) {
    await idb.idbLongPress(args.x, args.y, duration, device);
    return {
      content: [{
        type: 'text' as const,
        text: `Long pressed at (${args.x}, ${args.y}) for ${duration}ms via idb [cursor-free]`,
      }],
    };
  }

  // CGEvent fallback
  const mapping = await getScreenMapping(device);
  const { macX, macY } = simToMac(args.x, args.y, mapping);
  await applescript.longPress(macX, macY, duration);

  return {
    content: [{
      type: 'text' as const,
      text: `Long pressed at (${args.x}, ${args.y}) for ${duration}ms [CGEvent fallback]`,
    }],
  };
}

// --- type_text ---

export const typeTextParams = {
  text: z.string().describe('Text to type into the currently focused field'),
  deviceId: z.string().optional().describe('Device UDID, name, or "booted" (default: booted)'),
};

export async function handleTypeText(args: { text: string; deviceId?: string }) {
  await resolveDevice(args.deviceId); // validate device is booted
  await applescript.typeText(args.text);

  return {
    content: [{
      type: 'text' as const,
      text: `Typed "${args.text.slice(0, 100)}${args.text.length > 100 ? '...' : ''}"`,
    }],
  };
}

// --- press_key ---

export const pressKeyParams = {
  key: z.string().describe('Key name: return, escape, delete, tab, space, up, down, left, right, home, end, pageup, pagedown, f1-f12'),
  modifiers: z.array(z.string()).optional().describe('Modifier keys: command, shift, option, control'),
  deviceId: z.string().optional().describe('Device UDID, name, or "booted" (default: booted)'),
};

export async function handlePressKey(args: {
  key: string;
  modifiers?: string[];
  deviceId?: string;
}) {
  await resolveDevice(args.deviceId);
  await applescript.pressKey(args.key, args.modifiers || []);

  const modStr = args.modifiers?.length ? `${args.modifiers.join('+')}+` : '';
  return {
    content: [{
      type: 'text' as const,
      text: `Pressed ${modStr}${args.key}`,
    }],
  };
}

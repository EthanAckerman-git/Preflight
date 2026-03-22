/**
 * Playwright-inspired tools for iOS Simulator.
 * Adds structured accessibility snapshots, element waiting, and element search
 * to match the workflow patterns of Playwright MCP for web automation.
 */

import { z } from 'zod';
import { resolveDevice } from '../helpers/simctl.js';
import * as idb from '../helpers/idb.js';
import * as logger from '../helpers/logger.js';

// --- snapshot (like Playwright's browser_snapshot) ---
// Returns a structured, LLM-friendly accessibility tree.
// Preferred over screenshots for understanding page structure.

export const snapshotParams = {
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleSnapshot(args: { deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);

  if (!(await idb.checkIdbAvailable())) {
    return {
      content: [{
        type: 'text' as const,
        text: 'Snapshot requires idb for the full iOS accessibility tree. Install: brew tap facebook/fb && brew install idb-companion && pip3 install fb-idb\n\nUse simulator_accessibility_audit as a fallback (AppleScript-based, less detail).',
      }],
    };
  }

  const raw = await idb.idbDescribeAll(device);

  // Parse idb output into structured format
  try {
    const elements = JSON.parse(raw);
    if (Array.isArray(elements)) {
      const formatted = formatAccessibilityTree(elements, 0);
      return {
        content: [{
          type: 'text' as const,
          text: `iOS Accessibility Snapshot (${elements.length} root elements):\n\n${formatted}\n\n---\nUse coordinates from the snapshot to interact: simulator_tap, simulator_swipe, etc.`,
        }],
      };
    }
  } catch { /* raw output isn't JSON, return as-is */ }

  // Fallback: return raw idb output
  const lines = raw.split('\n').filter((l: string) => l.trim());
  return {
    content: [{
      type: 'text' as const,
      text: `iOS Accessibility Snapshot (${lines.length} elements):\n\n${raw}\n\n---\nUse coordinates from the snapshot to interact: simulator_tap, simulator_swipe, etc.`,
    }],
  };
}

/**
 * Format parsed accessibility elements into a readable tree.
 */
function formatAccessibilityTree(elements: any[], depth: number): string {
  const indent = '  '.repeat(depth);
  const lines: string[] = [];

  for (const el of elements) {
    const role = el.role || el.AXRole || '?';
    const label = el.AXLabel || el.label || el.description || '';
    const value = el.AXValue || el.value || '';
    const frame = el.frame || el.AXFrame;

    let line = `${indent}${role}`;
    if (label) line += ` "${label}"`;
    if (value && value !== label) line += ` val="${value}"`;
    if (frame) {
      if (typeof frame === 'object') {
        line += ` @(${Math.round(frame.x)},${Math.round(frame.y)}) ${Math.round(frame.width)}x${Math.round(frame.height)}`;
      } else if (typeof frame === 'string') {
        line += ` ${frame}`;
      }
    }

    lines.push(line);

    // Recurse into children
    const children = el.children || el.AXChildren;
    if (Array.isArray(children) && children.length > 0) {
      lines.push(formatAccessibilityTree(children, depth + 1));
    }
  }

  return lines.join('\n');
}

// --- wait_for_element (like Playwright's browser_wait_for) ---
// Polls the accessibility tree until an element matching the criteria appears.

export const waitForElementParams = {
  label: z.string().optional().describe('Wait for element with this accessibility label (case-insensitive partial match)'),
  role: z.string().optional().describe('Wait for element with this role (e.g., "Button", "TextField", "StaticText")'),
  text: z.string().optional().describe('Wait for element containing this text in label or value'),
  timeoutMs: z.number().optional().describe('Max wait time in milliseconds (default: 10000)'),
  pollIntervalMs: z.number().optional().describe('How often to check in milliseconds (default: 500)'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleWaitForElement(args: {
  label?: string;
  role?: string;
  text?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
  deviceId?: string;
}) {
  if (!args.label && !args.role && !args.text) {
    return {
      content: [{
        type: 'text' as const,
        text: 'Provide at least one search criteria: label, role, or text.',
      }],
      isError: true,
    };
  }

  const device = await resolveDevice(args.deviceId);

  if (!(await idb.checkIdbAvailable())) {
    return {
      content: [{
        type: 'text' as const,
        text: 'wait_for_element requires idb. Install: brew tap facebook/fb && brew install idb-companion && pip3 install fb-idb',
      }],
    };
  }

  const timeout = args.timeoutMs || 10000;
  const interval = args.pollIntervalMs || 500;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const raw = await idb.idbDescribeAll(device);
      const searchStr = raw.toLowerCase();

      let found = true;
      if (args.label && !searchStr.includes(args.label.toLowerCase())) found = false;
      if (args.role && !searchStr.includes(args.role.toLowerCase())) found = false;
      if (args.text && !searchStr.includes(args.text.toLowerCase())) found = false;

      if (found) {
        const elapsed = Date.now() - startTime;
        return {
          content: [{
            type: 'text' as const,
            text: `Element found after ${elapsed}ms. Criteria: ${JSON.stringify({ label: args.label, role: args.role, text: args.text })}`,
          }],
        };
      }
    } catch (err) {
      logger.debug('tool:waitForElement', `Poll error: ${(err as Error).message}`);
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return {
    content: [{
      type: 'text' as const,
      text: `Timeout after ${timeout}ms. Element not found. Criteria: ${JSON.stringify({ label: args.label, role: args.role, text: args.text })}`,
    }],
    isError: true,
  };
}

// --- element_exists ---
// Quick boolean check: does an element matching criteria exist on screen right now?

export const elementExistsParams = {
  label: z.string().optional().describe('Search for element with this accessibility label (case-insensitive partial match)'),
  role: z.string().optional().describe('Search for element with this role'),
  text: z.string().optional().describe('Search for element containing this text'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleElementExists(args: {
  label?: string;
  role?: string;
  text?: string;
  deviceId?: string;
}) {
  if (!args.label && !args.role && !args.text) {
    return {
      content: [{
        type: 'text' as const,
        text: 'Provide at least one search criteria: label, role, or text.',
      }],
      isError: true,
    };
  }

  const device = await resolveDevice(args.deviceId);

  if (!(await idb.checkIdbAvailable())) {
    return {
      content: [{
        type: 'text' as const,
        text: 'element_exists requires idb. Install: brew tap facebook/fb && brew install idb-companion && pip3 install fb-idb',
      }],
    };
  }

  try {
    const raw = await idb.idbDescribeAll(device);
    const searchStr = raw.toLowerCase();

    let found = true;
    if (args.label && !searchStr.includes(args.label.toLowerCase())) found = false;
    if (args.role && !searchStr.includes(args.role.toLowerCase())) found = false;
    if (args.text && !searchStr.includes(args.text.toLowerCase())) found = false;

    return {
      content: [{
        type: 'text' as const,
        text: found
          ? `true — Element exists. Criteria: ${JSON.stringify({ label: args.label, role: args.role, text: args.text })}`
          : `false — Element not found. Criteria: ${JSON.stringify({ label: args.label, role: args.role, text: args.text })}`,
      }],
    };
  } catch (err) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error checking element: ${(err as Error).message}`,
      }],
      isError: true,
    };
  }
}

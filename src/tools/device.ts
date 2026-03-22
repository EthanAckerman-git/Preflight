import { z } from 'zod';
import { execSimctl, listDevices, resolveDevice } from '../helpers/simctl.js';
import * as logger from '../helpers/logger.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// --- list_devices ---

export const listDevicesParams = {
  filter: z.enum(['available', 'booted', 'all']).optional().describe('Filter devices (default: all)'),
};

export async function handleListDevices(args: { filter?: string }) {
  const filter = (args.filter || 'all') as 'available' | 'booted' | 'all';
  const devices = await listDevices(filter);

  const lines = devices.map(d => {
    const runtime = d.runtime
      .replace(/^com\.apple\.CoreSimulator\.SimRuntime\./, '')
      .replace(/-/g, ' ');
    return `${d.name} | ${d.udid} | ${d.state} | ${runtime}`;
  });

  return {
    content: [{
      type: 'text' as const,
      text: devices.length === 0
        ? `No ${filter === 'all' ? '' : filter + ' '}devices found.`
        : `Found ${devices.length} device(s):\n\nName | UDID | State | Runtime\n---|---|---|---\n${lines.join('\n')}`,
    }],
  };
}

// --- boot ---

export const bootParams = {
  deviceId: z.string().describe('Device UDID or name to boot'),
  waitForBoot: z.boolean().optional().describe('Wait until device is fully booted before returning (default: true)'),
};

export async function handleBoot(args: { deviceId: string; waitForBoot?: boolean }) {
  const devices = await listDevices();
  const match = devices.find(
    d => d.name.toLowerCase() === args.deviceId.toLowerCase() ||
         d.udid === args.deviceId
  );

  if (!match) {
    const available = devices.filter(d => d.isAvailable && d.runtime.includes('iOS'));
    const suggestions = available.slice(0, 5).map(d => `  - ${d.name}`).join('\n');
    throw new Error(`Device "${args.deviceId}" not found.\n\nAvailable iOS devices:\n${suggestions}`);
  }

  if (match.state === 'Booted') {
    return { content: [{ type: 'text' as const, text: `${match.name} is already booted.` }] };
  }

  await execSimctl(['boot', match.udid], 'tool:boot');

  // Open Simulator.app so the window appears
  try {
    await execFileAsync('open', ['-a', 'Simulator']);
  } catch { /* not critical */ }

  // Wait for boot to complete (default: true)
  const shouldWait = args.waitForBoot !== false;
  if (shouldWait) {
    const maxWaitMs = 60000;
    const startTime = Date.now();
    let booted = false;

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(r => setTimeout(r, 2000));
      const updated = await listDevices('booted');
      if (updated.some(d => d.udid === match.udid)) {
        booted = true;
        break;
      }
    }

    if (!booted) {
      return {
        content: [{
          type: 'text' as const,
          text: `Booted ${match.name} but it didn't reach Booted state within 60s. It may still be starting up.`,
        }],
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: `Booted ${match.name} (${match.udid}) — ready. Simulator.app is open.`,
      }],
    };
  }

  return {
    content: [{
      type: 'text' as const,
      text: `Booted ${match.name} (${match.udid}). Simulator.app should be opening.`,
    }],
  };
}

// --- shutdown ---

export const shutdownParams = {
  deviceId: z.string().optional().describe('Device UDID, name, or "booted" (default: booted)'),
};

export async function handleShutdown(args: { deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  await execSimctl(['shutdown', device], 'tool:shutdown');
  return { content: [{ type: 'text' as const, text: `Device shut down successfully.` }] };
}

// --- erase ---

export const eraseParams = {
  deviceId: z.string().describe('Device UDID or name to erase (factory reset)'),
};

export async function handleErase(args: { deviceId: string }) {
  const device = await resolveDevice(args.deviceId);
  await execSimctl(['erase', device], 'tool:erase');
  return { content: [{ type: 'text' as const, text: `Device erased (factory reset) successfully.` }] };
}

// --- open_url ---

export const openUrlParams = {
  url: z.string().describe('URL or deep link to open (e.g., "https://example.com" or "myapp://path")'),
  deviceId: z.string().optional().describe('Device UDID, name, or "booted" (default: booted)'),
};

export async function handleOpenUrl(args: { url: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  await execSimctl(['openurl', device, args.url], 'tool:openUrl');
  return { content: [{ type: 'text' as const, text: `Opened URL: ${args.url}` }] };
}

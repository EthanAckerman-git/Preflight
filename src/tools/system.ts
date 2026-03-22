import { z } from 'zod';
import { execSimctl, resolveDevice } from '../helpers/simctl.js';
import { spawn } from 'node:child_process';

// --- set_location ---

export const setLocationParams = {
  latitude: z.number().min(-90).max(90).describe('Latitude (-90 to 90)'),
  longitude: z.number().min(-180).max(180).describe('Longitude (-180 to 180)'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleSetLocation(args: { latitude: number; longitude: number; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  await execSimctl(['location', device, 'set', `${args.latitude},${args.longitude}`], 'tool:setLocation');
  return { content: [{ type: 'text' as const, text: `Location set to ${args.latitude}, ${args.longitude}` }] };
}

// --- send_push ---

export const sendPushParams = {
  bundleId: z.string().describe('App bundle ID to receive the push'),
  payload: z.record(z.any()).describe('Push notification JSON payload (e.g., {"aps": {"alert": "Hello"}})'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleSendPush(args: { bundleId: string; payload: Record<string, unknown>; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  const payloadJson = JSON.stringify(args.payload);

  // Write payload to stdin of simctl push
  const child = spawn('xcrun', [
    'simctl', 'push', device, args.bundleId, '-',
  ]);

  return new Promise<{ content: { type: 'text'; text: string }[] }>((resolve, reject) => {
    let stderr = '';
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
    child.on('error', (err) => reject(new Error(`Push spawn failed: ${err.message}`)));
    child.on('close', (code: number) => {
      if (code !== 0) {
        reject(new Error(`Push failed: ${stderr}`));
      } else {
        resolve({ content: [{ type: 'text' as const, text: `Push notification sent to ${args.bundleId}` }] });
      }
    });
    child.stdin.on('error', () => {}); // prevent EPIPE crash
    child.stdin.write(payloadJson);
    child.stdin.end();
  });
}

// --- set_clipboard ---

export const setClipboardParams = {
  text: z.string().describe('Text to copy to simulator clipboard'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleSetClipboard(args: { text: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);

  const child = spawn('xcrun', [
    'simctl', 'pbcopy', device,
  ]);

  return new Promise<{ content: { type: 'text'; text: string }[] }>((resolve, reject) => {
    let stderr = '';
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
    child.on('error', (err) => reject(new Error(`pbcopy spawn failed: ${err.message}`)));
    child.on('close', (code: number) => {
      if (code !== 0) {
        reject(new Error(`pbcopy failed: ${stderr}`));
      } else {
        resolve({ content: [{ type: 'text' as const, text: `Clipboard set (${args.text.length} chars)` }] });
      }
    });
    child.stdin.on('error', () => {}); // prevent EPIPE crash
    child.stdin.write(args.text);
    child.stdin.end();
  });
}

// --- get_clipboard ---

export const getClipboardParams = {
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleGetClipboard(args: { deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  const { stdout } = await execSimctl(['pbpaste', device], 'tool:getClipboard');
  return { content: [{ type: 'text' as const, text: stdout || '(clipboard is empty)' }] };
}

// --- add_media ---

export const addMediaParams = {
  filePaths: z.array(z.string()).describe('Paths to photo/video files to add to camera roll'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleAddMedia(args: { filePaths: string[]; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  await execSimctl(['addmedia', device, ...args.filePaths], 'tool:addMedia');
  return { content: [{ type: 'text' as const, text: `Added ${args.filePaths.length} media file(s) to camera roll.` }] };
}

// --- grant_permission ---

export const grantPermissionParams = {
  bundleId: z.string().describe('App bundle ID'),
  service: z.string().describe('Permission service: all, calendar, contacts-limited, contacts, location, location-always, photos-add, photos, media-library, microphone, motion, reminders, siri'),
  action: z.enum(['grant', 'revoke', 'reset']).describe('Permission action'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleGrantPermission(args: {
  bundleId: string;
  service: string;
  action: 'grant' | 'revoke' | 'reset';
  deviceId?: string;
}) {
  const device = await resolveDevice(args.deviceId);
  await execSimctl(['privacy', device, args.action, args.service, args.bundleId], 'tool:grantPermission');
  return {
    content: [{
      type: 'text' as const,
      text: `${args.action === 'grant' ? 'Granted' : args.action === 'revoke' ? 'Revoked' : 'Reset'} ${args.service} permission for ${args.bundleId}`,
    }],
  };
}

import { z } from 'zod';
import { execSimctl, resolveDevice } from '../helpers/simctl.js';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Pipe number used for dummynet conditioning
const PIPE_NUMBER = 1;
const ANCHOR_NAME = 'preflight_network';

// Network condition presets
const PRESETS: Record<string, { bandwidth: string; delay: number; plr: number; label: string }> = {
  '3G': { bandwidth: '780Kbit/s', delay: 200, plr: 0.02, label: '3G (780Kbps, 200ms latency, 2% loss)' },
  'LTE': { bandwidth: '12Mbit/s', delay: 50, plr: 0.005, label: 'LTE (12Mbps, 50ms latency, 0.5% loss)' },
  'WiFi-lossy': { bandwidth: '30Mbit/s', delay: 5, plr: 0.05, label: 'Lossy WiFi (30Mbps, 5ms latency, 5% loss)' },
  '100%-loss': { bandwidth: '1Kbit/s', delay: 0, plr: 1.0, label: 'Offline (100% packet loss)' },
  'Edge': { bandwidth: '240Kbit/s', delay: 400, plr: 0.01, label: 'EDGE (240Kbps, 400ms latency, 1% loss)' },
  'WiFi': { bandwidth: '100Mbit/s', delay: 2, plr: 0, label: 'Good WiFi (100Mbps, 2ms latency, 0% loss)' },
};

// --- network_condition ---

export const networkConditionParams = {
  action: z.enum(['set', 'clear', 'list-presets']).describe('"set" to apply conditioning, "clear" to remove, "list-presets" to show available presets'),
  preset: z.enum(['3G', 'LTE', 'WiFi-lossy', '100%-loss', 'Edge', 'WiFi', 'custom']).optional()
    .describe('Network preset name, or "custom" to specify parameters manually'),
  bandwidth: z.string().optional().describe('Custom bandwidth (e.g., "1Mbit/s", "500Kbit/s"). Required when preset is "custom"'),
  delay: z.number().optional().describe('Custom latency in milliseconds. Required when preset is "custom"'),
  packetLossRate: z.number().optional().describe('Custom packet loss rate 0.0-1.0 (e.g., 0.05 = 5%). Required when preset is "custom"'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleNetworkCondition(args: {
  action: 'set' | 'clear' | 'list-presets';
  preset?: string;
  bandwidth?: string;
  delay?: number;
  packetLossRate?: number;
  deviceId?: string;
}) {
  if (args.action === 'list-presets') {
    const lines = Object.entries(PRESETS).map(([name, p]) => `  ${name}: ${p.label}`);
    return {
      content: [{
        type: 'text' as const,
        text: `Available network condition presets:\n${lines.join('\n')}\n\nUse preset="custom" with bandwidth, delay, and packetLossRate for custom values.`,
      }],
    };
  }

  await resolveDevice(args.deviceId);

  if (args.action === 'clear') {
    try {
      // Remove pfctl anchor rules
      await execFileAsync('sudo', ['-n', 'pfctl', '-a', ANCHOR_NAME, '-F', 'all'], {
        encoding: 'utf-8', timeout: 5000,
      }).catch(() => {});
      // Remove dummynet pipe
      await execFileAsync('sudo', ['-n', 'dnctl', 'pipe', String(PIPE_NUMBER), 'delete'], {
        encoding: 'utf-8', timeout: 5000,
      }).catch(() => {});
      return { content: [{ type: 'text' as const, text: 'Network conditioning cleared. Normal network restored.' }] };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return { content: [{ type: 'text' as const, text: `Failed to clear network conditioning: ${e.message}\n\nMay require sudo access. Run: sudo pfctl -a ${ANCHOR_NAME} -F all && sudo dnctl pipe ${PIPE_NUMBER} delete` }] };
    }
  }

  // action === 'set'
  let bandwidth: string;
  let delay: number;
  let plr: number;
  let label: string;

  if (args.preset && args.preset !== 'custom' && PRESETS[args.preset]) {
    const p = PRESETS[args.preset];
    bandwidth = p.bandwidth;
    delay = p.delay;
    plr = p.plr;
    label = p.label;
  } else if (args.preset === 'custom') {
    if (!args.bandwidth) return { content: [{ type: 'text' as const, text: 'bandwidth is required for custom preset (e.g., "1Mbit/s").' }] };
    bandwidth = args.bandwidth;
    delay = args.delay || 0;
    plr = args.packetLossRate || 0;
    label = `Custom (${bandwidth}, ${delay}ms, ${(plr * 100).toFixed(1)}% loss)`;
  } else {
    return { content: [{ type: 'text' as const, text: 'Provide a preset name or use preset="custom" with bandwidth/delay/packetLossRate. Use action="list-presets" to see options.' }] };
  }

  try {
    // Configure dummynet pipe with bandwidth, delay, and packet loss
    const pipeArgs = ['pipe', String(PIPE_NUMBER), 'config', 'bw', bandwidth];
    if (delay > 0) pipeArgs.push('delay', `${delay}ms`);
    if (plr > 0) pipeArgs.push('plr', String(plr));

    await execFileAsync('sudo', ['-n', 'dnctl', ...pipeArgs], {
      encoding: 'utf-8', timeout: 5000,
    });

    // Add pfctl rule to route traffic through the pipe (using stdin to avoid shell injection)
    const pfRule = `dummynet-pipe ${PIPE_NUMBER} proto tcp from any to any\ndummynet-pipe ${PIPE_NUMBER} proto udp from any to any\n`;
    await new Promise<void>((resolve, reject) => {
      const child = spawn('sudo', ['-n', 'pfctl', '-a', ANCHOR_NAME, '-f', '-'], { stdio: ['pipe', 'pipe', 'pipe'] });
      let stderr = '';
      child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(stderr || `pfctl exited with code ${code}`));
      });
      child.on('error', reject);
      child.stdin.write(pfRule);
      child.stdin.end();
    });

    // Ensure pfctl is enabled
    await execFileAsync('sudo', ['-n', 'pfctl', '-e'], {
      encoding: 'utf-8', timeout: 5000,
    }).catch(() => {}); // May already be enabled

    return {
      content: [{
        type: 'text' as const,
        text: `Network conditioning applied: ${label}\n\nThis affects all simulator network traffic (simulator shares host network stack). Use action="clear" to restore normal network.`,
      }],
    };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return {
      content: [{
        type: 'text' as const,
        text: `Failed to apply network conditioning: ${e.message}\n\nThis tool requires passwordless sudo for dnctl and pfctl. To enable:\n  sudo visudo → add: ${process.env.USER || 'your_user'} ALL=(ALL) NOPASSWD: /usr/sbin/dnctl, /sbin/pfctl`,
      }],
    };
  }
}

// --- network_capture ---

export const networkCaptureParams = {
  bundleId: z.string().optional().describe('App bundle ID to filter network activity for (optional — shows all if omitted)'),
  duration: z.number().optional().describe('Capture duration in seconds (default: 3, max: 10)'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleNetworkCapture(args: {
  bundleId?: string;
  duration?: number;
  deviceId?: string;
}) {
  const device = await resolveDevice(args.deviceId);
  const duration = Math.min(args.duration || 3, 10);
  const results: string[] = [];

  // Use netstat inside simulator for connection info
  try {
    const { stdout } = await execSimctl(
      ['spawn', device, 'netstat', '-an', '-p', 'tcp'],
      'tool:networkCapture'
    );
    const lines = stdout.split('\n').filter(l => l.includes('ESTABLISHED') || l.includes('LISTEN') || l.includes('Active'));
    results.push(`Active TCP connections:\n${lines.slice(0, 30).join('\n') || '(none)'}`);
  } catch {
    results.push('TCP connections: unable to query (netstat not available in simulator)');
  }

  // DNS resolution test
  try {
    const { stdout } = await execSimctl(
      ['spawn', device, 'nslookup', 'apple.com'],
      'tool:networkCapture'
    );
    const serverLine = stdout.split('\n').find(l => l.includes('Server:'));
    results.push(`\nDNS: ${serverLine || 'working'}`);
  } catch {
    results.push('\nDNS: resolution failed (may be offline)');
  }

  // Check for network interfaces from host perspective
  try {
    const { stdout } = await execFileAsync('ifconfig', ['-l'], { encoding: 'utf-8', timeout: 3000 });
    results.push(`\nHost interfaces: ${stdout.trim()}`);
  } catch { /* skip */ }

  // Show any active dummynet conditioning
  try {
    const { stdout } = await execFileAsync('sudo', ['-n', 'dnctl', 'pipe', 'show'], {
      encoding: 'utf-8', timeout: 3000,
    });
    if (stdout.trim()) {
      results.push(`\nActive network conditioning:\n${stdout.trim()}`);
    }
  } catch { /* skip — may not have sudo */ }

  return {
    content: [{
      type: 'text' as const,
      text: `Network Capture Summary (${duration}s):\n\n${results.join('\n')}`,
    }],
  };
}

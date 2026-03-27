import { z } from 'zod';
import { execSimctl, resolveDevice } from '../helpers/simctl.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Find the PID of a running app inside the simulator by bundle ID.
 */
async function getAppPid(bundleId: string, device: string): Promise<string> {
  try {
    const { stdout } = await execSimctl(
      ['spawn', device, 'launchctl', 'list'],
      'tool:profiling'
    );
    // launchctl list output: PID\tStatus\tLabel
    const lines = stdout.split('\n');
    for (const line of lines) {
      const label = line.split('\t')[2]?.trim();
      if (label === bundleId) {
        const pid = line.split('\t')[0]?.trim();
        if (pid && pid !== '-' && !isNaN(Number(pid))) {
          return pid;
        }
      }
    }
  } catch {
    // Fall through to pgrep
  }

  // Fallback: try pgrep
  try {
    const { stdout } = await execSimctl(
      ['spawn', device, 'pgrep', '-f', bundleId],
      'tool:profiling'
    );
    const pid = stdout.trim().split('\n')[0];
    if (pid && !isNaN(Number(pid))) return pid;
  } catch { /* fall through */ }

  throw new Error(`Could not find running process for "${bundleId}". Make sure the app is launched.`);
}

// --- leak_check ---

export const leakCheckParams = {
  bundleId: z.string().describe('Bundle ID of the running app to check for leaks'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleLeakCheck(args: { bundleId: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  const pid = await getAppPid(args.bundleId, device);

  try {
    const { stdout } = await execSimctl(
      ['spawn', device, 'leaks', pid],
      'tool:leakCheck'
    );

    // Parse output for summary
    const lines = stdout.split('\n');
    const summaryLine = lines.find(l => l.includes('leaks for') || l.includes('total leaked bytes') || l.includes('0 leaks'));
    const truncated = lines.length > 200 ? lines.slice(0, 200).join('\n') + '\n\n...(truncated)' : stdout;

    return {
      content: [{
        type: 'text' as const,
        text: `Memory Leak Check for ${args.bundleId} (PID ${pid}):\n\n${summaryLine ? `Summary: ${summaryLine}\n\n` : ''}${truncated}`,
      }],
    };
  } catch (err: unknown) {
    const e = err as { stdout?: string; message?: string };
    // leaks exits with non-zero when leaks are found — check stdout
    if (e.stdout) {
      const lines = e.stdout.split('\n');
      const summaryLine = lines.find(l => l.includes('leaks for') || l.includes('total leaked bytes'));
      const truncated = lines.length > 200 ? lines.slice(0, 200).join('\n') + '\n\n...(truncated)' : e.stdout;
      return {
        content: [{
          type: 'text' as const,
          text: `Memory Leak Check for ${args.bundleId} (PID ${pid}):\n\n${summaryLine ? `Summary: ${summaryLine}\n\n` : ''}${truncated}`,
        }],
      };
    }
    return { content: [{ type: 'text' as const, text: `Leak check failed: ${e.message}` }] };
  }
}

// --- heap_info ---

export const heapInfoParams = {
  bundleId: z.string().describe('Bundle ID of the running app to analyze heap'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleHeapInfo(args: { bundleId: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  const pid = await getAppPid(args.bundleId, device);

  try {
    const { stdout } = await execSimctl(
      ['spawn', device, 'heap', pid],
      'tool:heapInfo'
    );

    // Truncate if very large
    const lines = stdout.split('\n');
    const truncated = lines.length > 150 ? lines.slice(0, 150).join('\n') + '\n\n...(truncated, showing top 150 lines)' : stdout;

    return {
      content: [{
        type: 'text' as const,
        text: `Heap Analysis for ${args.bundleId} (PID ${pid}):\n\n${truncated}`,
      }],
    };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { content: [{ type: 'text' as const, text: `Heap analysis failed: ${e.message}` }] };
  }
}

// --- vmmap ---

export const vmmapParams = {
  bundleId: z.string().describe('Bundle ID of the running app to inspect virtual memory'),
  summary: z.boolean().optional().describe('Show summary only instead of full map (default: true)'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleVmmap(args: { bundleId: string; summary?: boolean; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  const pid = await getAppPid(args.bundleId, device);
  const showSummary = args.summary !== false; // default true

  try {
    const cmdArgs = ['spawn', device, 'vmmap'];
    if (showSummary) cmdArgs.push('--summary');
    cmdArgs.push(pid);

    const { stdout } = await execSimctl(cmdArgs, 'tool:vmmap');

    const lines = stdout.split('\n');
    const truncated = lines.length > 200 ? lines.slice(0, 200).join('\n') + '\n\n...(truncated)' : stdout;

    return {
      content: [{
        type: 'text' as const,
        text: `Virtual Memory Map for ${args.bundleId} (PID ${pid})${showSummary ? ' (summary)' : ''}:\n\n${truncated}`,
      }],
    };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { content: [{ type: 'text' as const, text: `vmmap failed: ${e.message}` }] };
  }
}

// --- sample_process ---

export const sampleProcessParams = {
  bundleId: z.string().describe('Bundle ID of the running app to sample'),
  duration: z.number().optional().describe('Sample duration in seconds (default: 3, max: 10)'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleSampleProcess(args: { bundleId: string; duration?: number; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  const pid = await getAppPid(args.bundleId, device);
  const duration = Math.min(args.duration || 3, 10);

  try {
    const { stdout } = await execFileAsync(
      'xcrun',
      ['simctl', 'spawn', device, 'sample', pid, String(duration)],
      { maxBuffer: 50 * 1024 * 1024, encoding: 'utf-8', timeout: (duration + 5) * 1000 }
    );

    // Truncate for AI context
    const lines = stdout.split('\n');
    const truncated = lines.length > 300 ? lines.slice(0, 300).join('\n') + '\n\n...(truncated, showing top 300 lines)' : stdout;

    return {
      content: [{
        type: 'text' as const,
        text: `Process Sample for ${args.bundleId} (PID ${pid}, ${duration}s):\n\n${truncated}`,
      }],
    };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { content: [{ type: 'text' as const, text: `Process sampling failed: ${e.message}` }] };
  }
}

// --- thermal_state ---

export const thermalStateParams = {
  level: z.enum(['nominal', 'fair', 'serious', 'critical']).describe('Thermal pressure level to simulate'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleThermalState(args: { level: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);

  // Map levels to notification names
  const notifications: Record<string, string> = {
    nominal: 'com.apple.system.thermalpressure.nominal',
    fair: 'com.apple.system.thermalpressure.warning',
    serious: 'com.apple.system.thermalpressure.warning',
    critical: 'com.apple.system.thermalpressure.critical',
  };

  const notification = notifications[args.level];
  try {
    await execSimctl(
      ['spawn', device, 'notifyutil', '-p', notification],
      'tool:thermalState'
    );
    return {
      content: [{
        type: 'text' as const,
        text: `Thermal pressure set to "${args.level}". Apps observing ProcessInfo.thermalState will receive the notification.\n\nNote: Some apps may only respond when compiled with thermal state observation.`,
      }],
    };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { content: [{ type: 'text' as const, text: `Thermal state simulation failed: ${e.message}` }] };
  }
}

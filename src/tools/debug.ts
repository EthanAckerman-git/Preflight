import { z } from 'zod';
import { execSimctl, execCommand, resolveDevice, runAppleScript } from '../helpers/simctl.js';
import * as idb from '../helpers/idb.js';
import * as logger from '../helpers/logger.js';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
import { execFile, spawn, ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { getScreenMapping } from '../helpers/coordinate-mapper.js';

const execFileAsync = promisify(execFile);

// Active log stream processes
const activeStreams = new Map<string, { process: ChildProcess; buffer: string[]; maxLines: number }>();

// --- get_logs ---

export const getLogsParams = {
  process: z.string().optional().describe('Filter by process name (e.g., "MyApp", "SpringBoard")'),
  subsystem: z.string().optional().describe('Filter by log subsystem (e.g., "com.apple.UIKit")'),
  category: z.string().optional().describe('Filter by log category'),
  level: z.enum(['debug', 'info', 'default', 'error', 'fault']).optional().describe('Minimum log level (default: default)'),
  since: z.string().optional().describe('Time range: "5m", "1h", "30s", or ISO date (default: "1m")'),
  messageContains: z.string().optional().describe('Filter messages containing this text'),
  limit: z.number().optional().describe('Max number of log lines to return (default: 100)'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleGetLogs(args: {
  process?: string;
  subsystem?: string;
  category?: string;
  level?: string;
  since?: string;
  messageContains?: string;
  limit?: number;
  deviceId?: string;
}) {
  const device = await resolveDevice(args.deviceId);
  const predicateParts: string[] = [];

  // Sanitize predicate values — escape quotes to prevent predicate syntax breaking
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  if (args.process) predicateParts.push(`processImagePath CONTAINS "${esc(args.process)}"`);
  if (args.subsystem) predicateParts.push(`subsystem == "${esc(args.subsystem)}"`);
  if (args.category) predicateParts.push(`category == "${esc(args.category)}"`);
  if (args.messageContains) predicateParts.push(`eventMessage CONTAINS "${esc(args.messageContains)}"`);

  const cmdArgs = ['simctl', 'spawn', device, 'log', 'show'];

  if (args.level) cmdArgs.push('--level', args.level);
  cmdArgs.push('--last', args.since || '1m');
  cmdArgs.push('--style', 'compact');

  if (predicateParts.length > 0) {
    cmdArgs.push('--predicate', predicateParts.join(' AND '));
  }

  logger.debug('tool:getLogs', `Running: xcrun ${cmdArgs.join(' ')}`);

  try {
    const result = await execFileAsync('xcrun', cmdArgs, {
      maxBuffer: 50 * 1024 * 1024,
      encoding: 'utf-8',
      timeout: 30000,
    });

    let lines = result.stdout.split('\n').filter(l => l.trim());
    const total = lines.length;
    const limit = args.limit || 100;
    if (lines.length > limit) {
      lines = lines.slice(-limit); // most recent
    }

    return {
      content: [{
        type: 'text' as const,
        text: `Device logs (showing ${lines.length} of ${total} entries, last ${args.since || '1m'}):\n\n${lines.join('\n')}`,
      }],
    };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return {
      content: [{
        type: 'text' as const,
        text: `Log query returned: ${e.stdout?.split('\n').filter(l => l.trim()).slice(-50).join('\n') || e.stderr || e.message || 'no output'}`,
      }],
    };
  }
}

// --- stream_logs ---

export const streamLogsParams = {
  action: z.enum(['start', 'read', 'stop']).describe('"start" begins streaming, "read" returns current buffer, "stop" ends the stream'),
  process: z.string().optional().describe('Filter by process name'),
  level: z.enum(['debug', 'info', 'default', 'error', 'fault']).optional().describe('Minimum log level'),
  bufferSize: z.number().optional().describe('Max lines to keep in buffer (default: 200)'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleStreamLogs(args: {
  action: 'start' | 'read' | 'stop';
  process?: string;
  level?: string;
  bufferSize?: number;
  deviceId?: string;
}) {
  const device = await resolveDevice(args.deviceId);
  const streamKey = `${device}-${args.process || 'all'}`;

  if (args.action === 'stop') {
    const stream = activeStreams.get(streamKey);
    if (stream) {
      stream.process.kill();
      activeStreams.delete(streamKey);
      return { content: [{ type: 'text' as const, text: 'Log stream stopped.' }] };
    }
    return { content: [{ type: 'text' as const, text: 'No active stream to stop.' }] };
  }

  if (args.action === 'read') {
    const stream = activeStreams.get(streamKey);
    if (!stream) {
      return { content: [{ type: 'text' as const, text: 'No active stream. Use action="start" first.' }] };
    }
    const lines = stream.buffer.join('\n');
    return {
      content: [{
        type: 'text' as const,
        text: `Live log buffer (${stream.buffer.length} lines):\n\n${lines || '(no output yet)'}`,
      }],
    };
  }

  // action === 'start'
  const existing = activeStreams.get(streamKey);
  if (existing) {
    existing.process.kill();
    activeStreams.delete(streamKey);
  }

  const cmdArgs = ['simctl', 'spawn', device, 'log', 'stream', '--style', 'compact'];
  if (args.level) cmdArgs.push('--level', args.level);
  if (args.process) cmdArgs.push('--predicate', `processImagePath CONTAINS "${args.process}"`);

  const child = spawn('xcrun', cmdArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
  const maxLines = args.bufferSize || 200;
  const buffer: string[] = [];

  child.stdout.on('data', (data: Buffer) => {
    const newLines = data.toString().split('\n').filter(l => l.trim());
    buffer.push(...newLines);
    while (buffer.length > maxLines) buffer.shift();
  });

  child.stderr.on('data', (data: Buffer) => {
    buffer.push(`[stderr] ${data.toString().trim()}`);
    while (buffer.length > maxLines) buffer.shift();
  });

  activeStreams.set(streamKey, { process: child, buffer, maxLines });

  return {
    content: [{
      type: 'text' as const,
      text: `Log stream started (buffer=${maxLines} lines). Use action="read" to get buffer, action="stop" to end.`,
    }],
  };
}

// --- get_app_container ---

export const getAppContainerParams = {
  bundleId: z.string().describe('App bundle identifier'),
  containerType: z.enum(['app', 'data', 'groups']).optional().describe('Container type (default: data)'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleGetAppContainer(args: { bundleId: string; containerType?: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  const type = args.containerType || 'data';

  const cmdArgs = ['get_app_container', device, args.bundleId];
  if (type !== 'data') cmdArgs.push(type);

  const { stdout } = await execSimctl(cmdArgs, 'tool:getAppContainer');
  return { content: [{ type: 'text' as const, text: `${type} container: ${stdout.trim()}` }] };
}

// --- list_app_files ---

export const listAppFilesParams = {
  bundleId: z.string().describe('App bundle identifier'),
  subPath: z.string().optional().describe('Subdirectory to list (e.g., "Documents", "Library/Preferences")'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleListAppFiles(args: { bundleId: string; subPath?: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  const { stdout: containerPath } = await execSimctl(
    ['get_app_container', device, args.bundleId, 'data'],
    'tool:listAppFiles'
  );

  const basePath = args.subPath
    ? join(containerPath.trim(), args.subPath)
    : containerPath.trim();

  try {
    const result = await execFileAsync('find', [basePath, '-maxdepth', '4', '-ls'], {
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      timeout: 10000,
    });

    const lines = result.stdout.split('\n').filter(l => l.trim());
    const truncated = lines.length > 200;
    const output = truncated ? lines.slice(0, 200) : lines;

    return {
      content: [{
        type: 'text' as const,
        text: `Files in ${basePath} (${lines.length} entries${truncated ? ', showing first 200' : ''}):\n\n${output.join('\n')}`,
      }],
    };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { content: [{ type: 'text' as const, text: `Error listing files: ${e.message}` }] };
  }
}

// --- read_app_file ---

export const readAppFileParams = {
  bundleId: z.string().describe('App bundle identifier'),
  filePath: z.string().describe('Relative path within the data container (e.g., "Documents/data.json", "Library/Preferences/com.app.plist")'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleReadAppFile(args: { bundleId: string; filePath: string; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  const { stdout: containerPath } = await execSimctl(
    ['get_app_container', device, args.bundleId, 'data'],
    'tool:readAppFile'
  );

  const fullPath = join(containerPath.trim(), args.filePath);

  try {
    const stats = await stat(fullPath);
    if (stats.size > 1024 * 1024) {
      return { content: [{ type: 'text' as const, text: `File too large (${Math.round(stats.size / 1024)}KB). Use a more specific path.` }] };
    }

    // Handle plist files specially
    if (fullPath.endsWith('.plist')) {
      try {
        const result = await execFileAsync('plutil', ['-convert', 'json', '-o', '-', fullPath], {
          encoding: 'utf-8',
          timeout: 5000,
        });
        return { content: [{ type: 'text' as const, text: `${args.filePath} (plist → JSON):\n\n${result.stdout}` }] };
      } catch {
        // Fall through to binary read
      }
    }

    // Handle sqlite files
    if (fullPath.endsWith('.sqlite') || fullPath.endsWith('.db') || fullPath.endsWith('.sqlite3')) {
      try {
        const result = await execFileAsync('sqlite3', [fullPath, '.tables'], {
          encoding: 'utf-8',
          timeout: 5000,
        });
        const tables = result.stdout.trim();
        let schemaInfo = `SQLite database: ${args.filePath}\nTables: ${tables}\n`;

        // Get schema for each table
        for (const table of tables.split(/\s+/).filter(t => t)) {
          try {
            const schema = await execFileAsync('sqlite3', [fullPath, `.schema ${table}`], {
              encoding: 'utf-8',
              timeout: 5000,
            });
            schemaInfo += `\n${schema.stdout}`;
          } catch { /* skip */ }
        }

        return { content: [{ type: 'text' as const, text: schemaInfo }] };
      } catch {
        return { content: [{ type: 'text' as const, text: `Binary SQLite file at ${args.filePath} (${Math.round(stats.size / 1024)}KB)` }] };
      }
    }

    // Try reading as text
    const content = await readFile(fullPath, 'utf-8');
    return { content: [{ type: 'text' as const, text: `${args.filePath}:\n\n${content.slice(0, 10000)}${content.length > 10000 ? '\n\n...(truncated)' : ''}` }] };
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'ENOENT') {
      return { content: [{ type: 'text' as const, text: `File not found: ${args.filePath}. Use simulator_list_app_files to see available files.` }] };
    }
    return { content: [{ type: 'text' as const, text: `Error reading file: ${e.message}` }] };
  }
}

// --- get_crash_logs ---

export const getCrashLogsParams = {
  processName: z.string().optional().describe('Filter by process/app name'),
  since: z.string().optional().describe('Only crashes since this ISO date (e.g., "2026-03-22")'),
  limit: z.number().optional().describe('Max number of crash reports (default: 5)'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleGetCrashLogs(args: {
  processName?: string;
  since?: string;
  limit?: number;
  deviceId?: string;
}) {
  await resolveDevice(args.deviceId);

  const diagDir = join(homedir(), 'Library', 'Logs', 'DiagnosticReports');
  const limit = args.limit || 5;

  try {
    const files = await readdir(diagDir);
    let crashFiles = files.filter(f =>
      f.endsWith('.ips') || f.endsWith('.crash') || f.endsWith('.ips.ca')
    );

    if (args.processName) {
      crashFiles = crashFiles.filter(f =>
        f.toLowerCase().includes(args.processName!.toLowerCase())
      );
    }

    // Sort by name (which includes date) descending
    crashFiles.sort().reverse();
    crashFiles = crashFiles.slice(0, limit);

    if (crashFiles.length === 0) {
      return { content: [{ type: 'text' as const, text: `No crash logs found${args.processName ? ` for "${args.processName}"` : ''} in ${diagDir}` }] };
    }

    const reports: string[] = [];
    for (const file of crashFiles) {
      try {
        const content = await readFile(join(diagDir, file), 'utf-8');
        reports.push(`--- ${file} ---\n${content.slice(0, 5000)}${content.length > 5000 ? '\n...(truncated)' : ''}`);
      } catch {
        reports.push(`--- ${file} --- (unreadable)`);
      }
    }

    return {
      content: [{
        type: 'text' as const,
        text: `Found ${crashFiles.length} crash report(s):\n\n${reports.join('\n\n')}`,
      }],
    };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { content: [{ type: 'text' as const, text: `Error reading crash logs: ${e.message}` }] };
  }
}

// --- diagnose ---

export const diagnoseParams = {
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleDiagnose(args: { deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);

  // Collect various diagnostic info
  const results: string[] = [];

  // Device info
  try {
    const { stdout } = await execFileAsync('xcrun', ['simctl', 'list', '-j', 'devices'], {
      encoding: 'utf-8',
      timeout: 10000,
    });
    const data = JSON.parse(stdout);
    for (const [runtime, devs] of Object.entries(data.devices)) {
      for (const dev of devs as any[]) {
        if (dev.state === 'Booted') {
          results.push(`Booted device: ${dev.name} (${dev.udid})\nRuntime: ${runtime}\nDevice type: ${dev.deviceTypeIdentifier}`);
        }
      }
    }
  } catch { /* skip */ }

  // Disk usage of simulator data
  try {
    const { stdout } = await execFileAsync('du', ['-sh', join(homedir(), 'Library', 'Developer', 'CoreSimulator', 'Devices')], {
      encoding: 'utf-8',
      timeout: 10000,
    });
    results.push(`Simulator disk usage: ${stdout.trim()}`);
  } catch { /* skip */ }

  // System version
  try {
    const { stdout } = await execFileAsync('xcrun', ['--version'], { encoding: 'utf-8' });
    results.push(`Xcode toolchain: ${stdout.trim()}`);
  } catch { /* skip */ }

  try {
    const { stdout } = await execFileAsync('xcodebuild', ['-version'], { encoding: 'utf-8', timeout: 5000 });
    results.push(`Xcode: ${stdout.trim()}`);
  } catch { /* skip */ }

  return {
    content: [{
      type: 'text' as const,
      text: `Simulator Diagnostics:\n\n${results.join('\n\n')}`,
    }],
  };
}

// --- accessibility_audit ---

export const accessibilityAuditParams = {
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleAccessibilityAudit(args: { deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);

  // Prefer idb: returns actual iOS UI elements (UIButton, UILabel, etc.)
  if (await idb.checkIdbAvailable()) {
    try {
      const output = await idb.idbDescribeAll(device);
      const lines = output.split('\n').filter(l => l.trim());
      return {
        content: [{
          type: 'text' as const,
          text: `iOS Accessibility Tree via idb (${lines.length} elements):\n\n${output}`,
        }],
      };
    } catch (err: unknown) {
      const e = err as { message?: string };
      logger.warn('tool:accessibility', `idb describe-all failed, falling back to AppleScript: ${e.message}`);
      // Fall through to AppleScript fallback
    }
  }

  // Fallback: Deep traversal of Simulator's accessibility tree (4 levels).
  // iOS content is nested inside the Simulator window hierarchy.
  // NOTE: handlers using "my" lose the "tell" context, so we inline
  // all element access within the tell block.
  const elemFmt = (varName: string, indent: string) => `
      set _r to "?"
      try
        set _r to role of ${varName}
      end try
      set _d to ""
      try
        set _d to description of ${varName}
      end try
      set _v to ""
      try
        set _v to value of ${varName} as text
      end try
      set _p to {0, 0}
      try
        set _p to position of ${varName}
      end try
      set _s to {0, 0}
      try
        set _s to size of ${varName}
      end try
      set _info to "${indent}" & _r
      if _d is not "" then set _info to _info & " | " & _d
      if _v is not "" and _v is not _d then set _info to _info & " | val=" & _v
      set _info to _info & " @" & (item 1 of _p) & "," & (item 2 of _p) & " " & (item 1 of _s) & "x" & (item 2 of _s)
      set output to output & _info & return`;

  const script = `
tell application "System Events"
  tell process "Simulator"
    set frontWin to front window
    set winName to name of frontWin
    set output to "=== Simulator Accessibility Tree ===" & return
    set output to output & "Window: " & winName & return & return

    set L1 to every UI element of frontWin
    repeat with e1 in L1
      ${elemFmt('e1', '')}
      set L2 to {}
      try
        set L2 to every UI element of e1
      end try
      repeat with e2 in L2
        ${elemFmt('e2', '  ')}
        set L3 to {}
        try
          set L3 to every UI element of e2
        end try
        repeat with e3 in L3
          ${elemFmt('e3', '    ')}
          set L4 to {}
          try
            set L4 to every UI element of e3
          end try
          repeat with e4 in L4
            ${elemFmt('e4', '      ')}
          end repeat
        end repeat
      end repeat
    end repeat

    return output
  end tell
end tell`;

  try {
    const result = await runAppleScript(script, 'tool:accessibility');
    // AppleScript "return" is \r (CR), not \n — split on all line endings
    const lines = result.split(/\r\n|\r|\n/).filter(l => l.trim());
    // De-duplicate adjacent identical lines (common in deep Simulator trees)
    const deduped: string[] = [];
    for (const line of lines) {
      if (deduped[deduped.length - 1] !== line) deduped.push(line);
    }
    // Count only element lines (those with AX roles), skip headers
    const elementCount = deduped.filter(l => /^[\s]*(AX\w+|missing value)/.test(l)).length;
    return {
      content: [{
        type: 'text' as const,
        text: `Accessibility Tree (${elementCount} elements):\n\n${deduped.join('\n')}`,
      }],
    };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return {
      content: [{
        type: 'text' as const,
        text: `Accessibility audit failed: ${e.message}\n\nNote: This requires Accessibility permission in System Settings → Privacy & Security → Accessibility.`,
      }],
    };
  }
}

// --- get_screen_info ---

export const getScreenInfoParams = {
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleGetScreenInfo(args: { deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);

  try {
    const mapping = await getScreenMapping(device);

    return {
      content: [{
        type: 'text' as const,
        text: `Screen Mapping Info:

Window position: (${mapping.windowGeometry.windowX}, ${mapping.windowGeometry.windowY})
Window size: ${mapping.windowGeometry.windowWidth} x ${mapping.windowGeometry.windowHeight}
Title bar height: ${mapping.titleBarHeight}
Content area: ${mapping.contentWidth} x ${mapping.contentHeight}

Device screen: ${mapping.devicePointWidth} x ${mapping.devicePointHeight} points
Scale factor: ${mapping.scaleFactor}x

Coordinate mapping:
  scaleX: ${mapping.scaleX.toFixed(4)}
  scaleY: ${mapping.scaleY.toFixed(4)}

Example: sim(0,0) → mac(${mapping.windowGeometry.windowX}, ${mapping.windowGeometry.windowY + mapping.titleBarHeight})
Example: sim(${mapping.devicePointWidth},${mapping.devicePointHeight}) → mac(${mapping.windowGeometry.windowX + mapping.contentWidth}, ${mapping.windowGeometry.windowY + mapping.titleBarHeight + mapping.contentHeight})`,
      }],
    };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return {
      content: [{
        type: 'text' as const,
        text: `Failed to get screen info: ${e.message}\n\nMake sure Simulator is running and visible.`,
      }],
    };
  }
}

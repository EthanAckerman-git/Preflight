type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, context: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
}

export function log(level: LogLevel, context: string, message: string, data?: unknown): void {
  if (!shouldLog(level)) return;
  let line = formatMessage(level, context, message);
  if (data !== undefined) {
    try {
      line += ' ' + JSON.stringify(data);
    } catch {
      line += ' [unserializable data]';
    }
  }
  process.stderr.write(line + '\n');
}

export function debug(context: string, message: string, data?: unknown): void {
  log('debug', context, message, data);
}

export function info(context: string, message: string, data?: unknown): void {
  log('info', context, message, data);
}

export function warn(context: string, message: string, data?: unknown): void {
  log('warn', context, message, data);
}

export function error(context: string, message: string, data?: unknown): void {
  log('error', context, message, data);
}

export function toolStart(toolName: string, params: unknown): void {
  debug(`tool:${toolName}`, 'Invoked', params);
}

export function toolEnd(toolName: string, durationMs: number, success: boolean): void {
  const level = success ? 'debug' : 'error';
  log(level as LogLevel, `tool:${toolName}`, `Completed in ${durationMs}ms, success=${success}`);
}

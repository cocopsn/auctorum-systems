type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  tenantId?: string;
  action?: string;
  durationMs?: number;
  details?: unknown;
}

function log(level: LogLevel, message: string, meta?: Omit<LogEntry, 'timestamp' | 'level' | 'message'>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info: (message: string, meta?: Omit<LogEntry, 'timestamp' | 'level' | 'message'>) => log('info', message, meta),
  warn: (message: string, meta?: Omit<LogEntry, 'timestamp' | 'level' | 'message'>) => log('warn', message, meta),
  error: (message: string, meta?: Omit<LogEntry, 'timestamp' | 'level' | 'message'>) => log('error', message, meta),
};

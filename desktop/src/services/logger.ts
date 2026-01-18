
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

class LoggerService {
  private static instance: LoggerService;
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000;

  private constructor() {}

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  private addLog(level: LogLevel, module: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
    };

    this.logs.push(entry);
    
    // Rotate logs to prevent memory leaks
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }

    // Console output for development or errors
    const style = this.getConsoleStyle(level);
    
    // In production, only show warnings and errors to keep console clean
    if (import.meta.env.DEV || level === 'error' || level === 'warn') {
      console.log(
        `%c[${entry.timestamp}] [${level.toUpperCase()}] [${module}] ${message}`,
        style,
        data || ''
      );
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case 'error': return 'color: #ef4444; font-weight: bold;';
      case 'warn': return 'color: #f59e0b; font-weight: bold;';
      case 'info': return 'color: #3b82f6;';
      case 'debug': return 'color: #9ca3af;';
      default: return '';
    }
  }

  public debug(module: string, message: string, data?: any) {
    if (import.meta.env.DEV) {
      this.addLog('debug', module, message, data);
    }
  }

  public info(module: string, message: string, data?: any) {
    this.addLog('info', module, message, data);
  }

  public warn(module: string, message: string, data?: any) {
    this.addLog('warn', module, message, data);
  }

  public error(module: string, message: string, data?: any) {
    this.addLog('error', module, message, data);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
  }
}

export const logger = LoggerService.getInstance();

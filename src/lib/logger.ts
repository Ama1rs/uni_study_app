interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

import config from './config';

const isDevelopment = import.meta.env.DEV || config.DEBUG;
const logLevel = config.LOG_LEVEL;

const logger: Logger = {
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment && (logLevel === 'debug' || logLevel === 'info')) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (isDevelopment && (logLevel === 'debug' || logLevel === 'info' || logLevel === 'warn')) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (isDevelopment && (logLevel !== 'error')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  }
};

export default logger;
import { config } from '../config/index.js';

const LEVEL_COLORS = {
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[36m',
  debug: '\x1b[90m',
};

const RESET = '\x1b[0m';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const currentLevel = LEVELS[config.logLevel] ?? LEVELS.info;

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  if (meta && Object.keys(meta).length > 0) {
    return `${base} ${JSON.stringify(meta)}`;
  }

  return base;
}

function log(level, message, meta = {}) {
  if (LEVELS[level] > currentLevel) return;

  const formatted = formatMessage(level, message, meta);

  if (config.env === 'production') {
    if (level === 'error') {
      console.error(formatted);
    } else if (level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
    return;
  }

  const color = LEVEL_COLORS[level] || '';
  console[level === 'error' ? 'error' : 'log'](`${color}${formatted}${RESET}`);
}

export const logger = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta),
};

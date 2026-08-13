import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Per-run log file: logs/run-<ISO timestamp>.log
const logsDir = path.resolve(__dirname, '../../logs');
fs.mkdirSync(logsDir, { recursive: true });
const runTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runLogFile = path.join(logsDir, `run-${runTimestamp}.log`);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return stack
      ? `${timestamp} [${level.toUpperCase()}] ${message}\n${stack}`
      : `${timestamp} [${level.toUpperCase()}] ${message}`;
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          return stack
            ? `${timestamp} ${level}: ${message}\n${stack}`
            : `${timestamp} ${level}: ${message}`;
        })
      ),
    }),
    // Per-run log file (all levels)
    new winston.transports.File({
      filename: runLogFile,
    }),
    // Persistent error log (rotated)
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
    }),
  ],
});

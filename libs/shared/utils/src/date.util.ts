/**
 * Generates structured date and time path components for logging.
 * Returns { dateStr, timeStr }
 * Example: dateStr="2026-01-11", timeStr="11-30-00"
 */
export const getLogDateParts = () => {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const timeStr = now.toISOString().split("T")[1].split(".")[0].replace(/:/g, "-"); // HH-mm-ss
  return { dateStr, timeStr };
};

import * as path from "path";
import * as fs from "fs";

/**
 * Resolves a log file path based on service name, log type, and current time.
 * Automatically creates the directory structure if it doesn't exist.
 * Path is relative to process.cwd(), e.g., 'logs/service/YYYY-MM-DD/HH-mm-ss-type.log'
 */
export const getLogFilePath = (serviceName: string, logType: string) => {
  const { dateStr, timeStr } = getLogDateParts();
  // Using process.cwd() ensures paths start from app root as requested
  const logDir = path.join(process.cwd(), "logs", serviceName, dateStr);

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  return path.join(logDir, `${timeStr}-${logType}.log`);
};

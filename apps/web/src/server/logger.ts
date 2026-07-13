const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m"
};

class Logger {
  private formatTime(): string {
    return new Date().toISOString().replace("T", " ").substring(0, 19);
  }

  private log(level: string, color: string, prefix: string, message: string, ...args: any[]) {
    const timestamp = `${colors.dim}[${this.formatTime()}]${colors.reset}`;
    const badge = `${colors.bright}${color}[${prefix}]${colors.reset}`;
    console.log(`${timestamp} ${badge} ${message}`, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log("INFO", colors.blue, "ℹ INFO", message, ...args);
  }

  success(message: string, ...args: any[]) {
    this.log("SUCCESS", colors.green, "✅ SUCCESS", message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log("WARN", colors.yellow, "⚠️ WARN", message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log("ERROR", colors.red, "🚨 ERROR", message, ...args);
  }

  debug(message: string, ...args: any[]) {
    this.log("DEBUG", colors.magenta, "🔍 DEBUG", message, ...args);
  }
}

export const logger = new Logger();
export default logger;

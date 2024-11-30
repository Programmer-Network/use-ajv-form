class Logger {
  private isEnabled: boolean;

  constructor(debug: boolean = false) {
    this.isEnabled = debug;
  }

  log(...args: unknown[]): void {
    if (this.isEnabled) {
      console.log('[AJV-Form-Logger]:', ...args);
    }
  }

  error(...args: unknown[]): void {
    if (this.isEnabled) {
      console.error('[AJV-Form-Logger]:', ...args);
    }
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }
}

export default Logger;

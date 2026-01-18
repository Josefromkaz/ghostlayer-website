import * as fs from 'fs';
import * as path from 'path';

interface MetaData {
  lastSeen: number;
  version: string;
  installDate?: number;
}

/**
 * Anti-tampering service to detect clock manipulation.
 *
 * This service helps prevent users from bypassing time-limited licenses
 * by setting their system clock backwards.
 *
 * It works by:
 * 1. Recording the last seen timestamp on each app launch
 * 2. Checking if the current time is significantly before the last seen time
 * 3. Flagging potential tampering if the clock appears to have been moved back
 */
export class AntiTamperService {
  private metaPath: string;
  private tolerance: number = 60000; // 1 minute tolerance for clock drift

  constructor(appDataPath: string) {
    this.metaPath = path.join(appDataPath, '.meta');
  }

  /**
   * Checks if the system clock appears to have been tampered with.
   *
   * @returns Object with validity status and optional reason
   */
  checkClockIntegrity(): { valid: boolean; reason?: string } {
    const now = Date.now();

    if (fs.existsSync(this.metaPath)) {
      try {
        const content = fs.readFileSync(this.metaPath, 'utf8');
        const meta: MetaData = JSON.parse(content);

        // Check if current time is before last seen (minus tolerance)
        if (now < meta.lastSeen - this.tolerance) {
          const lastSeenDate = new Date(meta.lastSeen).toISOString();
          const currentDate = new Date(now).toISOString();

          return {
            valid: false,
            reason: `Clock tampering detected. System time (${currentDate}) is before last recorded time (${lastSeenDate}). Please restore your system clock to the correct time.`,
          };
        }

        // Update last seen time
        this.updateMeta(now, meta);
      } catch (error) {
        // If meta file is corrupted, recreate it
        console.warn('Meta file corrupted, recreating:', error);
        this.createMeta(now);
      }
    } else {
      // First run - create meta file
      this.createMeta(now);
    }

    return { valid: true };
  }

  /**
   * Creates a new meta file.
   */
  private createMeta(timestamp: number): void {
    const meta: MetaData = {
      lastSeen: timestamp,
      version: '2.0.0',
      installDate: timestamp,
    };

    this.saveMeta(meta);
  }

  /**
   * Updates the existing meta file.
   */
  private updateMeta(timestamp: number, existingMeta: MetaData): void {
    const meta: MetaData = {
      ...existingMeta,
      lastSeen: timestamp,
      version: '2.0.0',
    };

    this.saveMeta(meta);
  }

  /**
   * Saves meta data to file and hides it on Windows.
   */
  private saveMeta(meta: MetaData): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.metaPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Windows: Unhide file before writing to avoid EPERM
      if (process.platform === 'win32' && fs.existsSync(this.metaPath)) {
        try {
          const { execSync } = require('child_process');
          execSync(`attrib -h "${this.metaPath}"`);
        } catch {
          // Ignore if unhide fails
        }
      }

      // Write meta file
      fs.writeFileSync(this.metaPath, JSON.stringify(meta, null, 2));

      // Hide file on Windows
      if (process.platform === 'win32') {
        try {
          const { exec } = require('child_process');
          exec(`attrib +h "${this.metaPath}"`);
        } catch {
          // Ignore if attrib fails
        }
      } else {
        // Set restrictive permissions on Unix
        try {
          fs.chmodSync(this.metaPath, 0o600);
        } catch {
          // Ignore if chmod fails
        }
      }
    } catch (error) {
      console.error('Failed to save meta file:', error);
    }
  }

  /**
   * Gets the installation date if available.
   */
  getInstallDate(): Date | null {
    if (!fs.existsSync(this.metaPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.metaPath, 'utf8');
      const meta: MetaData = JSON.parse(content);
      return meta.installDate ? new Date(meta.installDate) : null;
    } catch {
      return null;
    }
  }

  /**
   * Checks if this is a fresh installation (no previous meta file).
   */
  isFreshInstall(): boolean {
    return !fs.existsSync(this.metaPath);
  }

  /**
   * Gets the last seen timestamp.
   */
  getLastSeen(): Date | null {
    if (!fs.existsSync(this.metaPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.metaPath, 'utf8');
      const meta: MetaData = JSON.parse(content);
      return new Date(meta.lastSeen);
    } catch {
      return null;
    }
  }

  /**
   * Calculates days since installation.
   */
  getDaysSinceInstall(): number {
    const installDate = this.getInstallDate();
    if (!installDate) return 0;

    const now = Date.now();
    const diff = now - installDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}

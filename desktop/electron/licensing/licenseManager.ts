import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { validateLicense, LicenseInfo, getDaysRemaining } from './validator';
import { AntiTamperService } from '../security/antiTamper';
import { LicenseType, LICENSE_FEATURES, TRIAL_PERIOD_DAYS, isRegexCategoryAllowed as isRegexCategoryAllowedHelper } from './keys';

/**
 * Trial data structure for persistence
 */
interface TrialData {
  startDate: number;      // Unix timestamp when trial started
  expirationDate: number; // Unix timestamp when trial expires
  version: string;        // App version when trial started
}

/**
 * License manager for handling license validation, activation, and feature gating.
 */
export class LicenseManager {
  private info: LicenseInfo = { valid: false, type: 'FREE' };
  private licensePath: string;
  private trialPath: string;
  private antiTamper: AntiTamperService;
  private trialStarted: boolean = false;

  constructor(appDataPath: string, antiTamper: AntiTamperService) {
    this.licensePath = path.join(appDataPath, 'license.key');
    this.trialPath = path.join(appDataPath, '.trial');
    this.antiTamper = antiTamper;
  }

  /**
   * Initializes the license manager.
   * Loads and validates existing license, checks trial status, or defaults to FREE.
   */
  async initialize(): Promise<LicenseInfo> {
    // Check for clock tampering first
    const clockCheck = this.antiTamper.checkClockIntegrity();
    if (!clockCheck.valid) {
      this.info = {
        valid: false,
        type: 'TAMPERED',
        reason: clockCheck.reason,
      };
      return this.info;
    }

    // Check for existing license file first (takes priority over trial)
    if (fs.existsSync(this.licensePath)) {
      try {
        const key = fs.readFileSync(this.licensePath, 'utf8').trim();
        this.info = validateLicense(key);

        // If license is expired or invalid, fall back to checking trial
        if (!this.info.valid && this.info.type !== 'EXPIRED') {
          // License invalid - check for trial
          return this.checkTrialStatus();
        }
        return this.info;
      } catch (error) {
        console.error('Failed to read license file:', error);
        // Fall through to trial check
      }
    }

    // No valid license - check trial status
    return this.checkTrialStatus();
  }

  // Windows Registry Helper
  private getRegistryTrial(): Promise<number | null> {
    if (process.platform !== 'win32') return Promise.resolve(null);
    return new Promise((resolve) => {
      exec('reg query HKCU\\Software\\GhostLayerDesktop /v TrialExpiration', (err, stdout) => {
        if (err || !stdout) return resolve(null);
        const match = stdout.match(/REG_SZ\s+(\d+)/);
        resolve(match ? parseInt(match[1], 10) : null);
      });
    });
  }

  private setRegistryTrial(expiration: number): void {
    if (process.platform !== 'win32') return;
    exec(`reg add HKCU\\Software\\GhostLayerDesktop /v TrialExpiration /t REG_SZ /d ${expiration} /f`, (err) => {
      if (err) console.error('Failed to write trial to registry:', err);
    });
  }

  /**
   * Checks and returns the trial status.
   * Loads persisted trial data or returns FREE status.
   */
  private async checkTrialStatus(): Promise<LicenseInfo> {
    const now = Date.now();
    let expirationTimestamp = 0;
    const isTrialFilePresent = fs.existsSync(this.trialPath);

    // 1. Check File System
    if (isTrialFilePresent) {
      try {
        const trialContent = fs.readFileSync(this.trialPath, 'utf8');
        const trialData: TrialData = JSON.parse(trialContent);
        expirationTimestamp = trialData.expirationDate;
      } catch (e) {
        // Corrupted file -> treat as potentially expired if registry says so
      }
    }

    // 2. Check Windows Registry (Backup source of truth)
    if (process.platform === 'win32') {
      const regExpiration = await this.getRegistryTrial();
      if (regExpiration) {
        // If file is missing but registry exists -> User deleted file to reset trial!
        // Or registry has an OLDER expiration date -> User manipulated file.
        // We take the oldest known expiration date (min of file vs registry? No, max, wait.)
        // Logic: Once a trial starts, it expires at Time X.
        // If registry says X, and file says nothing, X is truth.
        // If file says Y (newer), but registry says X (older), user tried to extend.
        // We should respect the *earliest* created expiration date? No, the one that ends sooner?
        // Actually, if we find a registry entry, it means a trial WAS started.
        // If !isTrialFilePresent but regExpiration exists -> Trial was reset. RESTORE IT.
        if (!isTrialFilePresent || (expirationTimestamp && regExpiration < expirationTimestamp)) {
           expirationTimestamp = regExpiration;
           // Restore the file to stop them from trying again
           this.restoreTrialFile(regExpiration);
        }
      }
    }

    if (expirationTimestamp > 0) {
        const expirationDate = new Date(expirationTimestamp);
        if (now > expirationTimestamp) {
          this.info = {
            valid: false,
            type: 'EXPIRED',
            expirationDate,
            reason: `Trial expired on ${expirationDate.toLocaleDateString()}`,
          };
          this.trialStarted = true;
        } else {
          const daysRemaining = Math.ceil((expirationTimestamp - now) / (1000 * 60 * 60 * 24));
          this.info = {
            valid: true,
            type: 'TRIAL',
            expirationDate,
            reason: `Trial expires in ${daysRemaining} days`,
          };
          this.trialStarted = true;
        }
    } else {
      // No trial data found anywhere
      this.info = { valid: false, type: 'FREE' };
      this.trialStarted = false;
    }

    return this.info;
  }

  private restoreTrialFile(expiration: number) {
     try {
        const dir = path.dirname(this.trialPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        // We don't know start date, but it doesn't matter for validation, only expiration matters
        const trialData: TrialData = {
            startDate: Date.now() - (TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000), // Fake start
            expirationDate: expiration,
            version: 'RESTORED'
        };
        fs.writeFileSync(this.trialPath, JSON.stringify(trialData));
        if (process.platform === 'win32') {
            exec(`attrib +h "${this.trialPath}"`);
        }
     } catch (e) { console.error('Failed to restore trial file', e); }
  }

  /**
   * Activates a new license key.
   *
   * @param key - License key to activate
   * @returns LicenseInfo with validation results
   */
  async activateLicense(key: string): Promise<LicenseInfo> {
    const result = validateLicense(key);

    if (result.valid) {
      // Save the license key
      try {
        const dir = path.dirname(this.licensePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.licensePath, key.trim());
        this.info = result;
      } catch (error) {
        console.error('Failed to save license:', error);
        return {
          valid: false,
          type: 'FREE',
          reason: 'Failed to save license file',
        };
      }
    }

    return result;
  }

  /**
   * Removes the current license (for debugging/support purposes).
   */
  deactivateLicense(): void {
    if (fs.existsSync(this.licensePath)) {
      fs.unlinkSync(this.licensePath);
    }
    this.info = { valid: false, type: 'FREE' };
  }

  /**
   * Checks if the current license allows using a specific feature.
   */
  canUseFeature(feature: 'memory' | 'export' | 'prompts' | 'custom_patterns' | 'whitelist' | 'advanced_redaction'): boolean {
    const allowedFeatures = LICENSE_FEATURES[this.info.type] || LICENSE_FEATURES.FREE;
    return allowedFeatures.includes(feature);
  }

  /**
   * Checks if a regex category is allowed for the current license.
   * @param category - Regex category name (e.g., 'EMAIL', 'CREDIT_CARD', etc.)
   * @returns true if category is allowed, false otherwise
   */
  isRegexCategoryAllowed(category: string): boolean {
    return isRegexCategoryAllowedHelper(category, this.info.type);
  }

  /**
   * Checks if the current license is PRO level or higher.
   */
  isPro(): boolean {
    return ['PRO', 'TRIAL', 'TEAM'].includes(this.info.type);
  }

  /**
   * Gets the current license information.
   */
  getInfo(): LicenseInfo {
    // Return a copy with serializable date
    return {
      ...this.info,
      expirationDate: this.info.expirationDate
        ? this.info.expirationDate.toISOString() as unknown as Date
        : undefined,
    };
  }

  /**
   * Gets the number of days remaining on the license.
   */
  getDaysRemaining(): number {
    if (!this.info.expirationDate) return 0;
    return getDaysRemaining(this.info.expirationDate);
  }

  /**
   * Checks if the license is expiring soon (within 7 days).
   */
  isExpiringSoon(): boolean {
    if (!this.info.valid || !this.info.expirationDate) return false;
    return this.getDaysRemaining() <= 7;
  }

  /**
   * Gets the license type as a display-friendly string.
   */
  getDisplayType(): string {
    const typeMap: Record<LicenseType, string> = {
      FREE: 'Free',
      PRO: 'Professional',
      TRIAL: 'Trial',
      TEAM: 'Team',
      EXPIRED: 'Expired',
      TAMPERED: 'Invalid',
    };
    return typeMap[this.info.type] || 'Unknown';
  }

  /**
   * Starts a trial period for the current user.
   * Only works if no license exists and trial hasn't been started before.
   */
  startTrial(): LicenseInfo {
    // Don't start trial if already have a valid license or trial already used
    if (this.info.type !== 'FREE') {
      return this.info;
    }

    // Check if trial was already used (file exists)
    if (fs.existsSync(this.trialPath)) {
      // Trial was already used - don't allow restart
      return this.info;
    }

    // Calculate trial expiration date
    const now = Date.now();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + TRIAL_PERIOD_DAYS);
    const expirationTimestamp = expirationDate.getTime();

    // Save trial data to persist across sessions
    const trialData: TrialData = {
      startDate: now,
      expirationDate: expirationTimestamp,
      version: '2.0.0',
    };

    try {
      const dir = path.dirname(this.trialPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.trialPath, JSON.stringify(trialData, null, 2));

      // Hide trial file on Windows
      if (process.platform === 'win32') {
        try {
          exec(`attrib +h "${this.trialPath}"`);
          this.setRegistryTrial(expirationTimestamp); // Backup to Registry
        } catch {
          // Ignore if attrib fails
        }
      }

      this.info = {
        valid: true,
        type: 'TRIAL',
        expirationDate,
        reason: `Trial expires in ${TRIAL_PERIOD_DAYS} days`,
      };

      this.trialStarted = true;
    } catch (error) {
      console.error('Failed to save trial data:', error);
      // Return FREE if we couldn't save trial
      this.info = { valid: false, type: 'FREE' };
    }

    return this.info;
  }

  /**
   * Checks if trial has been started (current or expired).
   */
  hasTrialStarted(): boolean {
    return this.trialStarted || fs.existsSync(this.trialPath);
  }

  /**
   * Checks if user is eligible for trial (never started trial before).
   */
  async canStartTrial(): Promise<boolean> {
    const hasFile = fs.existsSync(this.trialPath);
    let hasRegistry = false;
    if (process.platform === 'win32') {
        const reg = await this.getRegistryTrial();
        hasRegistry = !!reg;
    }
    return this.info.type === 'FREE' && !hasFile && !hasRegistry;
  }
}

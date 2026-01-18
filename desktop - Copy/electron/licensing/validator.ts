import * as crypto from 'crypto';
import { PUBLIC_KEY, LicenseType } from './keys';

export interface LicenseInfo {
  valid: boolean;
  type: LicenseType;
  expirationDate?: Date;
  userId?: string;
  reason?: string;
}

/**
 * Validates a license key using RSA-2048 signature verification.
 *
 * License key format: TYPE-YYYYMMDD-USER_ID.SIGNATURE
 * - TYPE: FREE, PRO, TRIAL, or TEAM
 * - YYYYMMDD: Expiration date
 * - USER_ID: Unique user identifier (email or ID)
 * - SIGNATURE: Base64URL-encoded RSA-SHA256 signature
 *
 * @param licenseKey - The license key to validate
 * @returns LicenseInfo object with validation results
 */
export function validateLicense(licenseKey: string): LicenseInfo {
  if (!licenseKey || typeof licenseKey !== 'string') {
    return {
      valid: false,
      type: 'FREE',
      reason: 'No license key provided',
    };
  }

  const trimmedKey = licenseKey.trim();

  // Find the last dot (separator between payload and signature)
  const lastDot = trimmedKey.lastIndexOf('.');
  if (lastDot === -1) {
    return {
      valid: false,
      type: 'FREE',
      reason: 'Invalid license format: missing signature',
    };
  }

  const payload = trimmedKey.substring(0, lastDot);
  const signature = trimmedKey.substring(lastDot + 1);

  // Verify RSA-SHA256 signature
  try {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(payload);

    // Convert from Base64URL to regular Base64
    const signatureBase64 = signature
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const signatureBuffer = Buffer.from(signatureBase64, 'base64');
    const isValid = verify.verify(PUBLIC_KEY, signatureBuffer);

    if (!isValid) {
      return {
        valid: false,
        type: 'FREE',
        reason: 'Invalid license signature',
      };
    }
  } catch (error) {
    return {
      valid: false,
      type: 'FREE',
      reason: 'Signature verification failed',
    };
  }

  // Parse payload: TYPE-YYYYMMDD-USER_ID
  const payloadMatch = payload.match(/^(FREE|PRO|TRIAL|TEAM)-(\d{8})-(.+)$/);
  if (!payloadMatch) {
    return {
      valid: false,
      type: 'FREE',
      reason: 'Invalid license payload format',
    };
  }

  const [, typeStr, dateStr, userId] = payloadMatch;
  const type = typeStr as LicenseType;

  // Parse expiration date
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1; // JS months are 0-indexed
  const day = parseInt(dateStr.substring(6, 8), 10);
  const expirationDate = new Date(year, month, day, 23, 59, 59, 999);

  // Check if license is expired
  const now = new Date();
  if (expirationDate < now) {
    return {
      valid: false,
      type: 'EXPIRED',
      expirationDate,
      userId,
      reason: `License expired on ${expirationDate.toLocaleDateString()}`,
    };
  }

  // License is valid
  return {
    valid: true,
    type,
    expirationDate,
    userId,
  };
}

/**
 * Calculates days remaining until license expiration.
 */
export function getDaysRemaining(expirationDate: Date): number {
  const now = new Date();
  const diff = expirationDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Checks if a license is about to expire (within 7 days).
 */
export function isExpiringSoon(expirationDate: Date): boolean {
  return getDaysRemaining(expirationDate) <= 7;
}

/**
 * Formats expiration date for display.
 */
export function formatExpirationDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

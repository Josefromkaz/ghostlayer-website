/**
 * RSA-2048 Public Key for license validation.
 *
 * IMPORTANT: This is the PUBLIC key only.
 * The private key should be kept secure and used only on the license server.
 *
 * To generate a new key pair:
 * openssl genrsa -out private.pem 2048
 * openssl rsa -in private.pem -pubout -out public.pem
 */
export const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu5295Pzov12t9TcJXClp
SJ8euDWnI2iS5GPLIPhfUrfcE2vMoQ7NLvIFwgN0jBRpiWJwXBOD1LLYAuX+4x3Y
977D4uf4uSugupzMyxw2KLgfYmeHyyM3J96lQ6NMkmY35BYyNSx+dszn95f8Qs/m
4TOQoZqeJd5xiA5cRXovAp519tEvAVizdqnuHtKaa3Hoql+ecUs/S+IViNuKHqpy
+G11hnioILZ30rzU18N3Zy614Wd3kqSXvOkleky+RmWhz023y28H3FnNPEJMSC9z
OIEEADvARL3rCc4L9BGwJAiwnORonAMUJfFLzAKGbKjtmpa4sz6GkpQfQpJiHtpk
SQIDAQAB
-----END PUBLIC KEY-----`;

/**
 * License types supported by the system.
 */
export type LicenseType = 'FREE' | 'PRO' | 'TRIAL' | 'TEAM' | 'EXPIRED' | 'TAMPERED';

/**
 * Features that can be gated by license type.
 */
export const LICENSE_FEATURES: Record<LicenseType, string[]> = {
  FREE: ['basic_redaction', 'export', 'prompts'],
  TRIAL: ['basic_redaction', 'advanced_redaction', 'export', 'prompts', 'memory', 'whitelist', 'custom_patterns'],
  PRO: ['basic_redaction', 'advanced_redaction', 'export', 'prompts', 'memory', 'whitelist', 'custom_patterns', 'priority_support'],
  TEAM: ['basic_redaction', 'advanced_redaction', 'export', 'prompts', 'memory', 'whitelist', 'custom_patterns', 'priority_support', 'team_features'],
  EXPIRED: ['basic_redaction'],
  TAMPERED: [],
};

/**
 * Regex categories available in FREE version (only 5 basic categories).
 * All other categories require PRO/TRIAL/TEAM license.
 */
export const FREE_REGEX_CATEGORIES = [
  'EMAIL',
  'PHONE',
  'URL',
  'DATE',
  'PERSON_NAME'
];

/**
 * Checks if a regex category is allowed for the given license type.
 * @param category - Regex category name
 * @param licenseType - Current license type
 * @returns true if category is allowed, false otherwise
 */
export function isRegexCategoryAllowed(category: string, licenseType: LicenseType): boolean {
  if (licenseType === 'FREE' || licenseType === 'EXPIRED') {
    return FREE_REGEX_CATEGORIES.includes(category);
  }
  return true; // PRO/TRIAL/TEAM have access to all categories
}

/**
 * Trial period in days.
 */
export const TRIAL_PERIOD_DAYS = 7;

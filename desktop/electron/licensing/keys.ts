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
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsJ8iMGCywBv833NNfH4M
bMXB54HzqLAZAwU5JiZFiJeg/gsI3cy6INrU1xqnTJhDiyt3gEq4QQ6uFEASgrnP
ZTDM0FGCuXVA3m2gTLEbb5xeCWT18/Ng20tcnBVwOHrZsLbOFGrDINWaBExPx7Wq
zGJOEl3JuI/Ha8F/82g+qSW7BYDbthQyhJwW16i+qvoB+Jxb73lEKRuyXERr117q
f5ESyn41qtHz0vN/xEv49tXAwMgjeyo+vGnvS6O0hYbhyGapIlS3erXTHNefIxpt
bON6lNlOdt2dj2oIlhhW83aRURkLqspzMYBJQ2gL0nWJTvUU+ZNdQTWH/iOs7Zg4
PwIDAQAB
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

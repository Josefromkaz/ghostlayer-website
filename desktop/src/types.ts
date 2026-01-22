/**
 * GhostLayer Desktop - Type Definitions
 *
 * These types are used throughout the React frontend.
 * For shared types between frontend and backend, see shared/types.ts
 */

// ===========================================
// Database Record Types
// ===========================================
export interface LearningRule {
  id: string;
  pattern: string;
  category: string;
  enabled: boolean;
  createdAt: number;
}

export interface Prompt {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: number;
}

export interface CustomPatternRecord {
  id: string;
  name: string;
  regex: string;
  category: string;
  createdAt: number;
}

// ===========================================
// Redaction Categories
// ===========================================
export enum RedactionCategory {
  USER_MEMORY = 'MEMORY',
  CUSTOM = 'CUSTOM',
  WHITELIST = 'WHITELIST',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  URL = 'URL',
  CREDIT_CARD = 'CREDIT_CARD',
  DATE = 'DATE',
  // Regional - Russia
  RF_PASSPORT = 'RF_PASSPORT',
  SNILS = 'SNILS',
  INN = 'INN',
  // Regional - Kazakhstan
  KZ_IIN = 'KZ_IIN',
  KZ_ID = 'KZ_ID',
  KZ_PASSPORT = 'KZ_PASSPORT',
  KZ_PHONE = 'KZ_PHONE',
  KZ_VEHICLE = 'KZ_VEHICLE',
  KZ_ADDRESS = 'KZ_ADDRESS',
  KZ_LEGAL_CASE = 'KZ_LEGAL_CASE',
  KZ_IBAN = 'KZ_IBAN',
  // International
  IBAN = 'IBAN',
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  POSTAL_CODE = 'POSTAL_CODE',
  LICENSE_PLATE = 'LICENSE_PLATE',
  GOV_BODY = 'GOV_BODY',
  COMPANY = 'COMPANY',
  ADDRESS = 'ADDRESS',
  // US-Specific Categories
  SSN = 'SSN',
  EIN = 'EIN',
  ROUTING_NUMBER = 'ROUTING_NUMBER',
  DRIVER_LICENSE = 'DRIVER_LICENSE',
  // New categories
  PERSON_NAME = 'PERSON_NAME',
  CONTRACT_NUMBER = 'CONTRACT_NUMBER',
  ID_DOCUMENT = 'ID_DOCUMENT',
  BIC = 'BIC',
}

// ===========================================
// Pattern Configuration
// ===========================================
export interface PatternConfig {
  id: string;
  name: string;
  category: RedactionCategory;
  regex: RegExp;
  color: string;
  replacement: string;
  validator?: (text: string) => boolean;
  useGroup1AsIdentity?: boolean; // If true, use match[1] for ID generation and consistency
}

// ===========================================
// User-Defined Patterns
// ===========================================
export interface CustomPattern {
  id: string;
  name: string;
  regex: string;
  category: string;
  active: boolean;
  createdAt?: number;
}

export interface UserRule {
  id: string;
  text: string;
  category: RedactionCategory;
  enabled: boolean;
  createdAt?: number;
}

// ===========================================
// Match & Segment Types
// ===========================================
export interface Match {
  id: string;
  text: string;
  cleanText?: string; // The normalized text used for ID generation (e.g. without "Represented by:")
  start: number;
  end: number;
  category: RedactionCategory;
  isRedacted: boolean;
  replacementTag?: string;
  ruleId?: string;
  excluded?: boolean;
  excludedAt?: number;
}

export interface TextSegment {
  id: string;
  text: string;
  isMatch: boolean;
  match?: Match;
}

// ===========================================
// Saved Data Types
// ===========================================
export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  isDefault?: boolean;
  createdAt?: number;
}

export interface WhitelistItem {
  id: string;
  phrase: string;
  createdAt?: number;
}

// Whitelist entry can be a phrase OR a category
export interface WhitelistEntry {
  id: string;
  type: 'phrase' | 'category';
  value: string; // phrase text or category name (e.g., 'DATE', 'EMAIL')
  createdAt?: number;
}

// ===========================================
// License Types
// ===========================================
export type LicenseType = 'FREE' | 'PRO' | 'TRIAL' | 'TEAM' | 'EXPIRED' | 'TAMPERED';

export interface LicenseInfo {
  valid: boolean;
  type: LicenseType;
  expirationDate?: string;
  userId?: string;
  reason?: string;
}

export type UpgradeReason = 'MEMORY' | 'WHITELIST' | 'CUSTOM_PATTERNS' | 'REGEX_CATEGORY';

export interface UpgradeModalState {
  isOpen: boolean;
  reason: UpgradeReason | null;
  categoryName?: string; // For REGEX_CATEGORY
}

// ===========================================
// File Operations
// ===========================================
export interface FileResult {
  path: string;
  type: 'pdf' | 'text' | 'docx';
  content?: string;
}
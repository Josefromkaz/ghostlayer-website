/**
 * GhostLayer Desktop - Type Definitions
 *
 * These types are used throughout the React frontend.
 * For shared types between frontend and backend, see shared/types.ts
 */

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
  // New categories
  EIN = 'EIN',
  SSN = 'SSN',
  ROUTING_NUMBER = 'ROUTING_NUMBER',
  DRIVER_LICENSE = 'DRIVER_LICENSE',
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
  start: number;
  end: number;
  category: RedactionCategory;
  isRedacted: boolean;
  ruleId?: string;
  replacementTag?: string;
  excluded?: boolean;      // временное исключение для текущего документа
  excludedAt?: number;     // timestamp исключения
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

// ===========================================
// File Operations
// ===========================================
export interface FileResult {
  path: string;
  type: 'pdf' | 'text';
  content?: string;
}
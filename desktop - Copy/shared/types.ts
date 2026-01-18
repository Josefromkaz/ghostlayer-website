/**
 * Shared Type Definitions for GhostLayer Desktop
 *
 * This file contains type definitions shared between the Electron main process
 * and the React renderer process. Import from here to ensure type consistency.
 */

// ===========================================
// License Types
// ===========================================
export type LicenseType = 'FREE' | 'PRO' | 'TRIAL' | 'TEAM' | 'EXPIRED' | 'TAMPERED';

export interface LicenseInfo {
  valid: boolean;
  type: LicenseType;
  expirationDate?: string | Date;
  userId?: string;
  reason?: string;
}

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

export interface WhitelistItem {
  id: string;
  phrase: string;
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
// File Operations
// ===========================================
export interface FileResult {
  path: string;
  type: 'pdf' | 'text';
  content?: string;
}

// ===========================================
// Redaction Types
// ===========================================
export enum RedactionCategory {
  USER_MEMORY = 'USER_MEMORY',
  CUSTOM = 'CUSTOM',
  WHITELIST = 'WHITELIST',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  URL = 'URL',
  CREDIT_CARD = 'CREDIT_CARD',
  IBAN = 'IBAN',
  RF_PASSPORT = 'RF_PASSPORT',
  SNILS = 'SNILS',
  INN = 'INN',
  KZ_IIN = 'KZ_IIN',
  KZ_ID = 'KZ_ID',
  KZ_PASSPORT = 'KZ_PASSPORT',
  KZ_PHONE = 'KZ_PHONE',
  KZ_VEHICLE = 'KZ_VEHICLE',
  KZ_ADDRESS = 'KZ_ADDRESS',
  KZ_LEGAL_CASE = 'KZ_LEGAL_CASE',
  KZ_IBAN = 'KZ_IBAN',
  POSTAL_CODE = 'POSTAL_CODE',
  LICENSE_PLATE = 'LICENSE_PLATE',
  COMPANY = 'COMPANY',
  ADDRESS = 'ADDRESS',
  GOVERNMENT_BODY = 'GOVERNMENT_BODY',
  DATE = 'DATE',
  BANK_ACCOUNT = 'BANK_ACCOUNT',
}

export interface Match {
  id: string;
  text: string;
  start: number;
  end: number;
  category: RedactionCategory;
  isRedacted: boolean;
  ruleId?: string;
  replacementTag?: string;
}

export interface UserRule {
  id: string;
  text: string;
  category: RedactionCategory;
  enabled: boolean;
}

export interface CustomPattern {
  id: string;
  name: string;
  regex: string;
  category: string;
  active: boolean;
}

export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  isDefault?: boolean;
  createdAt?: number;
}

export interface TextSegment {
  id: string;
  text: string;
  isMatch: boolean;
  match?: Match;
}

// ===========================================
// API Types (for IPC communication)
// ===========================================
export interface GhostLayerAPI {
  license: {
    getInfo: () => Promise<LicenseInfo>;
    activate: (key: string) => Promise<LicenseInfo>;
    canUseFeature: (feature: string) => Promise<boolean>;
    isPro: () => Promise<boolean>;
  };
  rules: {
    getAll: () => Promise<LearningRule[]>;
    add: (pattern: string, category?: string) => Promise<string>;
    delete: (id: string) => Promise<boolean>;
    toggle: (id: string, enabled: boolean) => Promise<boolean>;
  };
  prompts: {
    getAll: () => Promise<Prompt[]>;
    save: (prompt: { id?: string; name: string; content: string }) => Promise<string>;
    delete: (id: string) => Promise<boolean>;
  };
  whitelist: {
    getAll: () => Promise<WhitelistItem[]>;
    add: (phrase: string) => Promise<string>;
    delete: (id: string) => Promise<boolean>;
  };
  patterns: {
    getAll: () => Promise<CustomPatternRecord[]>;
    add: (pattern: { name: string; regex: string; category: string }) => Promise<string>;
    delete: (id: string) => Promise<boolean>;
  };
  file: {
    open: () => Promise<FileResult | null>;
    save: (content: string, defaultName: string) => Promise<string | null>;
    readPdf: (path: string) => Promise<Buffer | null>;
  };
  settings: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<boolean>;
  };
  app: {
    getVersion: () => Promise<string>;
    getPlatform: () => Promise<NodeJS.Platform>;
  };
  platform: NodeJS.Platform;
  version: string;
}

// ===========================================
// Window Type Extension
// ===========================================
declare global {
  interface Window {
    ghostlayer: GhostLayerAPI;
  }
}

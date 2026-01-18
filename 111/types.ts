export enum RedactionCategory {
  USER_MEMORY = 'MEMORY',
  CUSTOM = 'CUSTOM',
  WHITELIST = 'WHITELIST',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  URL = 'URL',
  CREDIT_CARD = 'CREDIT_CARD',
  DATE = 'DATE',
  RF_PASSPORT = 'RF_PASSPORT',
  SNILS = 'SNILS',
  INN = 'INN',
  KZ_IIN = 'KZ_IIN',
  KZ_ID = 'KZ_ID',
  KZ_PASSPORT = 'KZ_PASSPORT',
}

export interface PatternConfig {
  id: string;
  name: string;
  category: RedactionCategory;
  regex: RegExp;
  color: string;
  replacement: string;
}

export interface CustomPattern {
  id: string;
  name: string;
  regex: string; // Stored as string, compiled at runtime
  active: boolean;
}

export interface UserRule {
  id: string;
  text: string;
  category: RedactionCategory;
}

export interface Match {
  id: string;
  text: string;
  start: number;
  end: number;
  category: RedactionCategory;
  isRedacted: boolean;
  ruleId?: string; // If matched by a specific system rule
  replacementTag?: string; // e.g. [EMAIL_1]
}

export interface TextSegment {
  id: string;
  text: string;
  isMatch: boolean;
  match?: Match;
}

export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
}
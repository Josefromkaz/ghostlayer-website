import { MatchCategory, RegexPattern } from '../types';

export const CATEGORY_STYLES: Record<MatchCategory, { bg: string; text: string; label: string }> = {
  EMAIL: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Email' },
  PHONE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Phone' },
  URL: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Link' },
  DATE: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Date' },
  CREDIT_CARD: { bg: 'bg-red-100', text: 'text-red-700', label: 'Card' },
  PASSPORT: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Passport' },
  NATIONAL_ID: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'National ID' },
  TAX_ID: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Tax ID' },
  SOCIAL_SECURITY: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Social Security' },
  DOCUMENT_NUMBER: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'Document' },
  IBAN: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'IBAN' },
  ADDRESS: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Address' },
  NAME: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Name' },
  VEHICLE: { bg: 'bg-lime-100', text: 'text-lime-700', label: 'Vehicle' },
  LEGAL_CASE: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Legal Case' },
  MEMORY: { bg: 'bg-emerald-200', text: 'text-emerald-800', label: 'Memory' },
  CUSTOM: { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', label: 'Custom' },
  WHITELIST: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Whitelist' },
  UNKNOWN: { bg: 'bg-gray-200', text: 'text-gray-700', label: 'Unknown' },
};

export const SYSTEM_PATTERNS: RegexPattern[] = [
  // === HIGH PRIORITY (specific patterns first) ===

  // Email - very specific, run first
  { id: 'email', label: 'Email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, category: 'EMAIL', colorClass: CATEGORY_STYLES.EMAIL.bg, textClass: CATEGORY_STYLES.EMAIL.text },

  // URL
  { id: 'url', label: 'URL', pattern: /\b(?:https?:\/\/|www\.)\S+\b/g, category: 'URL', colorClass: CATEGORY_STYLES.URL.bg, textClass: CATEGORY_STYLES.URL.text },

  // Credit Card (16 digits with separators)
  { id: 'credit_card', label: 'Credit Card', pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, category: 'CREDIT_CARD', colorClass: CATEGORY_STYLES.CREDIT_CARD.bg, textClass: CATEGORY_STYLES.CREDIT_CARD.text },

  // IBAN
  { id: 'iban', label: 'IBAN', pattern: /\b[A-Z]{2}\d{2}[\s]?[A-Z0-9]{4}[\s]?[A-Z0-9]{4}[\s]?[A-Z0-9]{4}[\s]?[A-Z0-9]{0,14}\b/g, category: 'IBAN', colorClass: CATEGORY_STYLES.IBAN.bg, textClass: CATEGORY_STYLES.IBAN.text },

  // === SOCIAL SECURITY / TAX IDs (specific formats) ===

  // US SSN: 123-45-6789 (must have separators)
  { id: 'ssn_us', label: 'SSN (US)', pattern: /\b\d{3}-\d{2}-\d{4}\b/g, category: 'SOCIAL_SECURITY', colorClass: CATEGORY_STYLES.SOCIAL_SECURITY.bg, textClass: CATEGORY_STYLES.SOCIAL_SECURITY.text },

  // Russian SNILS: 123-456-789 12
  { id: 'snils_ru', label: 'SNILS', pattern: /\b\d{3}-\d{3}-\d{3}\s\d{2}\b/g, category: 'SOCIAL_SECURITY', colorClass: CATEGORY_STYLES.SOCIAL_SECURITY.bg, textClass: CATEGORY_STYLES.SOCIAL_SECURITY.text },

  // UK NINO: AB 12 34 56 C
  { id: 'nino_uk', label: 'NINO (UK)', pattern: /\b[A-CEGHJ-PR-TW-Z]{2}[\s]?\d{2}[\s]?\d{2}[\s]?\d{2}[\s]?[A-D]\b/gi, category: 'SOCIAL_SECURITY', colorClass: CATEGORY_STYLES.SOCIAL_SECURITY.bg, textClass: CATEGORY_STYLES.SOCIAL_SECURITY.text },

  // Canadian SIN: 123-456-789 (with separators)
  { id: 'sin_ca', label: 'SIN (CA)', pattern: /\b\d{3}-\d{3}-\d{3}\b/g, category: 'SOCIAL_SECURITY', colorClass: CATEGORY_STYLES.SOCIAL_SECURITY.bg, textClass: CATEGORY_STYLES.SOCIAL_SECURITY.text },

  // US EIN: 12-3456789 (must have hyphen)
  { id: 'ein_us', label: 'EIN (US)', pattern: /\b\d{2}-\d{7}\b/g, category: 'TAX_ID', colorClass: CATEGORY_STYLES.TAX_ID.bg, textClass: CATEGORY_STYLES.TAX_ID.text },

  // UK VAT: GB123456789
  { id: 'vat_uk', label: 'VAT (UK)', pattern: /\bGB[\s]?\d{3}[\s]?\d{4}[\s]?\d{2}\b/gi, category: 'TAX_ID', colorClass: CATEGORY_STYLES.TAX_ID.bg, textClass: CATEGORY_STYLES.TAX_ID.text },

  // === DOCUMENT NUMBERS (with prefixes/context) ===

  // Contract/Agreement/Policy numbers: PSA-2025-0847, PLI-2024-8847291, TVC-2019-0234
  { id: 'document_num', label: 'Document No.', pattern: /\b[A-Z]{2,4}-\d{4}-\d{3,10}\b/g, category: 'DOCUMENT_NUMBER', colorClass: CATEGORY_STYLES.DOCUMENT_NUMBER.bg, textClass: CATEGORY_STYLES.DOCUMENT_NUMBER.text },

  // Driver License (CA format): D4829571
  { id: 'driver_license_ca', label: 'Driver License', pattern: /\b[A-Z]\d{7}\b/g, category: 'DOCUMENT_NUMBER', colorClass: CATEGORY_STYLES.DOCUMENT_NUMBER.bg, textClass: CATEGORY_STYLES.DOCUMENT_NUMBER.text },

  // === DATES ===

  { id: 'date_numeric', label: 'Date', pattern: /\b\d{1,4}[.\/-]\d{1,2}[.\/-]\d{1,4}\b/g, category: 'DATE', colorClass: CATEGORY_STYLES.DATE.bg, textClass: CATEGORY_STYLES.DATE.text },
  { id: 'date_text_en', label: 'Date (EN)', pattern: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{2,4}\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?,?\s+\d{2,4}\b/gi, category: 'DATE', colorClass: CATEGORY_STYLES.DATE.bg, textClass: CATEGORY_STYLES.DATE.text },
  { id: 'date_text_ru', label: 'Date (RU)', pattern: /\b\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+\d{2,4}\b/gi, category: 'DATE', colorClass: CATEGORY_STYLES.DATE.bg, textClass: CATEGORY_STYLES.DATE.text },

  // === PHONE (require separators to avoid false positives) ===

  // International phone: +1 234 567 89 00
  { id: 'phone_intl', label: 'Phone (Intl)', pattern: /(?:\+|00)\d{1,3}[\s.-]?\(?\d{2,3}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g, category: 'PHONE', colorClass: CATEGORY_STYLES.PHONE.bg, textClass: CATEGORY_STYLES.PHONE.text },

  // US Phone with parentheses: (415) 555-7823
  { id: 'phone_us_parens', label: 'Phone (US)', pattern: /\(\d{3}\)[\s.-]?\d{3}[\s.-]?\d{4}/g, category: 'PHONE', colorClass: CATEGORY_STYLES.PHONE.bg, textClass: CATEGORY_STYLES.PHONE.text },

  // US Phone with dashes/dots (MUST have separators): 415-555-7823, 415.555.7823
  { id: 'phone_us_dashes', label: 'Phone (US)', pattern: /\b\d{3}[-.]\d{3}[-.]\d{4}\b/g, category: 'PHONE', colorClass: CATEGORY_STYLES.PHONE.bg, textClass: CATEGORY_STYLES.PHONE.text },

  // US Phone with spaces: 415 555 7823
  { id: 'phone_us_spaces', label: 'Phone (US)', pattern: /\b\d{3}\s\d{3}\s\d{4}\b/g, category: 'PHONE', colorClass: CATEGORY_STYLES.PHONE.bg, textClass: CATEGORY_STYLES.PHONE.text },

  // === VEHICLE ===

  { id: 'vehicle_plate', label: 'License Plate', pattern: /\b[A-Z]\d{3}[A-Z]{2,3}\d{2}\b/gi, category: 'VEHICLE', colorClass: CATEGORY_STYLES.VEHICLE.bg, textClass: CATEGORY_STYLES.VEHICLE.text },
  { id: 'vin', label: 'VIN', pattern: /\b[A-HJ-NPR-Z0-9]{17}\b/g, category: 'VEHICLE', colorClass: CATEGORY_STYLES.VEHICLE.bg, textClass: CATEGORY_STYLES.VEHICLE.text },

  // === ADDRESS (postal codes) ===

  { id: 'zipcode_us', label: 'ZIP (US)', pattern: /\b\d{5}(?:-\d{4})?\b/g, category: 'ADDRESS', colorClass: CATEGORY_STYLES.ADDRESS.bg, textClass: CATEGORY_STYLES.ADDRESS.text },
  { id: 'postcode_uk', label: 'Postcode (UK)', pattern: /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi, category: 'ADDRESS', colorClass: CATEGORY_STYLES.ADDRESS.bg, textClass: CATEGORY_STYLES.ADDRESS.text },
  { id: 'postcode_ca', label: 'Postal (CA)', pattern: /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/gi, category: 'ADDRESS', colorClass: CATEGORY_STYLES.ADDRESS.bg, textClass: CATEGORY_STYLES.ADDRESS.text },

  // === LOW PRIORITY (generic patterns - may have false positives) ===

  // Passport (10 digits with optional space): 1234 567890
  { id: 'passport', label: 'Passport', pattern: /\b\d{4}\s\d{6}\b/g, category: 'PASSPORT', colorClass: CATEGORY_STYLES.PASSPORT.bg, textClass: CATEGORY_STYLES.PASSPORT.text },

  // National ID 12 digits (IIN, etc.) - only standalone
  { id: 'national_id_12', label: 'National ID (12)', pattern: /\b\d{12}\b/g, category: 'NATIONAL_ID', colorClass: CATEGORY_STYLES.NATIONAL_ID.bg, textClass: CATEGORY_STYLES.NATIONAL_ID.text },

  // Account/Routing numbers (9-10 digits standalone)
  { id: 'account_num', label: 'Account No.', pattern: /\b\d{9,10}\b/g, category: 'DOCUMENT_NUMBER', colorClass: CATEGORY_STYLES.DOCUMENT_NUMBER.bg, textClass: CATEGORY_STYLES.DOCUMENT_NUMBER.text },
];

export type MatchCategory =
  | 'EMAIL'
  | 'PHONE'
  | 'URL'
  | 'DATE'
  | 'CREDIT_CARD'
  | 'PASSPORT'           // Universal passport/ID document
  | 'NATIONAL_ID'        // National identification numbers (SSN, IIN, etc.)
  | 'TAX_ID'             // Tax identification numbers (INN, TIN, etc.)
  | 'SOCIAL_SECURITY'    // Social security numbers (SNILS, SSN, etc.)
  | 'DOCUMENT_NUMBER'    // Generic document numbers (ID cards, etc.)
  | 'IBAN'               // International Bank Account Number
  | 'ADDRESS'            // Physical addresses
  | 'NAME'               // Person names
  | 'VEHICLE'            // Vehicle plates/VINs
  | 'LEGAL_CASE'         // Legal case numbers
  | 'MEMORY'
  | 'CUSTOM'
  | 'WHITELIST'
  | 'UNKNOWN';

export interface RegexPattern {
  id: string;
  label: string;
  pattern: RegExp;
  category: MatchCategory;
  colorClass: string; // Tailwind bg color class
  textClass: string; // Tailwind text color class
}

export interface RedactionMatch {
  id: string;
  start: number;
  end: number;
  text: string;
  category: MatchCategory;
  isRedacted: boolean;
  ruleSource: 'SYSTEM' | 'USER_MEMORY';
}

export interface UserRule {
  id: string;
  text: string;
  isActive: boolean;
}

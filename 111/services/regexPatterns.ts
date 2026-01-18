import { PatternConfig, RedactionCategory } from '../types';

// Helper to generate distinct colors for categories
export const CATEGORY_COLORS: Record<RedactionCategory, string> = {
  [RedactionCategory.USER_MEMORY]: 'bg-teal-100 text-teal-800 border-teal-300',
  [RedactionCategory.CUSTOM]: 'bg-pink-100 text-pink-800 border-pink-300',
  [RedactionCategory.WHITELIST]: 'bg-slate-200 text-slate-800 border-slate-300',
  [RedactionCategory.EMAIL]: 'bg-orange-100 text-orange-800 border-orange-300',
  [RedactionCategory.PHONE]: 'bg-green-100 text-green-800 border-green-300',
  [RedactionCategory.URL]: 'bg-blue-100 text-blue-800 border-blue-300',
  [RedactionCategory.CREDIT_CARD]: 'bg-red-100 text-red-800 border-red-300',
  [RedactionCategory.DATE]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  // Regional - RU
  [RedactionCategory.RF_PASSPORT]: 'bg-purple-100 text-purple-800 border-purple-300',
  [RedactionCategory.SNILS]: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  [RedactionCategory.INN]: 'bg-violet-100 text-violet-800 border-violet-300',
  // Regional - KZ
  [RedactionCategory.KZ_IIN]: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  [RedactionCategory.KZ_ID]: 'bg-sky-100 text-sky-800 border-sky-300',
  [RedactionCategory.KZ_PASSPORT]: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
};

export const SYSTEM_PATTERNS: PatternConfig[] = [
  // --- General ---
  {
    id: 'email',
    name: 'Email Address',
    category: RedactionCategory.EMAIL,
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    color: CATEGORY_COLORS[RedactionCategory.EMAIL],
    replacement: '[EMAIL]',
  },
  {
    id: 'phone',
    name: 'Phone Number',
    category: RedactionCategory.PHONE,
    regex: /(\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?/g,
    color: CATEGORY_COLORS[RedactionCategory.PHONE],
    replacement: '[PHONE]',
  },
  {
    id: 'url',
    name: 'URL / Website',
    category: RedactionCategory.URL,
    regex: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
    color: CATEGORY_COLORS[RedactionCategory.URL],
    replacement: '[URL]',
  },
  {
    id: 'credit_card',
    name: 'Credit Card',
    category: RedactionCategory.CREDIT_CARD,
    regex: /\b(?:\d[ -]*?){13,16}\b/g,
    color: CATEGORY_COLORS[RedactionCategory.CREDIT_CARD],
    replacement: '[CARD]',
  },
  {
    id: 'date',
    name: 'Date',
    category: RedactionCategory.DATE,
    regex: /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g,
    color: CATEGORY_COLORS[RedactionCategory.DATE],
    replacement: '[DATE]',
  },

  // --- Regional: CIS / Russia ---
  {
    id: 'rf_passport',
    name: 'RF Passport',
    category: RedactionCategory.RF_PASSPORT,
    // Series 4 digits, Space/NoSpace, Number 6 digits
    regex: /\b\d{4}[\s-]?\d{6}\b/g,
    color: CATEGORY_COLORS[RedactionCategory.RF_PASSPORT],
    replacement: '[RF_PASS]',
  },
  {
    id: 'snils',
    name: 'SNILS (RU)',
    category: RedactionCategory.SNILS,
    // 000-000-000 00 or 000-000-000-00
    regex: /\b\d{3}-\d{3}-\d{3}[\s-]?\d{2}\b/g,
    color: CATEGORY_COLORS[RedactionCategory.SNILS],
    replacement: '[SNILS]',
  },
  {
    id: 'inn',
    name: 'INN (RU)',
    category: RedactionCategory.INN,
    // 10 or 12 digits
    regex: /\b\d{10}\b|\b\d{12}\b/g,
    color: CATEGORY_COLORS[RedactionCategory.INN],
    replacement: '[INN]',
  },

  // --- Regional: Kazakhstan ---
  {
    id: 'kz_iin',
    name: 'IIN / BIN (KZ)',
    category: RedactionCategory.KZ_IIN,
    // 12 digits strictly
    regex: /\b\d{12}\b/g,
    color: CATEGORY_COLORS[RedactionCategory.KZ_IIN],
    replacement: '[IIN]',
  },
  {
    id: 'kz_id',
    name: 'ID Card (KZ)',
    category: RedactionCategory.KZ_ID,
    // 9 digits
    regex: /\b\d{9}\b/g,
    color: CATEGORY_COLORS[RedactionCategory.KZ_ID],
    replacement: '[KZ_ID]',
  },
  {
    id: 'kz_passport',
    name: 'Passport (KZ)',
    category: RedactionCategory.KZ_PASSPORT,
    // N + 8 digits
    regex: /\b[Nn]\d{8}\b/g,
    color: CATEGORY_COLORS[RedactionCategory.KZ_PASSPORT],
    replacement: '[KZ_PASS]',
  },
];
import { PatternConfig, RedactionCategory } from '../types';
import { luhnCheck, validateKzIin, validateRuInn } from './validators';

// Helper for US SSN validation (optional, could be added to validators.ts)
const validateUsSsn = (ssn: string) => {
  const clean = ssn.replace(/[- ]/g, '');
  return /^\d{9}$/.test(clean);
};


// ==================== SMART REGEX LOGIC ====================
export const generateSmartPattern = (text: string): string => {
  const cleanText = text.trim();
  if (cleanText.includes(' ')) {
    return cleanText.replace(/[.*+?^${}()|[\\]/g, '\\$&');
  }
  if (cleanText.length < 4) {
    return `\\b${cleanText}\\b`;
  }
  let stem = cleanText;
  if (/[аяоеиыьйАЯОЕИЫЬЙ]$/.test(cleanText)) {
    stem = cleanText.slice(0, -1);
  }
  return `\\b${stem}[а-яА-Яa-zA-ZәіңғүұқөһӘІҢҒҮҰҚӨҺ]{0,4}\\b`;
};

// ==================== COLORS & PATTERNS ====================

export const CATEGORY_COLORS: Record<RedactionCategory, string> = {
  [RedactionCategory.USER_MEMORY]: 'bg-teal-100 text-teal-800 border-teal-300',
  [RedactionCategory.CUSTOM]: 'bg-pink-100 text-pink-800 border-pink-300',
  [RedactionCategory.WHITELIST]: 'bg-slate-200 text-slate-800 border-slate-300',
  [RedactionCategory.EMAIL]: 'bg-orange-100 text-orange-800 border-orange-300',
  [RedactionCategory.PHONE]: 'bg-green-100 text-green-800 border-green-300',
  [RedactionCategory.URL]: 'bg-blue-100 text-blue-800 border-blue-300',
  [RedactionCategory.CREDIT_CARD]: 'bg-red-100 text-red-800 border-red-300',
  [RedactionCategory.DATE]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  [RedactionCategory.RF_PASSPORT]: 'bg-purple-100 text-purple-800 border-purple-300',
  [RedactionCategory.SNILS]: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  [RedactionCategory.INN]: 'bg-violet-100 text-violet-800 border-violet-300',
  [RedactionCategory.EIN]: 'bg-violet-100 text-violet-800 border-violet-300', // Reusing INN color
  [RedactionCategory.SSN]: 'bg-indigo-100 text-indigo-800 border-indigo-300', // Reusing SNILS color
  [RedactionCategory.DRIVER_LICENSE]: 'bg-red-100 text-red-800 border-red-300', // Reusing ID Doc color
  [RedactionCategory.ROUTING_NUMBER]: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  [RedactionCategory.KZ_IIN]: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  [RedactionCategory.KZ_ID]: 'bg-sky-100 text-sky-800 border-sky-300',
  [RedactionCategory.KZ_PASSPORT]: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
  [RedactionCategory.KZ_PHONE]: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  [RedactionCategory.KZ_VEHICLE]: 'bg-slate-100 text-slate-800 border-slate-300',
  [RedactionCategory.KZ_ADDRESS]: 'bg-amber-100 text-amber-800 border-amber-300',
  [RedactionCategory.KZ_LEGAL_CASE]: 'bg-rose-100 text-rose-800 border-rose-300',
  [RedactionCategory.KZ_IBAN]: 'bg-teal-100 text-teal-800 border-teal-300',
  [RedactionCategory.IBAN]: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  [RedactionCategory.BANK_ACCOUNT]: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  [RedactionCategory.POSTAL_CODE]: 'bg-stone-100 text-stone-800 border-stone-300',
  [RedactionCategory.LICENSE_PLATE]: 'bg-gray-100 text-gray-800 border-gray-300',
  [RedactionCategory.GOV_BODY]: 'bg-amber-100 text-amber-800 border-amber-300',
  [RedactionCategory.COMPANY]: 'bg-blue-100 text-blue-800 border-blue-300',
  [RedactionCategory.ADDRESS]: 'bg-violet-100 text-violet-800 border-violet-300',
  [RedactionCategory.PERSON_NAME]: 'bg-lime-100 text-lime-800 border-lime-300',
  [RedactionCategory.CONTRACT_NUMBER]: 'bg-orange-100 text-orange-800 border-orange-300',
  [RedactionCategory.ID_DOCUMENT]: 'bg-red-100 text-red-800 border-red-300',
  [RedactionCategory.BIC]: 'bg-indigo-100 text-indigo-800 border-indigo-300',
};

export const SYSTEM_PATTERNS: PatternConfig[] = [
  // ==================== CONTEXTUAL ANCHORS (High Priority) ====================
  // Эти правила используют "якоря" (БИН:, Директор:), что делает совпадение длиннее.
  // Движок приоритезирует более длинные совпадения, поэтому "БИН: 123" победит просто "123".



  // Contract/Agreement Numbers
  // e.g., PSA-2025-0847, Agreement No. 1234
  {
    id: 'contract_number_en',
    name: 'Contract/Agreement No (EN)',
    category: RedactionCategory.CONTRACT_NUMBER,
    regex: /(?:Agreement|Contract|Policy|Reference)\s*(?:No\.?|Number|#)?\s*:?\s*[A-Z0-9]{2,10}[-\/][A-Z0-9-\/]+/gi,
    color: CATEGORY_COLORS[RedactionCategory.CONTRACT_NUMBER],
    replacement: '[CONTRACT_NO]',
  },
  // Номер договора: № 2024-127/КУ, №123-456, № КУ-2024/789
  {
    id: 'contract_number',
    name: 'Contract Number',
    category: RedactionCategory.CONTRACT_NUMBER,
    regex: /№\s*[\dА-Яа-яA-Za-z\-\/]+(?:\s+от\s+\d{1,2}[.\s]+[а-яА-Я]+\s+\d{4})?/gi,
    color: CATEGORY_COLORS[RedactionCategory.CONTRACT_NUMBER],
    replacement: '[CONTRACT_NO]',
  },
  // Удостоверение личности: № 036845921, выдано...
  {
    id: 'id_document',
    name: 'ID Document Number',
    category: RedactionCategory.ID_DOCUMENT,
    // Удостоверение личности: № 036845921
    regex: /(?:Удостоверение\s+личности|паспорт|документ)\s*:?\s*№?\s*\d{6,12}/gi,
    color: CATEGORY_COLORS[RedactionCategory.ID_DOCUMENT],
    replacement: '[ID_DOC]',
  },
  // БИК банка: CASPKZKA, SABRKZKA и т.д. (8-11 символов, начинается с букв)
  {
    id: 'bic_code',
    name: 'BIC/SWIFT Code',
    category: RedactionCategory.BIC,
    // БИК: CASPKZKA или просто CASPKZKA после "БИК:"
    regex: /(?:БИК|BIC|SWIFT)\s*:?\s*[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?/gi,
    color: CATEGORY_COLORS[RedactionCategory.BIC],
    replacement: '[BIC]',
  },
  // Дата рождения / дата в текстовом формате: 15 января 2025 года, 15 марта 1985 года
  {
    id: 'date_text_ru',
    name: 'Date (Text RU)',
    category: RedactionCategory.DATE,
    regex: /\b\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+\d{4}(?:\s+года?)?\b/gi,
    color: CATEGORY_COLORS[RedactionCategory.DATE],
    replacement: '[DATE]',
  },
  {
    id: 'context_bin',
    name: 'BIN/IIN (Context)',
    category: RedactionCategory.KZ_IIN,
    // Ищет "БИН:", "БИН", "BIN" + пробелы/двоеточия + 12 цифр
    regex: /(?:БИН|BIN|ИИН|IIN)\s*:?\s*\d{12}\b/gi,
    color: CATEGORY_COLORS[RedactionCategory.KZ_IIN],
    replacement: '[BIN]',
    // Мы не используем validator здесь, чтобы захватить весь контекст "БИН: ..."
    // Но можно добавить проверку самой цифровой части, если разбить логику.
    // Пока оставим так для надежности захвата.
  },
  {
    id: 'context_person',
    name: 'Person (Context)',
    category: RedactionCategory.USER_MEMORY,
    // Поддержка должностей и ролей + ФИО
    // "Генеральный директор:", "Финансовый директор", "ИП", "Гр." и т.д.
    regex: /(?:Генеральный\s+директор|Финансовый\s+директор|Директор|Сотрудник|Гр\.|Гражданин|Заявитель|Истец|Ответчик|Signed by|Employee|Manager|Контактное\s+лицо(?:\s+по\s+договору)?)\s*:?\s+(?:[А-ЯЁ][а-яёА-ЯЁ]+\s+){1,2}[А-ЯЁ][а-яёА-ЯЁ]+/g,
    color: CATEGORY_COLORS[RedactionCategory.USER_MEMORY],
    replacement: '[PERSON]',
  },
  // English Context Persons
  // e.g. "Represented by: Michael Jonathan Richardson"
  // e.g. "Name: Amanda Grace Foster"
  {
    id: 'context_person_en',
    name: 'Person (Context EN)',
    category: RedactionCategory.PERSON_NAME,
    regex: /(?:Represented\s+by|Project\s+Lead|Manager|CEO|Officer|Partner|Secretary|Contact|Name|Witnessed\s+By)\s*:?\s+([A-Z][a-z]+\s+){1,3}[A-Z][a-z]+/g,
    color: CATEGORY_COLORS[RedactionCategory.PERSON_NAME],
    replacement: '[PERSON_NAME]',
  },
  // ИП + ФИО (без кавычек): ИП Султанов Ерлан Болатович
  {
    id: 'ip_person',
    name: 'Individual Entrepreneur',
    category: RedactionCategory.USER_MEMORY,
    // ИП + Фамилия Имя Отчество (3 слова) или ИП + Фамилия И.О.
    regex: /(?:ИП|Индивидуальный\s+предприниматель)\s+[А-ЯЁ][а-яёА-ЯЁ]+\s+(?:[А-ЯЁ][а-яёА-ЯЁ]+\s+[А-ЯЁ][а-яёА-ЯЁ]+|[А-ЯЁ]\.[А-ЯЁ]?\.?)/g,
    color: CATEGORY_COLORS[RedactionCategory.USER_MEMORY],
    replacement: '[PERSON]',
  },
  // ФИО в формате "Фамилия Имя Отчество" - три слова с заглавной, где отчество заканчивается на -вич/-вна
  // Также ловит падежные формы: Нурланова Ержана Кайратовича, Касымовой Айгуль Маратовной
  {
    id: 'fio_patronymic',
    name: 'Full Name (Patronymic)',
    category: RedactionCategory.PERSON_NAME,
    // Отчество: -вич/-вна + падежные окончания (-а, -у, -ом, -ой, -е)
    regex: /\b[А-ЯЁ][а-яёА-ЯЁ]+\s+[А-ЯЁ][а-яёА-ЯЁ]+\s+[А-ЯЁ][а-яёА-ЯЁ]*(?:вич|вна|ович|овна|евич|евна|ич|ична)(?:а|у|ем|ом|ой|е)?\b/g,
    color: CATEGORY_COLORS[RedactionCategory.PERSON_NAME],
    replacement: '[PERSON_NAME]',
  },
  // Сокращенное ФИО: Султанов Е.Б., Нурланов Е.К.
  {
    id: 'fio_short',
    name: 'Name (Short)',
    category: RedactionCategory.PERSON_NAME,
    regex: /\b[А-ЯЁ][а-яёА-ЯЁ]+\s+[А-ЯЁ]\.[А-ЯЁ]?\./g,
    color: CATEGORY_COLORS[RedactionCategory.PERSON_NAME],
    replacement: '[PERSON_NAME]',
  },
  // English Names with Honorifics
  // e.g. Mr. John Doe, Mrs. Jane Doe
  {
    id: 'name_honorific',
    name: 'Name (Honorific)',
    category: RedactionCategory.PERSON_NAME,
    regex: /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g,
    color: CATEGORY_COLORS[RedactionCategory.PERSON_NAME],
    replacement: '[PERSON_NAME]',
  },
  {
    id: 'company_quoted',
    name: 'Company (Quoted)',
    category: RedactionCategory.COMPANY,
    // ТОО «КазТехИнвест» -> ищем форму собственности + что-то в кавычках
    regex: /(?:ТОО|ООО|АО|ИП|LLP|LLC|JSC)\s+["«''][^"»'']+["»'']/gi,
    color: CATEGORY_COLORS[RedactionCategory.COMPANY],
    replacement: '[COMPANY]',
  },
  // English Companies (Unquoted)
  // e.g. Apple Inc., Google LLC, Acme Corp., Silicon Valley Bank
  {
    id: 'company_en',
    name: 'Company (EN)',
    category: RedactionCategory.COMPANY,
    // Look for Capitalized words followed by legal suffix (Greedy match to avoid splitting "Limited Liability Company")
    // Note: Suffixes with dots (Inc.) shouldn't use \b after them because dot is non-word char.
    regex: /\b([A-Z][a-zA-Z0-9&]+\s+)+(?:(?:Inc\.|Ltd\.|Co\.|Corp\.)|(?:LLC|Corporation|Limited|Company|Bank)\b)/g,
    color: CATEGORY_COLORS[RedactionCategory.COMPANY],
    replacement: '[COMPANY]',
  },
  {
    id: 'address_full',
    name: 'Address (Full)',
    category: RedactionCategory.ADDRESS,
    // Полный адрес с индексом: 050000, г. Алматы, ул. Абая, д. 52
    regex: /\d{6},?\s+г\.\s*[А-ЯЁ][а-яёА-ЯЁ\-]+(?:,\s+(?:ул\.|улица|мкр\.|микрорайон|пр\.|проспект)\s+[А-Яа-яЁё0-9\-\.]+(?:[-\s]*\d+)?)?(?:,\s*(?:д\.|дом)\s*\d+[а-яА-Я]?)?/gi,
    color: CATEGORY_COLORS[RedactionCategory.ADDRESS],
    replacement: '[ADDRESS]',
  },
  {
    id: 'address_city_only',
    name: 'Address (City)',
    category: RedactionCategory.ADDRESS,
    // Только город без индекса: "г. Алматы" - но не перед цифрами (датой)
    // Используем word boundary чтобы не захватывать цифры после
    regex: /(?:город|г\.)\s+[А-ЯЁ][а-яёА-ЯЁ\-]{2,}(?=\s*[,\.\n]|\s+[а-яА-ЯЁё]|\s*$)/gi,
    color: CATEGORY_COLORS[RedactionCategory.ADDRESS],
    replacement: '[ADDRESS]',
  },
  // English Address (US/UK)
  // e.g. 123 Main St, Springfield, IL 62704
  {
    id: 'address_us_full',
    name: 'Address (US Full)',
    category: RedactionCategory.ADDRESS,
    regex: /\b\d+\s+[A-Z][a-z0-9\s]+(?:Street|St|Avenue|Ave|Drive|Dr|Road|Rd|Blvd|Lane|Ln|Way|Plaza|Sq)\b(?:.{1,50}?)?,\s*[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?/g,
    color: CATEGORY_COLORS[RedactionCategory.ADDRESS],
    replacement: '[ADDRESS]',
  },

  // ==================== GENERAL DATA ====================
  // US SSN
  {
    id: 'us_ssn',
    name: 'SSN (US)',
    category: RedactionCategory.SSN,
    regex: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g,
    color: CATEGORY_COLORS[RedactionCategory.SSN],
    replacement: '[SSN]',
    validator: validateUsSsn,
  },
  // US EIN (Employer Identification Number)
  {
    id: 'us_ein',
    name: 'EIN (US)',
    category: RedactionCategory.EIN,
    regex: /\b\d{2}-\d{7}\b/g,
    color: CATEGORY_COLORS[RedactionCategory.EIN],
    replacement: '[EIN]',
  },
  // US Routing Number (ABA)
  {
    id: 'us_routing',
    name: 'Routing Number (US)',
    category: RedactionCategory.ROUTING_NUMBER,
    regex: /\b(?:Routing\s+Number|ABA)\s*:?\s*(\d{9})\b/gi,
    color: CATEGORY_COLORS[RedactionCategory.ROUTING_NUMBER],
    replacement: '[ROUTING]',
  },
  // Bank Account Number (Contextual)
  {
    id: 'bank_account_context',
    name: 'Bank Account (Context)',
    category: RedactionCategory.BANK_ACCOUNT,
    regex: /\b(?:Account\s+Number|Account\s+No\.?|ACC)\s*:?\s*(\d{6,17})\b/gi,
    color: CATEGORY_COLORS[RedactionCategory.BANK_ACCOUNT],
    replacement: '[ACCOUNT]',
  },
  // Driver's License (Contextual but broad support for formats like D1234567)
  {
    id: 'driver_license_context',
    name: 'Driver License (Context)',
    category: RedactionCategory.DRIVER_LICENSE,
    regex: /\b(?:Driver'?s\s+License|DL|Lic)\s*:?\s*([A-Z0-9-]{5,20})\b/gi,
    color: CATEGORY_COLORS[RedactionCategory.DRIVER_LICENSE],
    replacement: '[LICENSE_ID]',
  },
  {
    id: 'email',
    name: 'Email Address',
    category: RedactionCategory.EMAIL,
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    color: CATEGORY_COLORS[RedactionCategory.EMAIL],
    replacement: '[EMAIL]',
  },
  {
    id: 'phone_intl',
    name: 'Phone (International)',
    category: RedactionCategory.PHONE,
    regex: /(\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?/g,
    color: CATEGORY_COLORS[RedactionCategory.PHONE],
    replacement: '[PHONE]',
  },
  {
    id: 'url',
    name: 'URL / Website',
    category: RedactionCategory.URL,
    regex: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g,
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
    validator: luhnCheck,
  },

  // ==================== KAZAKHSTAN SPECIFIC ====================
  {
    id: 'kz_iin',
    name: 'IIN / BIN (Raw)',
    category: RedactionCategory.KZ_IIN,
    regex: /\b\d{12}\b/g,
    color: CATEGORY_COLORS[RedactionCategory.KZ_IIN],
    replacement: '[IIN]',
    validator: validateKzIin,
  },
  {
    id: 'kz_phone',
    name: 'Phone (KZ)',
    category: RedactionCategory.KZ_PHONE,
    // Уточнили, чтобы не хватать просто длинные цифры, ищем +7 или 8 в начале
    regex: /(?:\+7|8)\s*\(?7\d{2}\)?\s*\d{3}[-\s]*\d{2}[-\s]*\d{2}/g,
    color: CATEGORY_COLORS[RedactionCategory.KZ_PHONE],
    replacement: '[KZ_PHONE]',
  },

  // ==================== RUSSIA SPECIFIC ====================
  {
    id: 'rf_passport',
    name: 'RF Passport',
    category: RedactionCategory.RF_PASSPORT,
    regex: /\b\d{4}\s?\d{6}\b/g,
    color: CATEGORY_COLORS[RedactionCategory.RF_PASSPORT],
    replacement: '[RF_PASS]',
  },
  {
    id: 'inn',
    name: 'INN (RU)',
    category: RedactionCategory.INN,
    regex: /\b\d{10}\b|\b\d{12}\b/g,
    color: CATEGORY_COLORS[RedactionCategory.INN],
    replacement: '[INN]',
    validator: validateRuInn,
  },

  // ==================== OTHER ====================
  {
    id: 'date',
    name: 'Date',
    category: RedactionCategory.DATE,
    regex: /\b(?:0[1-9]|[12][0-9]|3[01])[.\/-](?:0[1-9]|1[0-2])[.\/-](?:19|20)\d{2}\b/g,
    color: CATEGORY_COLORS[RedactionCategory.DATE],
    replacement: '[DATE]',
  },
  {
    id: 'iban',
    name: 'IBAN',
    category: RedactionCategory.IBAN,
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{12,30}\b/g,
    color: CATEGORY_COLORS[RedactionCategory.IBAN],
    replacement: '[IBAN]',
  },
  // Date (Text EN) - e.g. January 15, 2025
  {
    id: 'date_text_en',
    name: 'Date (Text EN)',
    category: RedactionCategory.DATE,
    regex: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
    color: CATEGORY_COLORS[RedactionCategory.DATE],
    replacement: '[DATE]',
  },
];

export function getCategoryColor(category: RedactionCategory | string): string {
  return CATEGORY_COLORS[category as RedactionCategory] || 'bg-gray-100 text-gray-800 border-gray-300';
}
import { v4 as uuidv4 } from 'uuid';
import { Match, RedactionCategory, CustomPattern, UserRule, WhitelistEntry } from '../types';
import { generateSmartPattern, getAvailablePatterns } from './regexPatterns';
import { logger } from './logger';

// ===========================================
// False Positive Blacklist Configuration
// ===========================================
export const FALSE_POSITIVE_BLACKLIST: string[] = [
  'г. Дата',      
  'П. Дата',      
  'N/A',          
  'TBD',          
  'TODO',         
];

function escapeRegExp(s: string) {
  return s.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}

function isBlacklistedFalsePositive(matchText: string): boolean {
  return FALSE_POSITIVE_BLACKLIST.some(pattern =>
    matchText.includes(pattern)
  );
}

// Helper to create a stable identity key for PII entities
function getIdentityKey(text: string, category: RedactionCategory): string {
  const clean = text.toLowerCase().trim();
  
  if (category === RedactionCategory.PERSON_NAME || category === RedactionCategory.USER_MEMORY) {
    const parts = clean.split(/["\s.,/]+/).filter(p => p.length > 1);
    if (parts.length >= 2) {
      return `${parts[0]}|${parts[parts.length - 1]}|${category}`;
    }
  }
  
  return `${clean}|${category}`;
}

export const runRedaction = async (
  text: string,
  userRules: UserRule[],
  customPatterns: CustomPattern[] = [],
  whitelist: (string | WhitelistEntry)[] = [],
  whitelistedCategories: string[] = []
): Promise<Match[]> => {
  const allMatches: Match[] = [];

  const whitelistPhrases: string[] = [];
  const whitelistCats: string[] = [...whitelistedCategories];

  whitelist.forEach(item => {
    if (typeof item === 'string') {
      whitelistPhrases.push(item);
    } else if (item.type === 'phrase') {
      whitelistPhrases.push(item.value);
    } else if (item.type === 'category') {
      whitelistCats.push(item.value);
    }
  });

  // Whitelist (Case Insensitive typically desired for phrases)
  whitelistPhrases.forEach(phrase => {
    if (!phrase.trim()) return;
    const escaped = escapeRegExp(phrase);
    const pattern = phrase.includes(' ') ? escaped : `\\b${escaped}\\b`;
    try {
      const regex = new RegExp(pattern, 'gi');
      let m;
      while ((m = regex.exec(text)) !== null) {
        allMatches.push({
          id: uuidv4(),
          text: m[0],
          start: m.index,
          end: m.index + m[0].length,
          category: RedactionCategory.WHITELIST,
          isRedacted: false,
        });
      }
    } catch (e) {
      logger.warn('RedactionEngine', `Invalid whitelist pattern: "${phrase}"`, e);
    }
  });

  // User Rules (Memory - Case Insensitive)
  userRules
    .filter(rule => rule.enabled !== false)
    .forEach((rule) => {
        if (!rule.text.trim()) return;
        try {
            const regex = new RegExp(generateSmartPattern(rule.text), 'gi');
            let m;
            while ((m = regex.exec(text)) !== null) {
            allMatches.push({
                id: uuidv4(),
                text: m[0],
                cleanText: m[0],
                start: m.index,
                end: m.index + m[0].length,
                category: rule.category || RedactionCategory.USER_MEMORY,
                isRedacted: true,
            });
            }
        } catch(e) {
          logger.warn('RedactionEngine', `Invalid user rule regex: "${rule.text}"`, e);
        }
  });

  // Custom Patterns (User provided regex)
  customPatterns
    .filter(p => p.active)
    .forEach(pattern => {
        if (!pattern.regex.trim()) return;
        try {
          const regex = new RegExp(pattern.regex, 'gi');
          let m;
          while ((m = regex.exec(text)) !== null) {
              allMatches.push({
                id: uuidv4(),
                text: m[0],
                cleanText: m[0],
                start: m.index,
                end: m.index + m[0].length,
                category: RedactionCategory.CUSTOM,
                isRedacted: true,
                ruleId: pattern.id
              });
          }
        } catch (e) {
          logger.warn('RedactionEngine', `Invalid custom pattern regex: "${pattern.name}"`, e);
        }
  });

  // SYSTEM PATTERNS - STRICT FLAGS (Respected from config)
  // Get patterns based on license (FREE gets only 5, PRO gets all 39)
  const availablePatterns = await getAvailablePatterns();
  availablePatterns.forEach((pattern) => {
    if (whitelistCats.includes(pattern.category)) return;

    // IMPORTANT: Reset lastIndex because RegExp objects are stateful with 'g' flag
    pattern.regex.lastIndex = 0;
    
    let m;
    try {
      // Use the pattern's regex DIRECTLY to respect its flags (case-sensitivity)
      while ((m = pattern.regex.exec(text)) !== null) {
        const matchText = m[0];
        if (isBlacklistedFalsePositive(matchText)) continue;
        if (pattern.validator && !pattern.validator(matchText)) continue;

        const cleanText = (pattern.useGroup1AsIdentity && m[1]) ? m[1] : matchText;

        allMatches.push({
          id: uuidv4(),
          text: m[0],
          cleanText: cleanText, 
          start: m.index,
          end: m.index + m[0].length,
          category: pattern.category,
          isRedacted: true,
          ruleId: pattern.id,
        });
      }
    } catch (e) {
      logger.error('RedactionEngine', `System pattern failure: ${pattern.id}`, e);
    }
  });

  const PROPAGATION_CATEGORIES = [
    RedactionCategory.PERSON_NAME,
    RedactionCategory.COMPANY,
    RedactionCategory.EMAIL,
    RedactionCategory.PHONE,
    RedactionCategory.ID_DOCUMENT,
    RedactionCategory.SSN,
    RedactionCategory.EIN,
    RedactionCategory.ADDRESS,
  ];

  const knownPII = new Map<string, RedactionCategory>();

  allMatches.forEach(m => {
    const piiValue = m.cleanText || m.text;
    if (PROPAGATION_CATEGORIES.includes(m.category) && piiValue.length > 3) {
      // Don't propagate generic single-word company parts like "Analytics"
      if (m.category === RedactionCategory.COMPANY && piiValue.split(/\s+/).length < 2) {
        return;
      }
      if (!knownPII.has(piiValue)) {
        knownPII.set(piiValue, m.category);
      }
    }
  });

  knownPII.forEach((category, piiText) => {
    const escapedText = escapeRegExp(piiText);
    // Use word boundaries. Case sensitivity depends on if we want "Michael" to match "michael".
    // Usually propagation SHOULD be case-insensitive to catch typos, but risk of false positives increases.
    // Let's keep it 'gi' for consistency propagation as it's searching for KNOWN names.
    try {
      const pattern = new RegExp(`\\b${escapedText}\\b`, 'gi');
      let m;
      while ((m = pattern.exec(text)) !== null) {
        allMatches.push({
          id: uuidv4(),
          text: m[0],
          cleanText: m[0],
          start: m.index,
          end: m.index + m[0].length,
          category: category,
          isRedacted: true,
          ruleId: 'consistency_propagation'
        });
      }
    } catch (e) {
      logger.warn('RedactionEngine', `Propagation regex error for "${piiText}"`, e);
    }
  });

  const whitelistRanges: Array<{start: number, end: number}> = [];
  allMatches
    .filter(m => m.category === RedactionCategory.WHITELIST)
    .forEach(m => whitelistRanges.push({ start: m.start, end: m.end }));

  const nonWhitelistMatches = allMatches.filter(m => {
    if (m.category === RedactionCategory.WHITELIST) return false;
    for (const range of whitelistRanges) {
      if (m.start >= range.start && m.end <= range.end) return false;
    }
    return true;
  });

  nonWhitelistMatches.sort((a, b) => {
    // Priority 1: Custom Patterns win over System Patterns
    if (a.category === RedactionCategory.CUSTOM && b.category !== RedactionCategory.CUSTOM) return -1;
    if (b.category === RedactionCategory.CUSTOM && a.category !== RedactionCategory.CUSTOM) return 1;

    // Priority 2: Longer matches win
    const lenDiff = (b.end - b.start) - (a.end - a.start);
    if (lenDiff !== 0) return lenDiff;
    return a.start - b.start;
  });

  const finalMatches: Match[] = [];
  const occupiedIndices = new Set<number>();

  for (const match of nonWhitelistMatches) {
    let isClean = true;
    for (let i = match.start; i < match.end; i++) {
      if (occupiedIndices.has(i)) {
        isClean = false;
        break;
      }
    }
    if (isClean) {
      finalMatches.push(match);
      for (let i = match.start; i < match.end; i++) occupiedIndices.add(i);
    }
  }

  finalMatches.sort((a, b) => a.start - b.start);

  const categoryCounters: Record<string, number> = {};
  const entityMap: Record<string, string> = {}; 

  return finalMatches.map(match => {
    if (!match.isRedacted) return match;

    const identityText = match.cleanText || match.text;
    const key = getIdentityKey(identityText, match.category);
    
    if (entityMap[key]) {
      return { ...match, replacementTag: entityMap[key] };
    }

    if (!categoryCounters[match.category]) {
      categoryCounters[match.category] = 0;
    }
    categoryCounters[match.category]++;
    
    const index = categoryCounters[match.category];
    const tag = `[${match.category}_${index}]`;
    
    entityMap[key] = tag;
    return { ...match, replacementTag: tag };
  });
};

export function restoreText(redactedText: string, matches: Match[]): string {
  let restored = redactedText;
  const tagRegex = /[[A-Z_]+_\d+]/g;
  const tagMap = new Map<string, string>();
  matches.forEach(m => {
    if (m.isRedacted && m.replacementTag) tagMap.set(m.replacementTag, m.text);
  });
  restored = restored.replace(tagRegex, (fullMatch) => tagMap.get(fullMatch) || fullMatch);
  return restored;
}

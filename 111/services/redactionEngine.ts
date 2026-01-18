import { v4 as uuidv4 } from 'uuid';
import { Match, RedactionCategory, CustomPattern, UserRule } from '../types';
import { SYSTEM_PATTERNS } from './regexPatterns';

// Escape string for use in RegExp
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const runRedaction = (
  text: string,
  userRules: UserRule[],
  customPatterns: CustomPattern[] = [],
  whitelist: string[] = []
): Match[] => {
  let allMatches: Match[] = [];

  // 0. Process Whitelist (Highest Priority)
  whitelist.forEach(phrase => {
    if (!phrase.trim()) return;
    const regex = new RegExp(escapeRegExp(phrase), 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      allMatches.push({
        id: uuidv4(),
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        category: RedactionCategory.WHITELIST,
        isRedacted: false,
      });
    }
  });

  // 1. Process User Rules (Memory)
  userRules.forEach((rule) => {
    if (!rule.text.trim()) return;
    const regex = new RegExp(escapeRegExp(rule.text), 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      allMatches.push({
        id: uuidv4(),
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        category: rule.category || RedactionCategory.USER_MEMORY,
        isRedacted: true,
      });
    }
  });

  // 2. Process Custom Patterns
  customPatterns.forEach(pattern => {
    if (!pattern.active || !pattern.regex.trim()) return;
    try {
      const regex = new RegExp(pattern.regex, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        allMatches.push({
          id: uuidv4(),
          text: match[0],
          start: match.index,
          end: match.index + match[0].length,
          category: RedactionCategory.CUSTOM,
          isRedacted: true,
          ruleId: pattern.id
        });
      }
    } catch (e) {
      console.warn(`Invalid regex in custom pattern ${pattern.name}:`, e);
    }
  });

  // 3. Process System Patterns
  SYSTEM_PATTERNS.forEach((pattern) => {
    pattern.regex.lastIndex = 0; 
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      allMatches.push({
        id: uuidv4(),
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        category: pattern.category,
        isRedacted: true,
        ruleId: pattern.id,
      });
    }
  });

  // 4. Resolve Overlaps
  allMatches.sort((a, b) => {
    if (a.category === RedactionCategory.WHITELIST && b.category !== RedactionCategory.WHITELIST) return -1;
    if (b.category === RedactionCategory.WHITELIST && a.category !== RedactionCategory.WHITELIST) return 1;

    const lenDiff = (b.end - b.start) - (a.end - a.start);
    if (lenDiff !== 0) return lenDiff;
    return a.start - b.start;
  });

  const finalMatches: Match[] = [];
  const occupiedIndices = new Set<number>();

  for (const match of allMatches) {
    let isClean = true;
    for (let i = match.start; i < match.end; i++) {
      if (occupiedIndices.has(i)) {
        isClean = false;
        break;
      }
    }

    if (isClean) {
      if (match.category === RedactionCategory.WHITELIST) {
        for (let i = match.start; i < match.end; i++) {
          occupiedIndices.add(i);
        }
      } else {
        finalMatches.push(match);
        for (let i = match.start; i < match.end; i++) {
          occupiedIndices.add(i);
        }
      }
    }
  }

  finalMatches.sort((a, b) => a.start - b.start);

  // 5. Generate Unique IDs (Post-processing)
  // Ensure same entity gets same ID
  const categoryCounters: Record<string, number> = {};
  const entityMap: Record<string, string> = {}; // Key: "TEXT|CATEGORY" -> Tag

  return finalMatches.map(match => {
    if (!match.isRedacted) return match;

    const key = `${match.text.toLowerCase()}|${match.category}`;
    
    if (entityMap[key]) {
      return { ...match, replacementTag: entityMap[key] };
    }

    if (!categoryCounters[match.category]) {
      categoryCounters[match.category] = 0;
    }
    categoryCounters[match.category]++;
    
    const index = categoryCounters[match.category];
    // Create tag like [EMAIL_1], [PHONE_1]
    const tag = `[${match.category}_${index}]`;
    
    entityMap[key] = tag;
    return { ...match, replacementTag: tag };
  });
};
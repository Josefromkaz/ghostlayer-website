import { create } from 'zustand';
import { Match, CustomPattern, UserRule, RedactionCategory, SavedPrompt, LicenseInfo, UpgradeModalState, UpgradeReason } from '../types';
import { runRedaction, restoreText as restoreTextHelper } from '../services/redactionEngine';
import { Language } from '../services/translations';

export type EditorFont = 'JetBrains Mono' | 'Fira Code' | 'Roboto Mono' | 'Source Code Pro' | 'Inter' | 'Lora' | 'Caveat';

// Timer for notifications to prevent overlapping
let notificationTimer: ReturnType<typeof setTimeout> | null = null;

// ===========================================
// Centralized Error Handling
// ===========================================
export type ErrorType = 'DATABASE' | 'LICENSE' | 'FILE' | 'VALIDATION' | 'UNKNOWN';

export interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  timestamp: number;
}

const handleError = (type: ErrorType, error: unknown, context?: string): AppError => {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  const details = context ? `${context}: ${message}` : message;

  const appError: AppError = {
    type,
    message,
    details,
    timestamp: Date.now(),
  };

  console.error(`[${type}] ${details}`, error);
  return appError;
};

// ===========================================
// Debounce Utility
// ===========================================
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

const MAX_HISTORY = 50;

const DEFAULT_TEXT = `Hello, my name is John Doe. My email is john.doe@example.com and my phone number is +7 999 123-45-67.

Here are some sensitive documents:
RF Passport: 4512 123456
SNILS: 112-233-445 95
KZ IIN: 900101400501

I visited https://secure-bank.com on 12/05/2023.`;

let debouncedProcessText: (() => void) | null = null;

export const useAppStore = create<AppState>()((set, get) => ({
  language: 'en',
  editorFont: 'Lora',
  originalText: DEFAULT_TEXT,  matches: [],
  userRules: [],
  customPatterns: [],
  whitelist: [],
  whitelistedCategories: [],
  prompts: [],
  selectedPromptId: null,
  isProcessing: false,
  selectedText: null,
  licenseInfo: null,
  upgradeModal: { isOpen: false, reason: null },
  lastError: null,
  isDataLoaded: false,
  notification: null,
  past: [],
  future: [],
  deanonymizerInput: '',
  deanonymizerOutput: '',

  setDeanonymizerInput: (val) => {
    set({ deanonymizerInput: val });
  },

  clearError: () => set({ lastError: null }),

  setNotification: (msg) => {
    if (notificationTimer) clearTimeout(notificationTimer);
    set({ notification: msg });
    notificationTimer = setTimeout(() => {
      set({ notification: null });
      notificationTimer = null;
    }, 3000);
  },
  clearNotification: () => {
    if (notificationTimer) clearTimeout(notificationTimer);
    set({ notification: null });
    notificationTimer = null;
  },

  snapshot: () => {
    set((state) => {
      const newSnapshot: Snapshot = {
        originalText: state.originalText,
        matches: state.matches,
        userRules: state.userRules,
        customPatterns: state.customPatterns,
        whitelist: state.whitelist
      };
      const newPast = [...state.past, newSnapshot].slice(-MAX_HISTORY);
      return { past: newPast, future: [] };
    });
  },

  undo: () => {
    set((state) => {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);
      const currentSnapshot: Snapshot = {
        originalText: state.originalText,
        matches: state.matches,
        userRules: state.userRules,
        customPatterns: state.customPatterns,
        whitelist: state.whitelist
      };
      return {
        ...previous,
        past: newPast,
        future: [currentSnapshot, ...state.future],
      };
    });
    get().setNotification("Undo");
  },

  redo: () => {
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      const currentSnapshot: Snapshot = {
        originalText: state.originalText,
        matches: state.matches,
        userRules: state.userRules,
        customPatterns: state.customPatterns,
        whitelist: state.whitelist
      };
      return {
        ...next,
        past: [...state.past, currentSnapshot],
        future: newFuture,
      };
    });
    get().setNotification("Redo");
  },

  loadData: async () => {
    try {
      if (!window.ghostlayer) {
        set({
          userRules: [],
          customPatterns: [],
          whitelist: [],
          prompts: [],
          licenseInfo: { valid: true, type: 'FREE', reason: 'Browser Dev Mode' },
          isDataLoaded: true
        });
        return;
      }

      const [rules, patterns, whitelistData, promptsData, license, langSetting, fontSetting] = await Promise.all([
        window.ghostlayer.rules.getAll(),
        window.ghostlayer.patterns.getAll(),
        window.ghostlayer.whitelist.getAll(),
        window.ghostlayer.prompts.getAll(),
        window.ghostlayer.license.getInfo(),
        window.ghostlayer.settings.get('language'),
        window.ghostlayer.settings.get('editorFont')
      ]);

      set({
        userRules: rules.map((r: any) => ({
          id: r.id,
          text: r.pattern,
          category: r.category as RedactionCategory || RedactionCategory.USER_MEMORY,
          enabled: r.enabled
        })),
        customPatterns: patterns.map((p: any) => ({
          id: p.id,
          name: p.name,
          regex: p.regex,
          category: p.category,
          active: true
        })),
        whitelist: whitelistData.map((w: any) => w.phrase),
        prompts: promptsData.map((p: any) => ({
          id: p.id,
          title: p.name,
          content: p.content,
          isDefault: p.isDefault,
          createdAt: p.createdAt
        })),
        licenseInfo: license,
        language: (langSetting as Language) || 'en',
        editorFont: (fontSetting as EditorFont) || 'Lora',
        isDataLoaded: true,
        lastError: null
      });

      get().processText();
    } catch (e) {
      const error = handleError('DATABASE', e, 'Failed to load application data');
      set({ isDataLoaded: true, lastError: error });
    }
  },

  setLanguage: async (lang) => {
    set({ language: lang });
    if (window.ghostlayer) {
      try {
        await window.ghostlayer.settings.set('language', lang);
      } catch (e) {
        const error = handleError('DATABASE', e, 'Failed to save language setting');
        set({ lastError: error });
      }
    }
  },

  setEditorFont: async (font) => {
    set({ editorFont: font });
    if (window.ghostlayer) {
      try {
        await window.ghostlayer.settings.set('editorFont', font);
      } catch (e) {
        const error = handleError('DATABASE', e, 'Failed to save font setting');
        set({ lastError: error });
      }
    }
  },

  setOriginalText: (text) => {
    get().snapshot();
    set({ originalText: text });
    if (!debouncedProcessText) {
      debouncedProcessText = debounce(() => {
        get().processText();
      }, 150);
    }
    debouncedProcessText();
  },

  processText: async () => {
    const { originalText, userRules, customPatterns, whitelist, whitelistedCategories } = get();
    set({ isProcessing: true });
    try {
      const matches = await runRedaction(originalText, userRules, customPatterns, whitelist, whitelistedCategories);
      set({ matches, isProcessing: false });
    } catch (e) {
      const error = handleError('VALIDATION', e, 'Text processing failed');
      set({ isProcessing: false, lastError: error, matches: [] });
    }
  },

  toggleMatchRedaction: (matchId) => {
    get().snapshot();
    set((state) => ({
      matches: state.matches.map((m) =>
        m.id === matchId ? { ...m, isRedacted: !m.isRedacted } : m
      ),
    }));
  },

  excludeMatch: (matchId) => {
    get().snapshot();
    set((state) => ({
      matches: state.matches.map((m) =>
        m.id === matchId ? { ...m, excluded: true, excludedAt: Date.now() } : m
      ),
    }));
  },

  restoreExcludedMatch: (matchId) => {
    get().snapshot();
    set((state) => ({
      matches: state.matches.map((m) =>
        m.id === matchId ? { ...m, excluded: false, excludedAt: undefined } : m
      ),
    }));
  },

  addUserRule: async (text, category = RedactionCategory.USER_MEMORY) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    try {
      get().snapshot();
      if (!window.ghostlayer) throw new Error('Electron API not available');
      const id = await window.ghostlayer.rules.add(cleanText, category);
      set((state) => {
        if (state.userRules.some(r => r.text === cleanText)) return state;
        return {
          userRules: [...state.userRules, { id, text: cleanText, category, enabled: true }],
        };
      });
      get().setNotification("Added to Memory");
      get().processText();
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      if (errorMsg.includes('UPGRADE_REQUIRED:MEMORY')) {
        get().showUpgradeModal('MEMORY');
        return;
      }
      const error = handleError('DATABASE', e, 'Failed to add memory rule');
      set({ lastError: error });
    }
  },

  updateUserRuleCategory: async (id, category) => {
    get().snapshot();
    set((state) => ({
      userRules: state.userRules.map(r => r.id === id ? { ...r, category } : r)
    }));
    get().processText();
  },

  removeUserRule: async (id) => {
    try {
      get().snapshot();
      if (!window.ghostlayer) throw new Error('Electron API not available');
      await window.ghostlayer.rules.delete(id);
      set((state) => ({
        userRules: state.userRules.filter((r) => r.id !== id),
      }));
      get().processText();
    } catch (e) {
      const error = handleError('DATABASE', e, 'Failed to remove memory rule');
      set({ lastError: error });
    }
  },

  addCustomPattern: async (name, regex) => {
    try {
      new RegExp(regex);
    } catch (e) {
      const error = handleError('VALIDATION', e, 'Invalid regex pattern');
      set({ lastError: error });
      return;
    }
    try {
      get().snapshot();
      if (!window.ghostlayer) throw new Error('Electron API not available');
      const id = await window.ghostlayer.patterns.add({ name, regex, category: 'CUSTOM' });
      set((state) => ({
        customPatterns: [
          ...state.customPatterns,
          { id, name, regex, active: true, category: 'CUSTOM' }
        ]
      }));
      get().processText();
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      if (errorMsg.includes('UPGRADE_REQUIRED:CUSTOM_PATTERNS')) {
        get().showUpgradeModal('CUSTOM_PATTERNS');
        return;
      }
      const error = handleError('DATABASE', e, 'Failed to add custom pattern');
      set({ lastError: error });
    }
  },

  toggleCustomPattern: async (id) => {
    get().snapshot();
    set((state) => ({
      customPatterns: state.customPatterns.map(p =>
        p.id === id ? { ...p, active: !p.active } : p
      )
    }));
    get().processText();
  },

  removeCustomPattern: async (id) => {
    try {
      get().snapshot();
      if (!window.ghostlayer) throw new Error('Electron API not available');
      await window.ghostlayer.patterns.delete(id);
      set((state) => ({
        customPatterns: state.customPatterns.filter(p => p.id !== id)
      }));
      get().processText();
    } catch (e) {
      const error = handleError('DATABASE', e, 'Failed to remove custom pattern');
      set({ lastError: error });
    }
  },

  addToWhitelist: async (text) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    try {
      get().snapshot();
      if (!window.ghostlayer) throw new Error('Electron API not available');
      await window.ghostlayer.whitelist.add(cleanText);
      set((state) => {
        if (state.whitelist.includes(cleanText)) return state;
        return { whitelist: [...state.whitelist, cleanText] };
      });
      get().setNotification("Added to Whitelist");
      get().processText();
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      if (errorMsg.includes('UPGRADE_REQUIRED:WHITELIST')) {
        get().showUpgradeModal('WHITELIST');
        return;
      }
      const error = handleError('DATABASE', e, 'Failed to add whitelist item');
      set({ lastError: error });
    }
  },

  removeFromWhitelist: async (text) => {
    try {
      if (window.ghostlayer) {
        const allItems = await window.ghostlayer.whitelist.getAll();
        const item = allItems.find(i => i.phrase === text);
        if (item) {
          await window.ghostlayer.whitelist.delete(item.id);
        }
      }
      set((state) => ({
        whitelist: state.whitelist.filter(w => w !== text)
      }));
      get().processText();
    } catch (e) {
      const error = handleError('DATABASE', e, 'Failed to remove whitelist item');
      set({ lastError: error });
    }
  },

  addCategoryToWhitelist: (category) => {
    get().snapshot();
    set((state) => {
      if (state.whitelistedCategories.includes(category)) return state;
      return { whitelistedCategories: [...state.whitelistedCategories, category] };
    });
    get().processText();
  },

  removeCategoryFromWhitelist: (category) => {
    set((state) => ({
      whitelistedCategories: state.whitelistedCategories.filter(c => c !== category)
    }));
    get().processText();
  },

  addPrompt: async (title, content) => {
    try {
      if (!window.ghostlayer) throw new Error('Electron API not available');
      const id = await window.ghostlayer.prompts.save({ name: title, content });
      set((state) => ({
        prompts: [...state.prompts, { id, title, content }]
      }));
    } catch (e) {
      const error = handleError('DATABASE', e, 'Failed to save prompt');
      set({ lastError: error });
    }
  },

  removePrompt: async (id) => {
    try {
      if (!window.ghostlayer) throw new Error('Electron API not available');
      await window.ghostlayer.prompts.delete(id);
      set((state) => ({
        prompts: state.prompts.filter(p => p.id !== id),
        selectedPromptId: state.selectedPromptId === id ? null : state.selectedPromptId
      }));
    } catch (e) {
      const error = handleError('DATABASE', e, 'Failed to remove prompt');
      set({ lastError: error });
    }
  },

  setSelectedPromptId: (id) => set({ selectedPromptId: id }),
  setSelectedText: (text) => set({ selectedText: text }),

  restoreText: (redactedText) => {
    const { matches } = get();
    const result = restoreTextHelper(redactedText, matches);
    set({ deanonymizerOutput: result });
    return result;
  },

  clearSensitiveData: () => {
    set({
      originalText: '',
      matches: [],
      selectedText: null,
      lastError: null,
      deanonymizerInput: '',
      deanonymizerOutput: ''
    });
  },

  showUpgradeModal: (reason, categoryName) => {
    set({ upgradeModal: { isOpen: true, reason, categoryName } });
  },

  closeUpgradeModal: () => {
    set({ upgradeModal: { isOpen: false, reason: null } });
  }
}));

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      useAppStore.getState().loadData();
    });
  } else {
    useAppStore.getState().loadData();
  }
}
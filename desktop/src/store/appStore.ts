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

interface Snapshot {
  originalText: string;
  matches: Match[];
  userRules: UserRule[];
  customPatterns: CustomPattern[];
  whitelist: string[];
}

interface AppState {
  language: Language;
  editorFont: EditorFont;
  originalText: string;
  matches: Match[];
  isProcessing: boolean;
  selectedText: string | null;

  // Deanonymizer (Ghost Loop) State
  deanonymizerInput: string;
  deanonymizerOutput: string;
  setDeanonymizerInput: (val: string) => void;

  // Data from Electron
  userRules: UserRule[];
  customPatterns: CustomPattern[];
  whitelist: string[];
  whitelistedCategories: string[];
  prompts: SavedPrompt[];
  selectedPromptId: string | null;

  licenseInfo: LicenseInfo | null;

  // Upgrade Modal
  upgradeModal: UpgradeModalState;
  showUpgradeModal: (reason: UpgradeReason, categoryName?: string) => void;
  closeUpgradeModal: () => void;

  // Error handling
  lastError: AppError | null;
  clearError: () => void;

  // Loading
  isDataLoaded: boolean;
  loadData: () => Promise<void>;

  // Notification
  notification: string | null;
  setNotification: (msg: string | null) => void;
  clearNotification: () => void;

  // History
  past: Snapshot[];
  future: Snapshot[];
  undo: () => void;
  redo: () => void;
  snapshot: () => void;

  // Actions
  setLanguage: (lang: Language) => Promise<void>;
  setEditorFont: (font: EditorFont) => Promise<void>;
  setOriginalText: (text: string) => void;
  processText: () => Promise<void>;
  toggleMatchRedaction: (matchId: string) => void;
  excludeMatch: (matchId: string) => void;
  restoreExcludedMatch: (matchId: string) => void;

  // Memory / User Rules
  addUserRule: (text: string, category?: RedactionCategory) => Promise<void>;
  updateUserRuleCategory: (id: string, category: RedactionCategory) => Promise<void>;
  removeUserRule: (id: string) => Promise<void>;

  // Custom Patterns
  addCustomPattern: (name: string, regex: string) => Promise<void>;
  toggleCustomPattern: (id: string) => Promise<void>;
  removeCustomPattern: (id: string) => Promise<void>;

  // Whitelist
  addToWhitelist: (text: string) => Promise<void>;
  removeFromWhitelist: (text: string) => Promise<void>;
  addCategoryToWhitelist: (category: string) => void;
  removeCategoryFromWhitelist: (category: string) => void;

  // Prompts
  addPrompt: (title: string, content: string) => Promise<void>;
  removePrompt: (id: string) => Promise<void>;
  setSelectedPromptId: (id: string | null) => void;

  // Selection
  setSelectedText: (text: string | null) => void;

  // De-anonymization
  restoreText: (redactedText: string) => string;

  // Security
  clearSensitiveData: () => void;
}

let debouncedProcessText: (() => void) | null = null;

export const useAppStore = create<AppState>()((set, get) => ({
  language: 'en',
  editorFont: 'Lora',
  originalText: DEFAULT_TEXT,
  matches: [],
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

  setDeanonymizerInput: (val: string) => {
    set({ deanonymizerInput: val });
  },

  clearError: () => set({ lastError: null }),

  setNotification: (msg: string | null) => {
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
    set((state: AppState) => {
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
    set((state: AppState) => {
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
    set((state: AppState) => {
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
        userRules: (rules as any[]).map((r: any) => ({
          id: r.id,
          text: r.pattern,
          category: r.category as RedactionCategory || RedactionCategory.USER_MEMORY,
          enabled: r.enabled
        })),
        customPatterns: (patterns as any[]).map((p: any) => ({
          id: p.id,
          name: p.name,
          regex: p.regex,
          category: p.category,
          active: true
        })),
        whitelist: (whitelistData as any[]).map((w: any) => w.phrase),
        prompts: (promptsData as any[]).map((p: any) => ({
          id: p.id,
          title: p.name,
          content: p.content,
          isDefault: p.isDefault,
          createdAt: p.createdAt
        })),
        licenseInfo: license as LicenseInfo,
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

  setLanguage: async (lang: Language) => {
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

  setEditorFont: async (font: EditorFont) => {
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

  setOriginalText: (text: string) => {
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

  toggleMatchRedaction: (matchId: string) => {
    get().snapshot();
    set((state: AppState) => ({
      matches: state.matches.map((m: Match) =>
        m.id === matchId ? { ...m, isRedacted: !m.isRedacted } : m
      ),
    }));
  },

  excludeMatch: (matchId: string) => {
    get().snapshot();
    set((state: AppState) => ({
      matches: state.matches.map((m: Match) =>
        m.id === matchId ? { ...m, excluded: true, excludedAt: Date.now() } : m
      ),
    }));
  },

  restoreExcludedMatch: (matchId: string) => {
    get().snapshot();
    set((state: AppState) => ({
      matches: state.matches.map((m: Match) =>
        m.id === matchId ? { ...m, excluded: false, excludedAt: undefined } : m
      ),
    }));
  },

  addUserRule: async (text: string, category = RedactionCategory.USER_MEMORY) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    try {
      get().snapshot();
      if (!window.ghostlayer) throw new Error('Electron API not available');
      const id = await window.ghostlayer.rules.add(cleanText, category);
      set((state: AppState) => {
        if (state.userRules.some((r: UserRule) => r.text === cleanText)) return state;
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

  updateUserRuleCategory: async (id: string, category: RedactionCategory) => {
    get().snapshot();
    set((state: AppState) => ({
      userRules: state.userRules.map((r: UserRule) => r.id === id ? { ...r, category } : r)
    }));
    get().processText();
  },

  removeUserRule: async (id: string) => {
    try {
      get().snapshot();
      if (!window.ghostlayer) throw new Error('Electron API not available');
      await window.ghostlayer.rules.delete(id);
      set((state: AppState) => ({
        userRules: state.userRules.filter((r: UserRule) => r.id !== id),
      }));
      get().processText();
    } catch (e) {
      const error = handleError('DATABASE', e, 'Failed to remove memory rule');
      set({ lastError: error });
    }
  },

  addCustomPattern: async (name: string, regex: string) => {
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
      set((state: AppState) => ({
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

  toggleCustomPattern: async (id: string) => {
    get().snapshot();
    set((state: AppState) => ({
      customPatterns: state.customPatterns.map((p: CustomPattern) =>
        p.id === id ? { ...p, active: !p.active } : p
      )
    }));
    get().processText();
  },

  removeCustomPattern: async (id: string) => {
    try {
      get().snapshot();
      if (!window.ghostlayer) throw new Error('Electron API not available');
      await window.ghostlayer.patterns.delete(id);
      set((state: AppState) => ({
        customPatterns: state.customPatterns.filter((p: CustomPattern) => p.id !== id)
      }));
      get().processText();
    } catch (e) {
      const error = handleError('DATABASE', e, 'Failed to remove custom pattern');
      set({ lastError: error });
    }
  },

  addToWhitelist: async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    try {
      get().snapshot();
      if (!window.ghostlayer) throw new Error('Electron API not available');
      await window.ghostlayer.whitelist.add(cleanText);
      set((state: AppState) => {
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

  removeFromWhitelist: async (text: string) => {
    try {
      if (window.ghostlayer) {
        const allItems = await window.ghostlayer.whitelist.getAll();
        const item = (allItems as any[]).find(i => i.phrase === text);
        if (item) {
          await window.ghostlayer.whitelist.delete(item.id);
        }
      }
      set((state: AppState) => ({
        whitelist: state.whitelist.filter((w: string) => w !== text)
      }));
      get().processText();
    } catch (e) {
      const error = handleError('DATABASE', e, 'Failed to remove whitelist item');
      set({ lastError: error });
    }
  },

  addCategoryToWhitelist: (category: string) => {
    get().snapshot();
    set((state: AppState) => {
      if (state.whitelistedCategories.includes(category)) return state;
      return { whitelistedCategories: [...state.whitelistedCategories, category] };
    });
    get().processText();
  },

  removeCategoryFromWhitelist: (category: string) => {
    set((state: AppState) => ({
      whitelistedCategories: state.whitelistedCategories.filter((c: string) => c !== category)
    }));
    get().processText();
  },

  addPrompt: async (title: string, content: string) => {
    try {
      if (!window.ghostlayer) throw new Error('Electron API not available');
      const id = await window.ghostlayer.prompts.save({ name: title, content });
      set((state: AppState) => ({
        prompts: [...state.prompts, { id, title, content }]
      }));
    } catch (e) {
      const error = handleError('DATABASE', e, 'Failed to save prompt');
      set({ lastError: error });
    }
  },

  removePrompt: async (id: string) => {
    try {
      if (!window.ghostlayer) throw new Error('Electron API not available');
      await window.ghostlayer.prompts.delete(id);
      set((state: AppState) => ({
        prompts: state.prompts.filter((p: SavedPrompt) => p.id !== id),
        selectedPromptId: state.selectedPromptId === id ? null : state.selectedPromptId
      }));
    } catch (e) {
      const error = handleError('DATABASE', e, 'Failed to remove prompt');
      set({ lastError: error });
    }
  },

  setSelectedPromptId: (id: string | null) => set({ selectedPromptId: id }),
  setSelectedText: (text: string | null) => set({ selectedText: text }),

  restoreText: (redactedText: string) => {
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

  showUpgradeModal: (reason: UpgradeReason, categoryName?: string) => {
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
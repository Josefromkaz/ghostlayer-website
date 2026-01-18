import { create } from 'zustand';
import { Match, CustomPattern, UserRule, RedactionCategory, SavedPrompt, LicenseInfo } from '../types';
import { runRedaction, restoreText as restoreTextHelper } from '../services/redactionEngine';
import { Language } from '../services/translations';

export type EditorFont = 'JetBrains Mono' | 'Fira Code' | 'Roboto Mono' | 'Source Code Pro';

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

// Error handler that can be extended for toast notifications, logging, etc.
const handleError = (type: ErrorType, error: unknown, context?: string): AppError => {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  const details = context ? `${context}: ${message}` : message;

  const appError: AppError = {
    type,
    message,
    details,
    timestamp: Date.now(),
  };

  // Log to console in development
  console.error(`[${type}] ${details}`, error);

  // Store can dispatch this error to UI for toast notifications
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

interface AppState {
  language: Language;
  editorFont: EditorFont;
  originalText: string;
  matches: Match[];
  isProcessing: boolean;
  selectedText: string | null;

  // Data from Electron
  userRules: UserRule[];
  customPatterns: CustomPattern[];
  whitelist: string[];
  whitelistedCategories: string[]; // Categories to never redact (e.g., 'DATE', 'EMAIL')
  prompts: SavedPrompt[];
  selectedPromptId: string | null;

  licenseInfo: LicenseInfo | null;

  // Error handling
  lastError: AppError | null;
  clearError: () => void;

  // Loading
  isDataLoaded: boolean;
  loadData: () => Promise<void>;

  // Actions
  setLanguage: (lang: Language) => void;
  setEditorFont: (font: EditorFont) => void;
  setOriginalText: (text: string) => void;
  processText: () => void;
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
}

const DEFAULT_TEXT = `Hello, my name is John Doe. My email is john.doe@example.com and my phone number is +7 999 123-45-67.

Here are some sensitive documents:
RF Passport: 4512 123456
SNILS: 112-233-445 95
KZ IIN: 900101400501

I visited https://secure-bank.com on 12/05/2023.`;

// Debounced text processing function (created once)
let debouncedProcessText: (() => void) | null = null;

export const useAppStore = create<AppState>()((set, get) => ({
  language: 'en',
  editorFont: 'JetBrains Mono',
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
  lastError: null,
  isDataLoaded: false,

  clearError: () => set({ lastError: null }),

  loadData: async () => {
    try {
      // Dev Mode Fallback
      if (!window.ghostlayer) {
        console.warn("Electron API not available - Running in Browser Mode");
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
        editorFont: (fontSetting as EditorFont) || 'JetBrains Mono',
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
    set({ originalText: text });
    // Use debounced processing for better performance during typing
    if (!debouncedProcessText) {
      debouncedProcessText = debounce(() => {
        get().processText();
      }, 150); // 150ms debounce delay
    }
    debouncedProcessText();
  },

  processText: () => {
    const { originalText, userRules, customPatterns, whitelist, whitelistedCategories } = get();
    set({ isProcessing: true });

    // Use requestAnimationFrame for smoother UI updates
    requestAnimationFrame(() => {
      try {
        const matches = runRedaction(originalText, userRules, customPatterns, whitelist, whitelistedCategories);
        set({ matches, isProcessing: false });
      } catch (e) {
        const error = handleError('VALIDATION', e, 'Text processing failed');
        set({ isProcessing: false, lastError: error, matches: [] });
      }
    });
  },

  toggleMatchRedaction: (matchId) => {
    set((state) => ({
      matches: state.matches.map((m) =>
        m.id === matchId ? { ...m, isRedacted: !m.isRedacted } : m
      ),
    }));
  },

  excludeMatch: (matchId) => {
    set((state) => ({
      matches: state.matches.map((m) =>
        m.id === matchId ? { ...m, excluded: true, excludedAt: Date.now() } : m
      ),
    }));
  },

  restoreExcludedMatch: (matchId) => {
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
      if (!window.ghostlayer) {
        throw new Error('Electron API not available');
      }
      const id = await window.ghostlayer.rules.add(cleanText, category);

      set((state) => {
        if (state.userRules.some(r => r.text === cleanText)) return state;
        return {
          userRules: [...state.userRules, { id, text: cleanText, category, enabled: true }]
        };
      });
      get().processText();
    } catch (e) {
      const error = handleError('DATABASE', e, 'Failed to add memory rule');
      set({ lastError: error });
    }
  },

  updateUserRuleCategory: async (id, category) => {
    // Update local state - persistence would require API update
    set((state) => ({
      userRules: state.userRules.map(r => r.id === id ? { ...r, category } : r)
    }));
    get().processText();
  },

  removeUserRule: async (id) => {
    try {
      if (!window.ghostlayer) {
        throw new Error('Electron API not available');
      }
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
    // Validate regex before saving
    try {
      new RegExp(regex); // Test if regex is valid
    } catch (e) {
      const error = handleError('VALIDATION', e, 'Invalid regex pattern');
      set({ lastError: error });
      return;
    }

    try {
      if (!window.ghostlayer) {
        throw new Error('Electron API not available');
      }
      const id = await window.ghostlayer.patterns.add({ name, regex, category: 'CUSTOM' });
      set((state) => ({
        customPatterns: [
          ...state.customPatterns,
          { id, name, regex, active: true, category: 'CUSTOM' }
        ]
      }));
      get().processText();
    } catch (e) {
      const error = handleError('DATABASE', e, 'Failed to add custom pattern');
      set({ lastError: error });
    }
  },

  toggleCustomPattern: async (id) => {
    set((state) => ({
      customPatterns: state.customPatterns.map(p =>
        p.id === id ? { ...p, active: !p.active } : p
      )
    }));
    get().processText();
  },

  removeCustomPattern: async (id) => {
    try {
      if (!window.ghostlayer) {
        throw new Error('Electron API not available');
      }
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
      if (!window.ghostlayer) {
        throw new Error('Electron API not available');
      }
      await window.ghostlayer.whitelist.add(cleanText);
      set((state) => {
        if (state.whitelist.includes(cleanText)) return state;
        return { whitelist: [...state.whitelist, cleanText] };
      });
      get().processText();
    } catch (e) {
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
      if (!window.ghostlayer) {
        throw new Error('Electron API not available');
      }
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
      if (!window.ghostlayer) {
        throw new Error('Electron API not available');
      }
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
    return restoreTextHelper(redactedText, matches);
  }
}));

// Initialize store when app loads
// Using DOMContentLoaded ensures DOM is ready and Electron preload has run
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      useAppStore.getState().loadData();
    });
  } else {
    // DOM already loaded (e.g., HMR in dev mode)
    useAppStore.getState().loadData();
  }
}

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Match, CustomPattern, UserRule, RedactionCategory, SavedPrompt } from '../types';
import { runRedaction } from '../services/redactionEngine';
import { Language } from '../services/translations';

export type EditorFont = 'JetBrains Mono' | 'Fira Code' | 'Roboto Mono' | 'Source Code Pro';

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
  userRules: UserRule[]; 
  customPatterns: CustomPattern[];
  whitelist: string[];
  prompts: SavedPrompt[];
  selectedPromptId: string | null;
  isProcessing: boolean;
  selectedText: string | null;
  notification: string | null;
  
  // Deanonymizer State
  deanonymizerInput: string;
  deanonymizerOutput: string;

  // History
  past: Snapshot[];
  future: Snapshot[];

  setLanguage: (lang: Language) => void;
  setEditorFont: (font: EditorFont) => void;
  setOriginalText: (text: string) => void;
  processText: () => void;
  toggleMatchRedaction: (matchId: string) => void;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  snapshot: () => void;
  clearNotification: () => void;
  setNotification: (msg: string) => void;
  
  // Memory / User Rules
  addUserRule: (text: string, category?: RedactionCategory) => void;
  updateUserRuleCategory: (id: string, category: RedactionCategory) => void;
  removeUserRule: (id: string) => void;

  // Custom Patterns
  addCustomPattern: (name: string, regex: string) => void;
  toggleCustomPattern: (id: string) => void;
  removeCustomPattern: (id: string) => void;

  // Whitelist
  addToWhitelist: (text: string) => void;
  removeFromWhitelist: (text: string) => void;

  // Prompts
  addPrompt: (title: string, content: string) => void;
  removePrompt: (id: string) => void;
  setSelectedPromptId: (id: string | null) => void;
  
  // Selection
  setSelectedText: (text: string | null) => void;

  // De-anonymization
  setDeanonymizerInput: (text: string) => void;
  setDeanonymizerOutput: (text: string) => void;
  restoreText: (redactedText: string) => string;
}

const DEFAULT_PROMPTS: SavedPrompt[] = [
  { id: '1', title: 'Summarize', content: 'Please summarize the following text, focusing on key events and keeping the tone professional:' },
  { id: '2', title: 'Extract Info', content: 'Extract all dates, financial figures, and key entities from this document in a structured list:' },
  { id: '3', title: 'Analyze', content: 'Analyze the sentiment and main intent of the following communication:' }
];

const MAX_HISTORY = 50;

// Timer reference outside the store to persist across state updates properly
let notificationTimer: any = null;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      language: 'en',
      editorFont: 'JetBrains Mono',
      originalText: "Hello, my name is John Doe. My email is john.doe@example.com and my phone number is +7 999 123-45-67.\n\nHere are some sensitive documents:\nRF Passport: 4512 123456\nSNILS: 112-233-445 95\nKZ IIN: 900101400501\n\nI visited https://secure-bank.com on 12/05/2023.",
      matches: [],
      userRules: [],
      customPatterns: [],
      whitelist: [],
      prompts: DEFAULT_PROMPTS,
      selectedPromptId: null,
      isProcessing: false,
      selectedText: null,
      notification: null,

      deanonymizerInput: '',
      deanonymizerOutput: '',

      past: [],
      future: [],

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
        get().setNotification("Undo");
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
        get().processText();
      },

      redo: () => {
        get().setNotification("Redo");
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
        get().processText();
      },

      setLanguage: (lang) => set({ language: lang }),
      setEditorFont: (font) => set({ editorFont: font }),

      setOriginalText: (text) => {
        get().snapshot();
        set({ originalText: text });
        get().processText();
      },

      processText: () => {
        const { originalText, userRules, customPatterns, whitelist } = get();
        set({ isProcessing: true });
        
        setTimeout(() => {
          const matches = runRedaction(originalText, userRules, customPatterns, whitelist);
          set({ matches, isProcessing: false });
        }, 0);
      },

      toggleMatchRedaction: (matchId) => {
        get().snapshot();
        set((state) => ({
          matches: state.matches.map((m) =>
            m.id === matchId ? { ...m, isRedacted: !m.isRedacted } : m
          ),
        }));
      },

      addUserRule: (text, category = RedactionCategory.USER_MEMORY) => {
        const cleanText = text.trim();
        if (!cleanText) return;
        
        get().snapshot();
        set((state) => {
            if(state.userRules.some(r => r.text === cleanText)) return state;
            return { 
                userRules: [...state.userRules, { id: uuidv4(), text: cleanText, category }],
            }
        });
        get().setNotification("Added to Memory");
        get().processText();
      },

      updateUserRuleCategory: (id, category) => {
        get().snapshot();
        set((state) => ({
          userRules: state.userRules.map(r => r.id === id ? { ...r, category } : r)
        }));
        get().processText();
      },

      removeUserRule: (id) => {
        get().snapshot();
        set((state) => ({
          userRules: state.userRules.filter((r) => r.id !== id),
        }));
        get().processText();
      },

      addCustomPattern: (name, regex) => {
        get().snapshot();
        set((state) => ({
          customPatterns: [
            ...state.customPatterns,
            { id: uuidv4(), name, regex, active: true }
          ]
        }));
        get().processText();
      },

      toggleCustomPattern: (id) => {
        get().snapshot();
        set((state) => ({
          customPatterns: state.customPatterns.map(p => 
            p.id === id ? { ...p, active: !p.active } : p
          )
        }));
        get().processText();
      },

      removeCustomPattern: (id) => {
        get().snapshot();
        set((state) => ({
          customPatterns: state.customPatterns.filter(p => p.id !== id)
        }));
        get().processText();
      },

      addToWhitelist: (text) => {
        const cleanText = text.trim();
        if(!cleanText) return;
        get().snapshot();
        set((state) => {
          if(state.whitelist.includes(cleanText)) return state;
          return { 
            whitelist: [...state.whitelist, cleanText],
          };
        });
        get().setNotification("Added to Whitelist");
        get().processText();
      },

      removeFromWhitelist: (text) => {
        get().snapshot();
        set((state) => ({
          whitelist: state.whitelist.filter(w => w !== text)
        }));
        get().processText();
      },

      addPrompt: (title, content) => {
        set((state) => ({
          prompts: [...state.prompts, { id: uuidv4(), title, content }]
        }));
      },

      removePrompt: (id) => {
        set((state) => ({
          prompts: state.prompts.filter(p => p.id !== id),
          selectedPromptId: state.selectedPromptId === id ? null : state.selectedPromptId
        }));
      },

      setSelectedPromptId: (id) => set({ selectedPromptId: id }),

      setSelectedText: (text) => set({ selectedText: text }),

      setDeanonymizerInput: (text) => set({ deanonymizerInput: text }),
      setDeanonymizerOutput: (text) => set({ deanonymizerOutput: text }),

      restoreText: (redactedText) => {
        const { matches } = get();
        let restored = redactedText;
        const tagRegex = /\[([A-Z_]+_\d+)\]/g;
        const tagMap = new Map<string, string>();
        matches.forEach(m => {
            if(m.isRedacted && m.replacementTag) {
                tagMap.set(m.replacementTag, m.text);
            }
        });
        restored = restored.replace(tagRegex, (fullMatch) => {
            return tagMap.get(fullMatch) || fullMatch;
        });
        set({ deanonymizerOutput: restored });
        return restored;
      }
    }),
    {
      name: 'ghostlayer-storage',
      partialize: (state) => ({ 
        language: state.language,
        editorFont: state.editorFont,
        userRules: state.userRules,
        customPatterns: state.customPatterns,
        whitelist: state.whitelist,
        prompts: state.prompts,
        selectedPromptId: state.selectedPromptId,
        deanonymizerInput: state.deanonymizerInput,
        deanonymizerOutput: state.deanonymizerOutput
      }), 
    }
  )
);
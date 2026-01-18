import { create } from 'zustand';
import { RedactionMatch } from '../types';
import { analyzeText } from '../services/redactionEngine';

interface AppState {
  originalText: string;
  matches: RedactionMatch[];
  userRules: string[];
  
  // Actions
  setText: (text: string) => void;
  toggleMatchRedaction: (id: string) => void;
  addUserRule: (text: string) => void;
  removeUserRule: (text: string) => void;
  reanalyze: () => void;
  clearAll: () => void;
}

// Load rules from localStorage
const loadRules = (): string[] => {
  try {
    const saved = localStorage.getItem('ghostlayer_rules');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

const saveRules = (rules: string[]) => {
  localStorage.setItem('ghostlayer_rules', JSON.stringify(rules));
};

export const useAppStore = create<AppState>((set, get) => ({
  originalText: `Subject: Project GhostLayer Kickoff
Date: 12.05.2024

Hello Team,

We are launching the initiative. Please verify the following details for our Kazakhstan partners:
Director: Alexey Petrov
ID Card: 123456789
IIN: 900101300456

Contact him at alex.petrov@secure-mail.com or +7 (777) 123-45-67.
We have processed the payment via card 4400 5500 6600 7700.

Best,
Admin
https://ghostlayer.io`,
  matches: [],
  userRules: loadRules(),

  setText: (text: string) => {
    const { userRules } = get();
    const matches = analyzeText(text, userRules);
    set({ originalText: text, matches });
  },

  toggleMatchRedaction: (id: string) => {
    set((state) => ({
      matches: state.matches.map((m) =>
        m.id === id ? { ...m, isRedacted: !m.isRedacted } : m
      ),
    }));
  },

  addUserRule: (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    
    const { userRules, originalText } = get();
    if (!userRules.includes(cleanText)) {
      const newRules = [...userRules, cleanText];
      saveRules(newRules);
      const newMatches = analyzeText(originalText, newRules);
      set({ userRules: newRules, matches: newMatches });
    }
  },

  removeUserRule: (text: string) => {
    const { userRules, originalText } = get();
    const newRules = userRules.filter((r) => r !== text);
    saveRules(newRules);
    const newMatches = analyzeText(originalText, newRules);
    set({ userRules: newRules, matches: newMatches });
  },

  reanalyze: () => {
    const { originalText, userRules } = get();
    const matches = analyzeText(originalText, userRules);
    set({ matches });
  },
  
  clearAll: () => {
      set({ originalText: '', matches: [] });
  }
}));
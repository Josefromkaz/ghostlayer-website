/// <reference types="vite/client" />

import { LicenseInfo, UserRule, SavedPrompt, WhitelistItem, CustomPattern, FileResult, RedactionCategory, LearningRule, CustomPatternRecord, Prompt } from './types';

export {};

declare global {
  interface Window {
    ghostlayer: {
      license: {
        getInfo: () => Promise<LicenseInfo>;
        activate: (key: string) => Promise<LicenseInfo>;
        canUseFeature: (feature: string) => Promise<boolean>;
        isPro: () => Promise<boolean>;
        isRegexCategoryAllowed: (category: string) => Promise<boolean>;
        startTrial: () => Promise<LicenseInfo>;
      };
      rules: {
        getAll: () => Promise<LearningRule[]>;
        add: (pattern: string, category?: string) => Promise<string>;
        delete: (id: string) => Promise<boolean>;
        toggle: (id: string, enabled: boolean) => Promise<boolean>;
      };
      prompts: {
        getAll: () => Promise<Prompt[]>;
        save: (prompt: { id?: string; name: string; content: string }) => Promise<string>;
        delete: (id: string) => Promise<boolean>;
      };
      whitelist: {
        getAll: () => Promise<WhitelistItem[]>;
        add: (phrase: string) => Promise<string>;
        delete: (id: string) => Promise<boolean>;
      };
      patterns: {
        getAll: () => Promise<CustomPatternRecord[]>;
        add: (pattern: { name: string; regex: string; category: string }) => Promise<string>;
        delete: (id: string) => Promise<boolean>;
      };
      file: {
        open: () => Promise<FileResult | null>;
        save: (content: string, defaultName: string) => Promise<string | null>;
        readPdf: (path: string) => Promise<Buffer | null>;
      };
      settings: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<boolean>;
      };
      app: {
        getVersion: () => Promise<string>;
        getPlatform: () => Promise<NodeJS.Platform>;
      };
      platform: NodeJS.Platform;
      version: string;
    };
  }
}

declare module 'mammoth';
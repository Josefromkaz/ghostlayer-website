/// <reference types="vite/client" />

import { LicenseInfo, UserRule, SavedPrompt, WhitelistItem, CustomPattern, FileResult, RedactionCategory } from './types';

export {};

declare global {
  interface Window {
    ghostlayer: {
// ... existing code ...
    };
  }
}

declare module 'mammoth';

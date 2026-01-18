import { contextBridge, ipcRenderer } from 'electron';

// Types for the exposed API
export interface LicenseInfo {
  valid: boolean;
  type: 'FREE' | 'PRO' | 'TRIAL' | 'EXPIRED' | 'TAMPERED';
  expirationDate?: string;
  userId?: string;
  reason?: string;
}

export interface LearningRule {
  id: string;
  pattern: string;
  category: string;
  enabled: boolean;
  createdAt: number;
}

export interface Prompt {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: number;
}

export interface WhitelistItem {
  id: string;
  phrase: string;
  createdAt: number;
}

export interface CustomPattern {
  id: string;
  name: string;
  regex: string;
  category: string;
  createdAt: number;
}

export interface FileResult {
  path: string;
  type: 'pdf' | 'text';
  content?: string;
}

// Expose secure APIs to renderer
contextBridge.exposeInMainWorld('ghostlayer', {
  // License Management
  license: {
    getInfo: (): Promise<LicenseInfo> => ipcRenderer.invoke('license:getInfo'),
    activate: (key: string): Promise<LicenseInfo> => ipcRenderer.invoke('license:activate', key),
    canUseFeature: (feature: string): Promise<boolean> => ipcRenderer.invoke('license:canUseFeature', feature),
    isPro: (): Promise<boolean> => ipcRenderer.invoke('license:isPro'),
  },

  // Learning Rules (Memory)
  rules: {
    getAll: (): Promise<LearningRule[]> => ipcRenderer.invoke('db:getRules'),
    add: (pattern: string, category?: string): Promise<string> => ipcRenderer.invoke('db:addRule', pattern, category),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('db:deleteRule', id),
    toggle: (id: string, enabled: boolean): Promise<boolean> => ipcRenderer.invoke('db:toggleRule', id, enabled),
  },

  // Prompts
  prompts: {
    getAll: (): Promise<Prompt[]> => ipcRenderer.invoke('db:getPrompts'),
    save: (prompt: { id?: string; name: string; content: string }): Promise<string> =>
      ipcRenderer.invoke('db:savePrompt', prompt),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('db:deletePrompt', id),
  },

  // Whitelist
  whitelist: {
    getAll: (): Promise<WhitelistItem[]> => ipcRenderer.invoke('db:getWhitelist'),
    add: (phrase: string): Promise<string> => ipcRenderer.invoke('db:addWhitelistItem', phrase),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('db:deleteWhitelistItem', id),
  },

  // Custom Patterns
  patterns: {
    getAll: (): Promise<CustomPattern[]> => ipcRenderer.invoke('db:getCustomPatterns'),
    add: (pattern: { name: string; regex: string; category: string }): Promise<string> =>
      ipcRenderer.invoke('db:addCustomPattern', pattern),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('db:deleteCustomPattern', id),
  },

  // File Operations
  file: {
    open: (): Promise<FileResult | null> => ipcRenderer.invoke('dialog:openFile'),
    save: (content: string, defaultName: string): Promise<string | null> =>
      ipcRenderer.invoke('dialog:saveFile', content, defaultName),
    readPdf: (path: string): Promise<Buffer | null> => ipcRenderer.invoke('file:readPdf', path),
  },

  // Settings
  settings: {
    get: (key: string): Promise<string | null> => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string): Promise<boolean> => ipcRenderer.invoke('settings:set', key, value),
  },

  // App Info
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
    getPlatform: (): Promise<NodeJS.Platform> => ipcRenderer.invoke('app:getPlatform'),
  },

  // Platform info (sync)
  platform: process.platform,
  version: '2.0.0',
});

// Type declaration for the window object
declare global {
  interface Window {
    ghostlayer: {
      license: {
        getInfo: () => Promise<LicenseInfo>;
        activate: (key: string) => Promise<LicenseInfo>;
        canUseFeature: (feature: string) => Promise<boolean>;
        isPro: () => Promise<boolean>;
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
        getAll: () => Promise<CustomPattern[]>;
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

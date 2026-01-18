import Database from 'better-sqlite3';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { EncryptionService } from '../security/encryption';

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

/**
 * Database service with encrypted storage for sensitive data.
 */
export class DatabaseService {
  private db: Database.Database;
  private encryption: EncryptionService;

  constructor(appDataPath: string, encryption: EncryptionService) {
    this.encryption = encryption;
    const dbPath = path.join(appDataPath, 'ghostlayer.db');
    this.db = new Database(dbPath);

    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');
  }

  /**
   * Initializes database tables.
   */
  async initialize(): Promise<void> {
    this.db.exec(`
      -- Learning rules (memory) - patterns are encrypted
      CREATE TABLE IF NOT EXISTS learning_rules (
        id TEXT PRIMARY KEY,
        pattern TEXT NOT NULL,
        category TEXT DEFAULT 'CUSTOM',
        enabled INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      -- Prompts - content is encrypted
      CREATE TABLE IF NOT EXISTS prompts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      -- Whitelist - phrases are encrypted
      CREATE TABLE IF NOT EXISTS whitelist (
        id TEXT PRIMARY KEY,
        phrase TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      -- Custom regex patterns - regex is encrypted
      CREATE TABLE IF NOT EXISTS custom_patterns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        regex TEXT NOT NULL,
        category TEXT DEFAULT 'CUSTOM',
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      -- Settings (not encrypted)
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_rules_category ON learning_rules(category);
      CREATE INDEX IF NOT EXISTS idx_rules_enabled ON learning_rules(enabled);
      CREATE INDEX IF NOT EXISTS idx_prompts_default ON prompts(is_default);
    `);

    // Seed default prompts if none exist
    await this.seedDefaultPrompts();
  }

  /**
   * Seeds default prompts for new installations.
   */
  private async seedDefaultPrompts(): Promise<void> {
    const count = this.db.prepare('SELECT COUNT(*) as count FROM prompts').get() as { count: number };

    if (count.count === 0) {
      const defaultPrompts = [
        { name: 'Summarize', content: 'Please summarize the following document:' },
        { name: 'Extract Info', content: 'Extract the key information from this document:' },
        { name: 'Analyze', content: 'Analyze the following content and provide insights:' },
        { name: 'Translate', content: 'Translate the following text to English:' },
      ];

      const stmt = this.db.prepare(
        'INSERT INTO prompts (id, name, content, is_default) VALUES (?, ?, ?, 1)'
      );

      for (const prompt of defaultPrompts) {
        const encryptedContent = this.encryption.encrypt(prompt.content);
        stmt.run(uuidv4(), prompt.name, encryptedContent);
      }
    }
  }

  // ==================== Learning Rules ====================

  getLearningRules(): LearningRule[] {
    const rows = this.db.prepare('SELECT * FROM learning_rules ORDER BY created_at DESC').all() as any[];

    return rows.map((row) => ({
      id: row.id,
      pattern: this.encryption.decrypt(row.pattern),
      category: row.category,
      enabled: Boolean(row.enabled),
      createdAt: row.created_at,
    }));
  }

  getEnabledRules(): LearningRule[] {
    const rows = this.db
      .prepare('SELECT * FROM learning_rules WHERE enabled = 1 ORDER BY created_at DESC')
      .all() as any[];

    return rows.map((row) => ({
      id: row.id,
      pattern: this.encryption.decrypt(row.pattern),
      category: row.category,
      enabled: true,
      createdAt: row.created_at,
    }));
  }

  addLearningRule(pattern: string, category: string = 'CUSTOM'): string {
    const id = uuidv4();
    const encryptedPattern = this.encryption.encrypt(pattern);

    this.db
      .prepare('INSERT INTO learning_rules (id, pattern, category) VALUES (?, ?, ?)')
      .run(id, encryptedPattern, category);

    return id;
  }

  deleteLearningRule(id: string): void {
    this.db.prepare('DELETE FROM learning_rules WHERE id = ?').run(id);
  }

  toggleLearningRule(id: string, enabled: boolean): void {
    this.db
      .prepare('UPDATE learning_rules SET enabled = ? WHERE id = ?')
      .run(enabled ? 1 : 0, id);
  }

  // ==================== Prompts ====================

  getPrompts(): Prompt[] {
    const rows = this.db.prepare('SELECT * FROM prompts ORDER BY is_default DESC, created_at DESC').all() as any[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      content: this.encryption.decrypt(row.content),
      isDefault: Boolean(row.is_default),
      createdAt: row.created_at,
    }));
  }

  savePrompt(prompt: { id?: string; name: string; content: string }): string {
    const id = prompt.id || uuidv4();
    const encryptedContent = this.encryption.encrypt(prompt.content);

    if (prompt.id) {
      // Update existing
      this.db
        .prepare('UPDATE prompts SET name = ?, content = ? WHERE id = ?')
        .run(prompt.name, encryptedContent, prompt.id);
    } else {
      // Insert new
      this.db
        .prepare('INSERT INTO prompts (id, name, content, is_default) VALUES (?, ?, ?, 0)')
        .run(id, prompt.name, encryptedContent);
    }

    return id;
  }

  deletePrompt(id: string): void {
    // Don't allow deleting default prompts
    this.db.prepare('DELETE FROM prompts WHERE id = ? AND is_default = 0').run(id);
  }

  // ==================== Whitelist ====================

  getWhitelist(): WhitelistItem[] {
    const rows = this.db.prepare('SELECT * FROM whitelist ORDER BY created_at DESC').all() as any[];

    return rows.map((row) => ({
      id: row.id,
      phrase: this.encryption.decrypt(row.phrase),
      createdAt: row.created_at,
    }));
  }

  addWhitelistItem(phrase: string): string {
    const id = uuidv4();
    const encryptedPhrase = this.encryption.encrypt(phrase);

    this.db
      .prepare('INSERT INTO whitelist (id, phrase) VALUES (?, ?)')
      .run(id, encryptedPhrase);

    return id;
  }

  deleteWhitelistItem(id: string): void {
    this.db.prepare('DELETE FROM whitelist WHERE id = ?').run(id);
  }

  // ==================== Custom Patterns ====================

  getCustomPatterns(): CustomPattern[] {
    const rows = this.db.prepare('SELECT * FROM custom_patterns ORDER BY created_at DESC').all() as any[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      regex: this.encryption.decrypt(row.regex),
      category: row.category,
      createdAt: row.created_at,
    }));
  }

  addCustomPattern(pattern: { name: string; regex: string; category: string }): string {
    const id = uuidv4();
    const encryptedRegex = this.encryption.encrypt(pattern.regex);

    this.db
      .prepare('INSERT INTO custom_patterns (id, name, regex, category) VALUES (?, ?, ?, ?)')
      .run(id, pattern.name, encryptedRegex, pattern.category);

    return id;
  }

  deleteCustomPattern(id: string): void {
    this.db.prepare('DELETE FROM custom_patterns WHERE id = ?').run(id);
  }

  // ==================== Settings ====================

  getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value || null;
  }

  setSetting(key: string, value: string): void {
    this.db
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run(key, value);
  }

  deleteSetting(key: string): void {
    this.db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  }

  // ==================== Utilities ====================

  /**
   * Closes the database connection.
   */
  close(): void {
    this.db.close();
  }

  /**
   * Gets database statistics.
   */
  getStats(): { rules: number; prompts: number; whitelist: number; patterns: number } {
    const rules = this.db.prepare('SELECT COUNT(*) as count FROM learning_rules').get() as { count: number };
    const prompts = this.db.prepare('SELECT COUNT(*) as count FROM prompts').get() as { count: number };
    const whitelist = this.db.prepare('SELECT COUNT(*) as count FROM whitelist').get() as { count: number };
    const patterns = this.db.prepare('SELECT COUNT(*) as count FROM custom_patterns').get() as { count: number };

    return {
      rules: rules.count,
      prompts: prompts.count,
      whitelist: whitelist.count,
      patterns: patterns.count,
    };
  }

  /**
   * Exports all data as JSON (for backup).
   */
  exportData(): object {
    return {
      rules: this.getLearningRules(),
      prompts: this.getPrompts(),
      whitelist: this.getWhitelist(),
      patterns: this.getCustomPatterns(),
      exportedAt: new Date().toISOString(),
    };
  }
}

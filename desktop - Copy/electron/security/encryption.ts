import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { generateMachineId } from './machineId';

// Cryptographic constants
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits for AES-256
const SALT_LENGTH = 16; // 128 bits
const NONCE_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * AES-256-GCM encryption service with machine-bound key protection.
 *
 * Security features:
 * - Master key is never stored in plaintext
 * - Master key is XOR'd with a protection key derived from machine ID
 * - Uses PBKDF2-HMAC-SHA256 with 100,000 iterations for key derivation
 * - Each encryption operation uses a unique nonce
 * - GCM mode provides authenticated encryption
 * - Key file is hidden on Windows
 */
export class EncryptionService {
  private masterKey: Buffer | null = null;
  private keyPath: string;
  private initialized: boolean = false;

  constructor(appDataPath: string) {
    this.keyPath = path.join(appDataPath, '.encryption_key');
  }

  /**
   * Initializes the encryption service.
   * Loads existing key or generates a new one.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (fs.existsSync(this.keyPath)) {
        await this.loadKey();
      } else {
        await this.generateKey();
      }
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw new Error('Encryption initialization failed');
    }
  }

  /**
   * Generates a new master key and saves it protected by machine ID.
   */
  private async generateKey(): Promise<void> {
    // Generate cryptographically secure random master key
    const masterKey = crypto.randomBytes(KEY_LENGTH);

    // Generate random salt
    const salt = crypto.randomBytes(SALT_LENGTH);

    // Derive protection key from machine ID
    const machineId = generateMachineId();
    const protectionKey = crypto.pbkdf2Sync(
      machineId,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha256'
    );

    // XOR master key with protection key
    const encryptedKey = Buffer.alloc(KEY_LENGTH);
    for (let i = 0; i < KEY_LENGTH; i++) {
      encryptedKey[i] = masterKey[i] ^ protectionKey[i];
    }

    // Save: salt (16 bytes) + encrypted key (32 bytes)
    const keyData = Buffer.concat([salt, encryptedKey]);

    // Ensure directory exists
    const dir = path.dirname(this.keyPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write key file
    fs.writeFileSync(this.keyPath, keyData);

    // Set restrictive permissions (Unix) or hide file (Windows)
    if (process.platform === 'win32') {
      try {
        const { exec } = require('child_process');
        exec(`attrib +h "${this.keyPath}"`);
      } catch {
        // Ignore if attrib fails
      }
    } else {
      try {
        fs.chmodSync(this.keyPath, 0o600);
      } catch {
        // Ignore if chmod fails
      }
    }

    this.masterKey = masterKey;
  }

  /**
   * Loads and decrypts the master key using machine ID.
   */
  private async loadKey(): Promise<void> {
    const keyData = fs.readFileSync(this.keyPath);

    if (keyData.length !== SALT_LENGTH + KEY_LENGTH) {
      throw new Error('Invalid key file format');
    }

    // Extract salt and encrypted key
    const salt = keyData.subarray(0, SALT_LENGTH);
    const encryptedKey = keyData.subarray(SALT_LENGTH);

    // Derive protection key from machine ID
    const machineId = generateMachineId();
    const protectionKey = crypto.pbkdf2Sync(
      machineId,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha256'
    );

    // XOR to recover master key
    this.masterKey = Buffer.alloc(KEY_LENGTH);
    for (let i = 0; i < KEY_LENGTH; i++) {
      this.masterKey[i] = encryptedKey[i] ^ protectionKey[i];
    }
  }

  /**
   * Encrypts plaintext using AES-256-GCM.
   *
   * @param plaintext - String to encrypt
   * @returns Base64 encoded string: nonce (12) + authTag (16) + ciphertext
   */
  encrypt(plaintext: string): string {
    if (!this.masterKey) {
      throw new Error('Encryption not initialized');
    }

    // Generate unique nonce for this encryption
    const nonce = crypto.randomBytes(NONCE_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, nonce);

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine: nonce + authTag + ciphertext
    const result = Buffer.concat([nonce, authTag, encrypted]);

    return result.toString('base64');
  }

  /**
   * Decrypts ciphertext using AES-256-GCM.
   *
   * @param ciphertext - Base64 encoded string from encrypt()
   * @returns Decrypted plaintext string
   */
  decrypt(ciphertext: string): string {
    if (!this.masterKey) {
      throw new Error('Encryption not initialized');
    }

    try {
      const data = Buffer.from(ciphertext, 'base64');

      // Validate minimum length
      if (data.length < NONCE_LENGTH + AUTH_TAG_LENGTH + 1) {
        throw new Error('Invalid ciphertext');
      }

      // Extract components
      const nonce = data.subarray(0, NONCE_LENGTH);
      const authTag = data.subarray(NONCE_LENGTH, NONCE_LENGTH + AUTH_TAG_LENGTH);
      const encrypted = data.subarray(NONCE_LENGTH + AUTH_TAG_LENGTH);

      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, nonce);
      decipher.setAuthTag(authTag);

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      // Don't expose detailed error information
      throw new Error('Decryption failed');
    }
  }

  /**
   * Encrypts data and returns it with a version prefix for future compatibility.
   */
  encryptVersioned(plaintext: string): string {
    const encrypted = this.encrypt(plaintext);
    return `v1:${encrypted}`;
  }

  /**
   * Decrypts versioned data, handling different encryption versions.
   */
  decryptVersioned(ciphertext: string): string {
    if (ciphertext.startsWith('v1:')) {
      return this.decrypt(ciphertext.substring(3));
    }

    // Fallback: try to decrypt as-is (legacy data)
    return this.decrypt(ciphertext);
  }

  /**
   * Checks if the encryption service is properly initialized.
   */
  isInitialized(): boolean {
    return this.initialized && this.masterKey !== null;
  }

  /**
   * Securely clears the master key from memory.
   * Should be called when the app is closing.
   */
  destroy(): void {
    if (this.masterKey) {
      // Overwrite key with zeros
      this.masterKey.fill(0);
      this.masterKey = null;
    }
    this.initialized = false;
  }
}

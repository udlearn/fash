import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { HashAlgorithm } from '../types/index.js';

export class CryptoUtils {
  static hashString(input: string, algorithm: HashAlgorithm = 'sha256'): string {
    const hash = createHash(algorithm);
    hash.update(input);
    return hash.digest('hex');
  }

  static generateKey(secret?: string): string {
    if (secret) {
      return this.hashString(secret, 'sha256'); // SHA-256 produces 64 hex characters
    }
    return randomBytes(32).toString('hex'); // 32 bytes = 64 hex characters
  }

  static async encrypt(text: string, key: string): Promise<string> {
    const iv = randomBytes(16);
    // Ensure key is exactly 32 bytes for AES-256
    const keyBuffer = Buffer.from(key, 'hex').slice(0, 32);
    if (keyBuffer.length !== 32) {
      throw new Error('Invalid key length. Key must be 32 bytes (64 hex characters)');
    }
    const cipher = createCipheriv('aes-256-cbc', keyBuffer, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  static async decrypt(encryptedText: string, key: string): Promise<string> {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }
    const [ivHex, encrypted] = parts;
    if (!ivHex || !encrypted) {
      throw new Error('Invalid encrypted text format');
    }
    const iv = Buffer.from(ivHex, 'hex');
    // Ensure key is exactly 32 bytes for AES-256
    const keyBuffer = Buffer.from(key, 'hex').slice(0, 32);
    if (keyBuffer.length !== 32) {
      throw new Error('Invalid key length. Key must be 32 bytes (64 hex characters)');
    }
    const decipher = createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  static generateHashName(originalName: string, algorithm: HashAlgorithm = 'sha256'): string {
    const hash = this.hashString(originalName, algorithm);
    return hash; // Use full hash length instead of truncating to 32 characters
  }
}

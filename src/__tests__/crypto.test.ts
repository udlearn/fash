import { describe, it, expect } from 'vitest';
import { CryptoUtils } from '../utils/crypto';

describe('CryptoUtils', () => {
  it('should hash string with SHA-256', () => {
    const input = 'test string';
    const hash = CryptoUtils.hashString(input, 'sha256');
    expect(hash).toBeDefined();
    expect(hash).toHaveLength(64); // SHA-256 produces 64 character hex string
  });

  it('should hash string with MD5', () => {
    const input = 'test string';
    const hash = CryptoUtils.hashString(input, 'md5');
    expect(hash).toBeDefined();
    expect(hash).toHaveLength(32); // MD5 produces 32 character hex string
  });

  it('should generate consistent hash names', () => {
    const input = 'test-file.txt';
    const hash1 = CryptoUtils.generateHashName(input, 'sha256');
    const hash2 = CryptoUtils.generateHashName(input, 'sha256');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
  });

  it('should generate different hash lengths for different algorithms', () => {
    const input = 'test-file.txt';
    const md5Hash = CryptoUtils.generateHashName(input, 'md5');
    const sha1Hash = CryptoUtils.generateHashName(input, 'sha1');
    const sha256Hash = CryptoUtils.generateHashName(input, 'sha256');

    expect(md5Hash).toHaveLength(32); // MD5 produces 32 hex characters
    expect(sha1Hash).toHaveLength(40); // SHA-1 produces 40 hex characters
    expect(sha256Hash).toHaveLength(64); // SHA-256 produces 64 hex characters
  });

  it('should encrypt and decrypt text', async () => {
    const text = 'sensitive data';
    const key = '1234567890123456789012345678901234567890123456789012345678901234'; // 64 hex chars = 32 bytes
    const encrypted = await CryptoUtils.encrypt(text, key);
    const decrypted = await CryptoUtils.decrypt(encrypted, key);
    expect(decrypted).toBe(text);
  });

  it('should generate key from secret', () => {
    const secret = 'my-secret-password';
    const key = CryptoUtils.generateKey(secret);
    expect(key).toBeDefined();
    expect(key).toHaveLength(64); // SHA-256 produces 64 hex characters
  });

  it('should generate random key when no secret provided', () => {
    const key1 = CryptoUtils.generateKey();
    const key2 = CryptoUtils.generateKey();
    expect(key1).toBeDefined();
    expect(key2).toBeDefined();
    expect(key1).toHaveLength(64); // 32 bytes = 64 hex characters
    expect(key2).toHaveLength(64); // 32 bytes = 64 hex characters
    expect(key1).not.toBe(key2); // Should be different random keys
  });
});

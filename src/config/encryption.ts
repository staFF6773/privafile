// encryption.ts
import * as crypto from 'crypto';
import * as fs from 'fs';

const SALT_LENGTH = 16; // Salt length in bytes
const KEY_LENGTH = 32; // Key length in bytes (256 bits)
const IV_LENGTH = 12; // IV length in bytes for GCM (96 bits)
const ITERATIONS = 100000; // Number of iterations for PBKDF2
const AUTH_TAG_LENGTH = 16; // Authentication tag length in bytes (128 bits)

/**
 * Encrypts a file using AES-256-GCM.
 * @param filePath Path of the file to encrypt.
 * @param password Password to derive the encryption key.
 * @returns Object with the result of the operation.
 */
export function encryptFile(filePath: string, password: string): { success: boolean; path?: string; error?: string } {
  try {
    // Check if the file is already encrypted
    if (filePath.endsWith('.encrypted')) {
      return { success: false, error: 'The file is already encrypted.' };
    }

    // Read the file content
    const fileContent = fs.readFileSync(filePath);

    // Generate a random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive the key using PBKDF2
    const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');

    // Create the cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    // Encrypt the content
    const encryptedContent = Buffer.concat([
      cipher.update(fileContent),
      cipher.final(),
    ]);

    // Get the authentication tag
    const authTag = cipher.getAuthTag();

    // Final format: salt (16 bytes) + iv (12 bytes) + authTag (16 bytes) + encrypted content
    const finalBuffer = Buffer.concat([salt, iv, authTag, encryptedContent]);

    // Rename the original file by appending .encrypted
    const newPath = filePath + '.encrypted';
    fs.renameSync(filePath, newPath);

    // Write the encrypted content to the new file
    fs.writeFileSync(newPath, finalBuffer);

    return { success: true, path: newPath };
  } catch (error) {
    console.error('Error encrypting the file:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Decrypts a file encrypted with AES-256-GCM.
 * @param filePath Path of the encrypted file.
 * @param password Password to derive the decryption key.
 * @returns Object with the result of the operation.
 */
export function decryptFile(filePath: string, password: string): { success: boolean; path?: string; error?: string } {
  try {
    // Check if the file is encrypted
    if (!filePath.endsWith('.encrypted')) {
      return { success: false, error: 'The file is not encrypted.' };
    }

    // Read the encrypted data
    const encryptedData = fs.readFileSync(filePath);

    // Extract the salt, IV, auth tag, and encrypted content
    const salt = encryptedData.slice(0, SALT_LENGTH);
    const iv = encryptedData.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = encryptedData.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const encryptedContent = encryptedData.slice(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    // Derive the key using the same salt
    const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');

    // Create the decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag); // Set the authentication tag

    // Decrypt the content
    const decryptedContent = Buffer.concat([
      decipher.update(encryptedContent),
      decipher.final(),
    ]);

    // Get the original path (without .encrypted)
    const originalPath = filePath.slice(0, -'.encrypted'.length);

    // Write the decrypted content to the original file
    fs.writeFileSync(originalPath, decryptedContent);

    // Delete the encrypted file
    fs.unlinkSync(filePath);

    return { success: true, path: originalPath };
  } catch (error) {
    console.error('Error decrypting the file:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

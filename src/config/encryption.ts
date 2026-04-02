// encryption.ts
import * as crypto from 'crypto';
import * as fs from 'fs';

const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
const AUTH_TAG_LENGTH = 16;

const ALGORITHMS: Record<string, { id: number; name: string; ivLength: number }> = {
  'aes-256-gcm': { id: 0x01, name: 'aes-256-gcm', ivLength: 12 },
  'aes-256-cbc': { id: 0x02, name: 'aes-256-cbc', ivLength: 16 }
};

export function encryptFile(filePath: string, password: string, algorithmName: string = 'aes-256-gcm'): { success: boolean; path?: string; error?: string } {
  try {
    const algo = ALGORITHMS[algorithmName] || ALGORITHMS['aes-256-gcm'];
    
    if (filePath.endsWith('.encrypted')) {
      return { success: false, error: 'The file is already encrypted.' };
    }

    const fileContent = fs.readFileSync(filePath);
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(algo.ivLength);
    const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');

    let cipher: any;
    let authTag: Buffer | null = null;

    if (algo.name.includes('gcm')) {
      // @ts-ignore
      cipher = crypto.createCipheriv(algo.name, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    } else {
      cipher = crypto.createCipheriv(algo.name, key, iv);
    }

    const encryptedContent = Buffer.concat([
      cipher.update(fileContent),
      cipher.final(),
    ]);

    if (algo.name.includes('gcm')) {
      authTag = cipher.getAuthTag();
    }

    // Header: [1 byte AlgorithmID] [16 bytes Salt] [IV_LENGTH bytes IV] [16 bytes AuthTag (if GCM)]
    const headerId = Buffer.alloc(1);
    headerId.writeUInt8(algo.id, 0);

    const buffers = [headerId, salt, iv] as any[];
    if (authTag) buffers.push(authTag);
    buffers.push(encryptedContent);

    const finalBuffer = Buffer.concat(buffers);

    const newPath = filePath + '.encrypted';
    fs.renameSync(filePath, newPath);
    fs.writeFileSync(newPath, finalBuffer);

    return { success: true, path: newPath };
  } catch (error) {
    console.error('Error encrypting the file:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function decryptFile(filePath: string, password: string): { success: boolean; path?: string; error?: string } {
  try {
    if (!filePath.endsWith('.encrypted')) {
      return { success: false, error: 'The file is not encrypted.' };
    }

    const encryptedData = fs.readFileSync(filePath);

    // Read Algorithm ID (first byte)
    const algoId = encryptedData.readUInt8(0);
    const algoName = Object.keys(ALGORITHMS).find(key => ALGORITHMS[key].id === algoId);
    if (!algoName) return { success: false, error: 'Unsupported or corrupted encryption format.' };
    
    const algo = ALGORITHMS[algoName];

    let offset = 1;
    const salt = encryptedData.slice(offset, offset + SALT_LENGTH);
    offset += SALT_LENGTH;
    const iv = encryptedData.slice(offset, offset + algo.ivLength);
    offset += algo.ivLength;

    let authTag: Buffer | null = null;
    if (algo.name.includes('gcm')) {
      authTag = encryptedData.slice(offset, offset + AUTH_TAG_LENGTH);
      offset += AUTH_TAG_LENGTH;
    }

    const encryptedContent = encryptedData.slice(offset);
    const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');

    // @ts-ignore
    const decipher = crypto.createDecipheriv(algo.name, key, iv, algo.name.includes('gcm') ? { authTagLength: AUTH_TAG_LENGTH } : undefined);
    
    if (authTag) {
      (decipher as crypto.DecipherGCM).setAuthTag(authTag);
    }

    const decryptedContent = Buffer.concat([
      decipher.update(encryptedContent),
      decipher.final(),
    ]);

    const originalPath = filePath.slice(0, -'.encrypted'.length);
    fs.writeFileSync(originalPath, decryptedContent);
    fs.unlinkSync(filePath);

    return { success: true, path: originalPath };
  } catch (error) {
    console.error('Error decrypting the file:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

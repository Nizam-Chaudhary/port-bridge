import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Helper to expand tilde to home directory
export const expandTilde = (filepath: string) => {
    if (filepath.startsWith('~/')) {
        return path.join(os.homedir(), filepath.slice(2));
    }
    return filepath;
};

// Ensure a directory exists
export const ensureDirectoryExists = async (dirPath: string) => {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
};

// Read a file, returning null if it doesn't exist
export const safelyReadFile = async (filepath: string): Promise<string | null> => {
    try {
        const expandedPath = expandTilde(filepath);
        const content = await fs.readFile(expandedPath, 'utf-8');
        return content;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
};

// Write a file, ensuring its directory exists
export const safelyWriteFile = async (filepath: string, content: string): Promise<void> => {
    const expandedPath = expandTilde(filepath);
    const dirPath = path.dirname(expandedPath);

    await ensureDirectoryExists(dirPath);
    await fs.writeFile(expandedPath, content, 'utf-8');
};

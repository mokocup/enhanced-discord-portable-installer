import fs from 'node:fs';

export const exists = (file: string) => {
    try {
        fs.statSync(file);
        return true;
    } catch {
        return false;
    }
}
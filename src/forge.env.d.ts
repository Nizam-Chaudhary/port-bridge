/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

declare global {
    interface Window {
        electronAPI: {
            ssh: {
                loadConfig: (path: string) => Promise<any>;
                saveConfig: (path: string, data: any) => Promise<{ success: boolean }>;
                importSshConfig: (path: string) => Promise<any[] | null>;
                generateSshConfig: (path: string, data: any) => Promise<{ success: boolean }>;
            };
        };
    }
}

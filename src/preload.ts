// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    ssh: {
        loadConfig: (path: string) => ipcRenderer.invoke('ssh:loadConfig', path),
        saveConfig: (path: string, data: any) => ipcRenderer.invoke('ssh:saveConfig', path, data),
        importSshConfig: (path: string) => ipcRenderer.invoke('ssh:importSshConfig', path),
        generateSshConfig: (path: string, data: any) =>
            ipcRenderer.invoke('ssh:generateSshConfig', path, data),
    },
});

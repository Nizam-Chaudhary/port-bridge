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
        // Tunnel management
        checkPort: (port: number) => ipcRenderer.invoke('ssh:checkPort', port),
        startTunnel: (forwardConfig: any, hostConfig: any) =>
            ipcRenderer.invoke('ssh:startTunnel', forwardConfig, hostConfig),
        stopTunnel: (forwardId: string) => ipcRenderer.invoke('ssh:stopTunnel', forwardId),
        getTunnelStatus: (forwardId: string) =>
            ipcRenderer.invoke('ssh:getTunnelStatus', forwardId),
        generateCommand: (forwardConfig: any, hostConfig: any) =>
            ipcRenderer.invoke('ssh:generateCommand', forwardConfig, hostConfig),
        openTerminal: (hostConfig: any, terminalSettings: any) =>
            ipcRenderer.invoke('ssh:openTerminal', hostConfig, terminalSettings),
        showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:showOpenDialog', options),
        // Status change listener
        onTunnelStatusChange: (
            callback: (data: { forwardId: string; status: string; error?: string }) => void,
        ) => {
            ipcRenderer.on('tunnel:statusChange', (_, data) => callback(data));
        },
        removeTunnelStatusListener: () => {
            ipcRenderer.removeAllListeners('tunnel:statusChange');
        },
    },
});

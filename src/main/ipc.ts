import { ipcMain } from 'electron';
import SSHConfig from 'ssh-config';

import { safelyReadFile, safelyWriteFile } from './fs-utils';
import { TunnelManager, checkPortAvailability } from './tunnel-manager';

const tunnelManager = new TunnelManager();

export function setupIpcHandlers() {
    // Set up tunnel status change callback
    tunnelManager.onStatusChange((forwardId, status, error) => {
        // Broadcast to all renderer windows
        const { BrowserWindow } = require('electron');
        for (const win of BrowserWindow.getAllWindows()) {
            win.webContents.send('tunnel:statusChange', { forwardId, status, error });
        }
    });

    // 1. Load config from JSON
    ipcMain.handle('ssh:loadConfig', async (_, configPath: string) => {
        try {
            const content = await safelyReadFile(configPath);
            if (!content) return null;
            return JSON.parse(content);
        } catch (error) {
            console.error('Error loading config:', error);
            throw error;
        }
    });

    // 2. Save config to JSON
    ipcMain.handle('ssh:saveConfig', async (_, configPath: string, configData: any) => {
        try {
            const jsonString = JSON.stringify(configData, null, 2);
            await safelyWriteFile(configPath, jsonString);
            return { success: true };
        } catch (error) {
            console.error('Error saving config:', error);
            throw error;
        }
    });

    // 3. Import existing ~/.ssh/config
    ipcMain.handle('ssh:importSshConfig', async (_, sshConfigPath: string) => {
        try {
            const content = await safelyReadFile(sshConfigPath);
            if (!content) return null;

            const config = SSHConfig.parse(content);
            const importedHosts: any[] = [];

            for (const section of config) {
                if (section.type === 1 && section.param === 'Host') {
                    const secValue = section.value as unknown as string;
                    if (secValue === '*' || secValue.includes('?')) continue;

                    const host: any = {
                        id: crypto.randomUUID(),
                        name: section.value,
                        status: 'disconnected',
                        customOptions: [],
                        forwards: [],
                    };

                    for (const line of (section as any).config || []) {
                        if (line.type !== 1) continue;

                        const key = line.param.toLowerCase();
                        const val = line.value;

                        switch (key) {
                            case 'hostname':
                                host.hostname = val;
                                break;
                            case 'user':
                                host.username = val;
                                break;
                            case 'port':
                                host.port = parseInt(val, 10);
                                break;
                            case 'identityfile':
                                host.identityFile = val;
                                break;
                            case 'proxyjump':
                                host.proxyJump = val;
                                break;
                            case 'compression':
                                host.compression = val.toLowerCase() === 'yes';
                                break;
                            case 'connecttimeout':
                                host.connectTimeout = parseInt(val, 10);
                                break;
                            case 'serveraliveinterval':
                                host.serverAliveInterval = parseInt(val, 10);
                                host.keepAlive = true;
                                break;
                            case 'serveralivecountmax':
                                host.serverAliveCountMax = parseInt(val, 10);
                                break;
                            case 'stricthostkeychecking':
                                host.strictHostKeyChecking = val;
                                break;
                            case 'forwardagent':
                                host.forwardAgent = val.toLowerCase() === 'yes';
                                break;
                            case 'identitiesonly':
                                host.identitiesOnly = val.toLowerCase() === 'yes';
                                break;
                            case 'requesttty':
                                host.requestTTY = val.toLowerCase() === 'yes';
                                break;
                            case 'localforward': {
                                // Parse "port host:port" or "bind:port host:port"
                                const forward = parseLocalForward(val, host.id);
                                if (forward) host.forwards.push(forward);
                                break;
                            }
                            case 'remoteforward': {
                                const forward = parseRemoteForward(val, host.id);
                                if (forward) host.forwards.push(forward);
                                break;
                            }
                            case 'dynamicforward': {
                                const forward = parseDynamicForward(val, host.id);
                                if (forward) host.forwards.push(forward);
                                break;
                            }
                            default:
                                host.customOptions.push({ key: line.param, value: val });
                                break;
                        }
                    }

                    if (host.hostname) {
                        host.authType = host.identityFile ? 'key' : 'password';
                        if (!host.port) host.port = 22;
                        importedHosts.push(host);
                    }
                }
            }

            return importedHosts;
        } catch (error) {
            console.error('Error importing SSH config:', error);
            throw error;
        }
    });

    // 4. Generate SSH config based on internal config
    ipcMain.handle('ssh:generateSshConfig', async (_, sshConfigPath: string, appConfig: any) => {
        try {
            const config = new SSHConfig();

            for (const host of appConfig.hosts) {
                const block = config.append({
                    Host: host.name,
                });

                block.append({ HostName: host.hostname });
                if (host.username) block.append({ User: host.username });
                if (host.port && host.port !== 22) block.append({ Port: host.port.toString() });
                if (host.identityFile) block.append({ IdentityFile: host.identityFile });

                if (host.proxyJump) block.append({ ProxyJump: host.proxyJump });
                if (host.compression) block.append({ Compression: 'yes' });
                if (host.connectTimeout !== undefined && host.connectTimeout !== 10)
                    block.append({ ConnectTimeout: host.connectTimeout.toString() });

                if (host.keepAlive) {
                    if (host.serverAliveInterval)
                        block.append({ ServerAliveInterval: host.serverAliveInterval.toString() });
                    if (host.serverAliveCountMax)
                        block.append({ ServerAliveCountMax: host.serverAliveCountMax.toString() });
                }

                if (host.strictHostKeyChecking && host.strictHostKeyChecking !== 'ask')
                    block.append({ StrictHostKeyChecking: host.strictHostKeyChecking });
                if (host.forwardAgent) block.append({ ForwardAgent: 'yes' });
                if (host.identitiesOnly) block.append({ IdentitiesOnly: 'yes' });
                if (host.requestTTY) block.append({ RequestTTY: 'yes' });

                for (const forward of host.forwards) {
                    if (forward.type === 'local') {
                        const bindPart = forward.bindAddress
                            ? `${forward.bindAddress}:${forward.localPort}`
                            : `${forward.localPort}`;
                        block.append({
                            LocalForward: `${bindPart} ${forward.remoteHost || 'localhost'}:${forward.remotePort}`,
                        });
                    } else if (forward.type === 'remote') {
                        block.append({
                            RemoteForward: `${forward.remotePort} ${forward.localHost || 'localhost'}:${forward.localPort}`,
                        });
                    } else if (forward.type === 'dynamic') {
                        const bindPart = forward.bindAddress
                            ? `${forward.bindAddress}:${forward.localPort}`
                            : forward.localPort.toString();
                        block.append({ DynamicForward: bindPart });
                    }
                }

                for (const customOpt of host.customOptions) {
                    block.append({ [customOpt.key]: customOpt.value });
                }
            }

            const generatedConfig = SSHConfig.stringify(config);
            await safelyWriteFile(sshConfigPath, generatedConfig);
            return { success: true };
        } catch (error) {
            console.error('Error generating SSH config:', error);
            throw error;
        }
    });

    // 5. Check port availability
    ipcMain.handle('ssh:checkPort', async (_, port: number) => {
        try {
            return await checkPortAvailability(port);
        } catch (error) {
            console.error('Error checking port:', error);
            throw error;
        }
    });

    // 6. Start a tunnel
    ipcMain.handle('ssh:startTunnel', async (_, forwardConfig: any, hostConfig: any) => {
        try {
            const result = tunnelManager.start(forwardConfig, hostConfig, 'ssh');
            return { success: true, pid: result.pid };
        } catch (error) {
            console.error('Error starting tunnel:', error);
            throw error;
        }
    });

    // 7. Stop a tunnel
    ipcMain.handle('ssh:stopTunnel', async (_, forwardId: string) => {
        try {
            const stopped = tunnelManager.stop(forwardId);
            return { success: stopped };
        } catch (error) {
            console.error('Error stopping tunnel:', error);
            throw error;
        }
    });

    // 8. Get tunnel status
    ipcMain.handle('ssh:getTunnelStatus', async (_, forwardId: string) => {
        try {
            return tunnelManager.status(forwardId);
        } catch (error) {
            console.error('Error getting tunnel status:', error);
            throw error;
        }
    });

    // 9. Generate SSH command string (for preview)
    ipcMain.handle('ssh:generateCommand', async (_, forwardConfig: any, hostConfig: any) => {
        try {
            return tunnelManager.generateSshCommand(forwardConfig, hostConfig, 'ssh');
        } catch (error) {
            console.error('Error generating command:', error);
            throw error;
        }
    });

    // 10. Open SSH connection in a terminal emulator
    ipcMain.handle(
        'ssh:openTerminal',
        async (
            _,
            hostConfig: {
                hostname: string;
                port?: number;
                username?: string;
                identityFile?: string;
                password?: string;
            },
            terminalSettings: {
                terminal: 'kitty' | 'alacritty' | 'ghostty' | 'custom';
                customTerminalPath?: string;
            },
        ) => {
            try {
                const { spawn } = require('node:child_process');

                // Build SSH args
                const sshArgs: string[] = [];
                if (hostConfig.identityFile) {
                    sshArgs.push('-i', hostConfig.identityFile);
                }
                if (hostConfig.port && hostConfig.port !== 22) {
                    sshArgs.push('-p', hostConfig.port.toString());
                }
                const target = hostConfig.username
                    ? `${hostConfig.username}@${hostConfig.hostname}`
                    : hostConfig.hostname;
                sshArgs.push(target);

                let cmd: string;
                let args: string[];

                switch (terminalSettings.terminal) {
                    case 'kitty':
                        // kitty uses `kitten ssh` instead of ssh
                        cmd = 'kitty';
                        args = ['kitten', 'ssh', ...sshArgs];
                        break;
                    case 'alacritty':
                        cmd = 'alacritty';
                        args = ['-e', 'ssh', ...sshArgs];
                        break;
                    case 'ghostty':
                        cmd = 'ghostty';
                        args = ['-e', 'ssh', ...sshArgs];
                        break;
                    case 'custom':
                        cmd = terminalSettings.customTerminalPath || 'xterm';
                        args = ['-e', 'ssh', ...sshArgs];
                        break;
                    default:
                        throw new Error(`Unknown terminal: ${String(terminalSettings.terminal)}`);
                }

                const env: NodeJS.ProcessEnv = { ...process.env };
                if (hostConfig.password) {
                    args = ['-e', cmd, ...args];
                    cmd = 'sshpass';
                    env.SSHPASS = hostConfig.password;
                }

                const proc = spawn(cmd, args, {
                    detached: true,
                    stdio: 'ignore',
                    env,
                });
                proc.unref();

                return { success: true, pid: proc.pid };
            } catch (error) {
                console.error('Error opening terminal:', error);
                throw error;
            }
        },
    );
}

// Cleanup all tunnels on app quit
export function cleanupTunnels() {
    tunnelManager.stopAll();
}

// --- Forward parsing helpers ---

function parseLocalForward(value: string, hostId: string) {
    // Formats: "port host:port" or "bind:port host:port"
    const parts = value.trim().split(/\s+/);
    if (parts.length !== 2) return null;

    const [source, dest] = parts;
    const destParts = dest.split(':');
    if (destParts.length !== 2) return null;

    let localPort: number;
    let bindAddress: string | undefined;

    if (source.includes(':')) {
        const srcParts = source.split(':');
        bindAddress = srcParts[0];
        localPort = parseInt(srcParts[1], 10);
    } else {
        localPort = parseInt(source, 10);
    }

    return {
        id: crypto.randomUUID(),
        name: `local-${localPort}`,
        hostId,
        type: 'local',
        localPort,
        remoteHost: destParts[0],
        remotePort: parseInt(destParts[1], 10),
        bindAddress,
        status: 'stopped',
        autoStart: false,
        restartOnDisconnect: false,
        gatewayPorts: false,
    };
}

function parseRemoteForward(value: string, hostId: string) {
    const parts = value.trim().split(/\s+/);
    if (parts.length !== 2) return null;

    const [source, dest] = parts;
    const destParts = dest.split(':');
    if (destParts.length !== 2) return null;

    const remotePort = parseInt(source, 10);

    return {
        id: crypto.randomUUID(),
        name: `remote-${remotePort}`,
        hostId,
        type: 'remote',
        remotePort,
        localHost: destParts[0],
        localPort: parseInt(destParts[1], 10),
        status: 'stopped',
        autoStart: false,
        restartOnDisconnect: false,
        gatewayPorts: false,
    };
}

function parseDynamicForward(value: string, hostId: string) {
    const trimmed = value.trim();
    let localPort: number;
    let bindAddress: string | undefined;

    if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        bindAddress = parts[0];
        localPort = parseInt(parts[1], 10);
    } else {
        localPort = parseInt(trimmed, 10);
    }

    return {
        id: crypto.randomUUID(),
        name: `socks-${localPort}`,
        hostId,
        type: 'dynamic',
        localPort,
        bindAddress,
        status: 'stopped',
        autoStart: false,
        restartOnDisconnect: false,
        gatewayPorts: false,
    };
}

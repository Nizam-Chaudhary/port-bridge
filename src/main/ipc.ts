import { ipcMain } from 'electron';
import SSHConfig from 'ssh-config';

import { safelyReadFile, safelyWriteFile } from './fs-utils';

export function setupIpcHandlers() {
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

            // Quick and dirty conversion for now, we'll map fields
            for (const section of config) {
                if (section.type === 1 && section.param === 'Host') {
                    // 1 is SSHConfig.DIRECTIVE
                    // Found a Host block
                    const secValue = section.value as unknown as string;
                    if (secValue === '*' || secValue.includes('?')) continue; // Skip wildcards

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
                            // Add LocalForward handling here later
                            default:
                                host.customOptions.push({ key: line.param, value: val });
                                break;
                        }
                    }

                    if (host.hostname) {
                        // Default auth to key if identity file exists, else password unless we know better
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
                        block.append({
                            LocalForward: `${forward.localPort} ${forward.remoteHost || 'localhost'}:${forward.remotePort}`,
                        });
                    } else if (forward.type === 'remote') {
                        block.append({
                            RemoteForward: `${forward.remotePort} ${forward.localHost || 'localhost'}:${forward.localPort}`,
                        });
                    } else if (forward.type === 'dynamic') {
                        block.append({ DynamicForward: forward.localPort.toString() });
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
}

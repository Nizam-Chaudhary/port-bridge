import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import type { AppSettings, Host, PortForward } from './types';

import { initialSettings } from './mock-data';

interface AppStore {
    hosts: Host[];
    addHost: (host: Omit<Host, 'id' | 'status'>) => void;
    updateHost: (id: string, host: Partial<Host>) => void;
    deleteHost: (id: string) => void;
    duplicateHost: (id: string) => void;

    forwards: PortForward[];
    addForward: (forward: Omit<PortForward, 'id' | 'status'>) => void;
    updateForward: (id: string, forward: Partial<PortForward>) => void;
    deleteForward: (id: string) => void;
    toggleForward: (id: string) => void;
    startForward: (id: string) => Promise<void>;
    stopForward: (id: string) => Promise<void>;
    checkPortAvailability: (
        port: number,
    ) => Promise<{ available: boolean; suggestedPort?: number }>;

    settings: AppSettings;
    updateSettings: (settings: Partial<AppSettings>) => void;
}

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
    const [hosts, setHosts] = useState<Host[]>([]);
    const [forwards, setForwards] = useState<PortForward[]>([]);
    const [settings, setSettings] = useState<AppSettings>(initialSettings);
    const [isLoaded, setIsLoaded] = useState(false);

    // Initial Load
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                let configPath = initialSettings.configStoragePath;
                if (!configPath.endsWith('.json')) {
                    configPath = `${configPath}/config.json`;
                }
                // @ts-expect-error global scope window extensions
                const data = await window.electronAPI.ssh.loadConfig(configPath);
                if (data) {
                    if (data.hosts) setHosts(data.hosts);
                    if (data.settings) setSettings(data.settings);

                    const allForwards = data.hosts.flatMap((h: Host) => h.forwards || []);
                    setForwards(allForwards);
                }
            } catch (err) {
                console.error('Failed to load config', err);
            } finally {
                setIsLoaded(true);
            }
        };
        void loadInitialData();
    }, []);

    // Listen for tunnel status changes from main process
    useEffect(() => {
        try {
            // @ts-expect-error global scope window extensions
            window.electronAPI.ssh.onTunnelStatusChange(
                (data: { forwardId: string; status: string; error?: string }) => {
                    setForwards((prev) =>
                        prev.map((f) => {
                            if (f.id !== data.forwardId) return f;
                            return { ...f, status: data.status } as PortForward;
                        }),
                    );
                },
            );
        } catch {
            // Not in Electron environment
        }

        return () => {
            try {
                // @ts-expect-error global scope window extensions
                window.electronAPI.ssh.removeTunnelStatusListener();
            } catch {
                // Not in Electron environment
            }
        };
    }, []);

    // Save on Change
    useEffect(() => {
        if (!isLoaded) return;

        const saveConfig = async () => {
            try {
                const hostsWithForwards = hosts.map((h) => ({
                    ...h,
                    forwards: forwards.filter((f) => f.hostId === h.id),
                }));

                const configData = {
                    hosts: hostsWithForwards,
                    settings,
                };

                let configPath = settings.configStoragePath;
                if (!configPath.endsWith('.json')) {
                    configPath = `${configPath}/config.json`;
                }

                // @ts-expect-error global scope window extensions
                await window.electronAPI.ssh.saveConfig(configPath, configData);
            } catch (err) {
                console.error('Failed to save config', err);
            }
        };

        const timer = setTimeout(saveConfig, 500);
        return () => clearTimeout(timer);
    }, [hosts, forwards, settings, isLoaded]);

    const addHost = useCallback((host: Omit<Host, 'id' | 'status'>) => {
        setHosts((prev) => [
            ...prev,
            { ...host, id: crypto.randomUUID(), status: 'disconnected' } as Host,
        ]);
    }, []);

    const updateHost = useCallback((id: string, updates: Partial<Host>) => {
        setHosts((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));
    }, []);

    const deleteHost = useCallback((id: string) => {
        setHosts((prev) => prev.filter((h) => h.id !== id));
        setForwards((prev) => prev.filter((f) => f.hostId !== id));
    }, []);

    const duplicateHost = useCallback((id: string) => {
        setHosts((prev) => {
            const host = prev.find((h) => h.id === id);
            if (!host) return prev;
            return [
                ...prev,
                {
                    ...host,
                    id: crypto.randomUUID(),
                    name: `${host.name}-copy`,
                    status: 'disconnected' as const,
                },
            ];
        });
    }, []);

    const addForward = useCallback((forward: Omit<PortForward, 'id' | 'status'>) => {
        setForwards((prev) => [
            ...prev,
            { ...forward, id: crypto.randomUUID(), status: 'stopped' } as PortForward,
        ]);
    }, []);

    const updateForward = useCallback((id: string, updates: Partial<PortForward>) => {
        setForwards((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    }, []);

    const deleteForward = useCallback((id: string) => {
        setForwards((prev) => prev.filter((f) => f.id !== id));
    }, []);

    // Simple toggle (used for quick UI state switching)
    const toggleForward = useCallback((id: string) => {
        setForwards((prev) =>
            prev.map((f) => {
                if (f.id !== id) return f;
                return {
                    ...f,
                    status: f.status === 'running' ? 'stopped' : 'running',
                } as PortForward;
            }),
        );
    }, []);

    // Real IPC-backed tunnel start
    const startForward = useCallback(
        async (id: string) => {
            const forward = forwards.find((f) => f.id === id);
            if (!forward) return;

            const host = hosts.find((h) => h.id === forward.hostId);
            if (!host) return;

            try {
                // @ts-expect-error global scope window extensions
                await window.electronAPI.ssh.startTunnel(
                    {
                        id: forward.id,
                        type: forward.type,
                        localPort: forward.localPort,
                        remoteHost: forward.remoteHost,
                        remotePort: forward.remotePort,
                        localHost: forward.localHost,
                        bindAddress: forward.bindAddress,
                        gatewayPorts: forward.gatewayPorts,
                        restartOnDisconnect: forward.restartOnDisconnect,
                    },
                    {
                        name: host.name,
                        hostname: host.hostname,
                        port: host.port,
                        username: host.username,
                        identityFile: host.identityFile,
                    },
                    settings.sshBinaryPath,
                );

                setForwards((prev) =>
                    prev.map((f) => (f.id === id ? { ...f, status: 'running' as const } : f)),
                );
            } catch (err) {
                console.error('Failed to start tunnel', err);
                setForwards((prev) =>
                    prev.map((f) => (f.id === id ? { ...f, status: 'error' as const } : f)),
                );
            }
        },
        [forwards, hosts, settings.sshBinaryPath],
    );

    // Real IPC-backed tunnel stop
    const stopForward = useCallback(async (id: string) => {
        try {
            // @ts-expect-error global scope window extensions
            await window.electronAPI.ssh.stopTunnel(id);
            setForwards((prev) =>
                prev.map((f) => (f.id === id ? { ...f, status: 'stopped' as const } : f)),
            );
        } catch (err) {
            console.error('Failed to stop tunnel', err);
        }
    }, []);

    // Port availability check
    const checkPortAvailability = useCallback(async (port: number) => {
        try {
            // @ts-expect-error global scope window extensions
            return await window.electronAPI.ssh.checkPort(port);
        } catch (err) {
            console.error('Failed to check port', err);
            return { available: true };
        }
    }, []);

    const updateSettings = useCallback((updates: Partial<AppSettings>) => {
        setSettings((prev) => ({ ...prev, ...updates }));
    }, []);

    if (!isLoaded) {
        return (
            <div className='flex h-screen w-screen items-center justify-center'>
                Loading Configuration...
            </div>
        );
    }

    return (
        <AppStoreContext.Provider
            value={{
                hosts,
                addHost,
                updateHost,
                deleteHost,
                duplicateHost,
                forwards,
                addForward,
                updateForward,
                deleteForward,
                toggleForward,
                startForward,
                stopForward,
                checkPortAvailability,
                settings,
                updateSettings,
            }}>
            {children}
        </AppStoreContext.Provider>
    );
}

export function useAppStore() {
    const context = useContext(AppStoreContext);
    if (!context) {
        throw new Error('useAppStore must be used within AppStoreProvider');
    }
    return context;
}

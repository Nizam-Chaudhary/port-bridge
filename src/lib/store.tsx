import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { AppSettings, Host, PortForward } from './types';

import { initialSettings } from './mock-data';

interface AppState {
    hosts: Host[];
    forwards: PortForward[];
    settings: AppSettings;
    isLoaded: boolean;
}

interface AppActions {
    addHost: (host: Omit<Host, 'id' | 'status'>) => void;
    updateHost: (id: string, host: Partial<Host>) => void;
    deleteHost: (id: string) => void;
    duplicateHost: (id: string) => void;
    toggleHostPin: (id: string) => void;

    addForward: (forward: Omit<PortForward, 'id' | 'status'>) => void;
    updateForward: (id: string, forward: Partial<PortForward>) => void;
    deleteForward: (id: string) => void;
    toggleForward: (id: string) => void;
    toggleForwardPin: (id: string) => void;
    connectHost: (id: string, password?: string) => Promise<void>;
    startForward: (id: string, password?: string) => Promise<void>;
    stopForward: (id: string) => Promise<void>;
    checkPortAvailability: (
        port: number,
    ) => Promise<{ available: boolean; suggestedPort?: number }>;

    updateSettings: (settings: Partial<AppSettings>) => void;

    // Internal actions for initialization and IPC
    _setInitialData: (data: { hosts?: Host[]; settings?: AppSettings }) => void;
    _setTunnelStatus: (forwardId: string, status: string, error?: string) => void;
    _setIsLoaded: (isLoaded: boolean) => void;
}

export type AppStore = AppState & AppActions;

const initialState: AppState = {
    hosts: [],
    forwards: [],
    settings: initialSettings,
    isLoaded: false,
};

export const useAppStore = create<AppStore>()(
    devtools(
        subscribeWithSelector(
            immer((set, get) => ({
                ...initialState,

                addHost: (host) => {
                    set((state) => {
                        state.hosts.push({
                            ...host,
                            id: crypto.randomUUID(),
                            status: 'disconnected',
                        } as Host);
                    });
                },

                updateHost: (id, updates) => {
                    set((state) => {
                        const host = state.hosts.find((h) => h.id === id);
                        if (host) {
                            Object.assign(host, updates);
                        }
                    });
                },

                deleteHost: (id) => {
                    set((state) => {
                        state.hosts = state.hosts.filter((h) => h.id !== id);
                        state.forwards = state.forwards.filter((f) => f.hostId !== id);
                    });
                },

                duplicateHost: (id) => {
                    set((state) => {
                        const host = state.hosts.find((h) => h.id === id);
                        if (host) {
                            state.hosts.push({
                                ...host,
                                id: crypto.randomUUID(),
                                name: `${host.name}-copy`,
                                status: 'disconnected' as const,
                            });
                        }
                    });
                },

                toggleHostPin: (id) => {
                    set((state) => {
                        const host = state.hosts.find((h) => h.id === id);
                        if (host) {
                            host.pinned = !host.pinned;
                        }
                    });
                },

                connectHost: async (id, password) => {
                    const state = get();
                    const host = state.hosts.find((h) => h.id === id);
                    if (!host) return;

                    try {
                        // @ts-expect-error global scope window extensions
                        await window.electronAPI.ssh.openTerminal(
                            {
                                hostname: host.hostname,
                                port: host.port,
                                username: host.username,
                                identityFile: host.identityFile,
                                password: password || host.password,
                            },
                            {
                                terminal: state.settings.terminal,
                                customTerminalPath: state.settings.customTerminalPath,
                            },
                        );
                    } catch (err) {
                        console.error('Failed to open terminal', err);
                    }
                },

                addForward: (forward) => {
                    set((state) => {
                        state.forwards.push({
                            ...forward,
                            id: crypto.randomUUID(),
                            status: 'stopped',
                        } as PortForward);
                    });
                },

                updateForward: (id, updates) => {
                    set((state) => {
                        const forward = state.forwards.find((f) => f.id === id);
                        if (forward) {
                            Object.assign(forward, updates);
                        }
                    });
                },

                deleteForward: (id) => {
                    set((state) => {
                        state.forwards = state.forwards.filter((f) => f.id !== id);
                    });
                },

                toggleForward: (id) => {
                    set((state) => {
                        const forward = state.forwards.find((f) => f.id === id);
                        if (forward) {
                            forward.status = forward.status === 'running' ? 'stopped' : 'running';
                        }
                    });
                },

                toggleForwardPin: (id) => {
                    set((state) => {
                        const forward = state.forwards.find((f) => f.id === id);
                        if (forward) {
                            forward.pinned = !forward.pinned;
                        }
                    });
                },

                startForward: async (id, password) => {
                    const state = get();
                    const forward = state.forwards.find((f) => f.id === id);
                    if (!forward) return;

                    const host = state.hosts.find((h) => h.id === forward.hostId);
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
                                password: password || host.password,
                            },
                            'ssh',
                        );

                        set((state) => {
                            const f = state.forwards.find((f) => f.id === id);
                            if (f) f.status = 'running';
                        });
                    } catch (err) {
                        console.error('Failed to start tunnel', err);
                        set((state) => {
                            const f = state.forwards.find((f) => f.id === id);
                            if (f) f.status = 'error';
                        });
                    }
                },

                stopForward: async (id) => {
                    try {
                        // @ts-expect-error global scope window extensions
                        await window.electronAPI.ssh.stopTunnel(id);
                        set((state) => {
                            const f = state.forwards.find((f) => f.id === id);
                            if (f) f.status = 'stopped';
                        });
                    } catch (err) {
                        console.error('Failed to stop tunnel', err);
                    }
                },

                checkPortAvailability: async (port: number) => {
                    try {
                        // @ts-expect-error global scope window extensions
                        return await window.electronAPI.ssh.checkPort(port);
                    } catch (err) {
                        console.error('Failed to check port', err);
                        return { available: true };
                    }
                },

                updateSettings: (updates) => {
                    set((state) => {
                        Object.assign(state.settings, updates);
                    });
                },

                _setInitialData: (data) => {
                    set((state) => {
                        if (data.hosts) {
                            state.hosts = data.hosts;
                            state.forwards = data.hosts.flatMap((h: Host) => h.forwards || []);
                        }
                        if (data.settings) {
                            state.settings = data.settings;
                        }
                        state.isLoaded = true;
                    });
                },

                _setTunnelStatus: (forwardId, status, _error) => {
                    set((state) => {
                        const forward = state.forwards.find((f) => f.id === forwardId);
                        if (forward) {
                            forward.status = status as any;
                        }
                    });
                },

                _setIsLoaded: (isLoaded) => {
                    set((state) => {
                        state.isLoaded = isLoaded;
                    });
                },
            })),
        ),
        { name: 'AppStore' },
    ),
);

// Initialize store data and IPC listeners
export function initializeStore() {
    const store = useAppStore.getState();

    // 1. Load Initial Data
    const loadInitialData = async () => {
        try {
            let configPath = initialSettings.configStoragePath;
            if (!configPath.endsWith('.json')) {
                configPath = `${configPath}/config.json`;
            }
            // @ts-expect-error global scope window extensions
            const data = await window.electronAPI.ssh.loadConfig(configPath);
            if (data) {
                store._setInitialData(data);
            } else {
                store._setIsLoaded(true);
            }
        } catch (err) {
            console.error('Failed to load config', err);
            store._setIsLoaded(true);
        }
    };

    void loadInitialData();

    // 2. Setup IPC Listeners
    try {
        // @ts-expect-error global scope window extensions
        window.electronAPI.ssh.onTunnelStatusChange(
            (data: { forwardId: string; status: string; error?: string }) => {
                useAppStore.getState()._setTunnelStatus(data.forwardId, data.status, data.error);
            },
        );
    } catch {
        // Not in Electron environment
    }

    // 3. Setup Auto-save subscription
    // We subscribe to changes in hosts, forwards, and settings to trigger a save
    let saveTimeout: ReturnType<typeof setTimeout> | null = null;

    useAppStore.subscribe(
        (state) => ({
            hosts: state.hosts,
            forwards: state.forwards,
            settings: state.settings,
            isLoaded: state.isLoaded,
        }),
        (current, previous) => {
            if (!current.isLoaded) return;

            // Only trigger save if relevant state actually changed
            if (
                current.hosts === previous.hosts &&
                current.forwards === previous.forwards &&
                current.settings === previous.settings
            ) {
                return;
            }

            if (saveTimeout) clearTimeout(saveTimeout);

            saveTimeout = setTimeout(async () => {
                try {
                    const hostsWithForwards = current.hosts.map((h) => ({
                        ...h,
                        forwards: current.forwards.filter((f) => f.hostId === h.id),
                    }));

                    const configData = {
                        hosts: hostsWithForwards,
                        settings: current.settings,
                    };

                    let configPath = current.settings.configStoragePath;
                    if (!configPath.endsWith('.json')) {
                        configPath = `${configPath}/config.json`;
                    }

                    // @ts-expect-error global scope window extensions
                    await window.electronAPI.ssh.saveConfig(configPath, configData);
                } catch (err) {
                    console.error('Failed to save config', err);
                }
            }, 500);
        },
        {
            equalityFn: (a, b) =>
                a.hosts === b.hosts &&
                a.forwards === b.forwards &&
                a.settings === b.settings &&
                a.isLoaded === b.isLoaded,
        },
    );

    // Return cleanup function
    return () => {
        try {
            // @ts-expect-error global scope window extensions
            window.electronAPI.ssh.removeTunnelStatusListener();
        } catch {
            // Not in Electron environment
        }
    };
}

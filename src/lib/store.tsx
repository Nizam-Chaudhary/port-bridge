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
                    // Quick validation against AppConfigSchema or just use it (assuming valid for now)
                    if (data.hosts) setHosts(data.hosts);
                    if (data.settings) setSettings(data.settings);

                    // We need to flatten forwards for the global view if we still want that,
                    // or rely on host.forwards. For now, let's just populate the store's forwards.
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

    // Save on Change
    useEffect(() => {
        if (!isLoaded) return;

        const saveConfig = async () => {
            try {
                // To keep the single source of truth, map global forwards back to their hosts before saving
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

                // Optionally auto-generate SSH config if enabled
                // await window.electronAPI.ssh.generateSshConfig('~/.ssh/config.d/ssh-manager.conf', configData);
            } catch (err) {
                console.error('Failed to save config', err);
            }
        };

        const timer = setTimeout(saveConfig, 500); // debounce save
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

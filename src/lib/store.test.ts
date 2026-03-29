import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { Host, PortForward } from './types';

import { useAppStore } from './store';

// Mock test data generator
const createTestHost = (overrides?: Partial<Host>): Omit<Host, 'id' | 'status' | 'hidden'> =>
    ({
        name: 'Test Host',
        hostname: 'example.com',
        port: 22,
        username: 'testuser',
        authType: 'password',
        savePassword: true,
        connectTimeout: 10,
        keepAlive: true,
        serverAliveInterval: 60,
        serverAliveCountMax: 3,
        compression: false,
        strictHostKeyChecking: 'ask',
        forwardAgent: false,
        identitiesOnly: false,
        requestTTY: false,
        customOptions: [],
        forwards: [],
        ...overrides,
    }) as Omit<Host, 'id' | 'status'>;

const createTestForward = (
    hostId: string,
    overrides?: Partial<PortForward>,
): Omit<PortForward, 'id' | 'status'> => ({
    name: 'Test Forward',
    hostId,
    type: 'local',
    localPort: 8080,
    remoteHost: 'localhost',
    remotePort: 80,
    autoStart: false,
    restartOnDisconnect: false,
    gatewayPorts: false,
    pinned: false,
    ...overrides,
});

describe('useAppStore', () => {
    beforeEach(() => {
        // Reset state before each test
        const initialState = useAppStore.getState();
        useAppStore.setState({
            hosts: [],
            forwards: [],
            settings: initialState.settings,
            isLoaded: false,
        });

        // Mock window.electronAPI
        vi.stubGlobal('window', {
            electronAPI: {
                ssh: {
                    startTunnel: vi.fn(),
                    stopTunnel: vi.fn(),
                    checkPort: vi.fn().mockResolvedValue({ available: true }),
                    loadConfig: vi.fn().mockResolvedValue(null),
                    saveConfig: vi.fn().mockResolvedValue(undefined),
                    onTunnelStatusChange: vi.fn(),
                    removeTunnelStatusListener: vi.fn(),
                },
            },
        });
    });

    describe('Hosts Management', () => {
        it('should add a host', () => {
            const store = useAppStore.getState();
            store.addHost(createTestHost());

            const state = useAppStore.getState();
            expect(state.hosts).toHaveLength(1);
            expect(state.hosts[0].name).toBe('Test Host');
            expect(state.hosts[0].status).toBe('disconnected');
            expect(state.hosts[0].hidden).toBe(false);
            expect(state.hosts[0].id).toBeDefined();
        });

        it('should update a host', () => {
            const store = useAppStore.getState();
            store.addHost(createTestHost());

            const hostId = useAppStore.getState().hosts[0].id;
            useAppStore.getState().updateHost(hostId, { name: 'Updated Host Name' });

            const state = useAppStore.getState();
            expect(state.hosts[0].name).toBe('Updated Host Name');
        });

        it('should delete a host and its associated forwards', () => {
            const store = useAppStore.getState();
            store.addHost(createTestHost());

            const hostId = useAppStore.getState().hosts[0].id;
            store.addForward(createTestForward(hostId));

            expect(useAppStore.getState().hosts).toHaveLength(1);
            expect(useAppStore.getState().forwards).toHaveLength(1);

            useAppStore.getState().deleteHost(hostId);

            const state = useAppStore.getState();
            expect(state.hosts).toHaveLength(0);
            expect(state.forwards).toHaveLength(0); // Should cascade delete
        });

        it('should duplicate a host', () => {
            const store = useAppStore.getState();
            store.addHost(createTestHost({ name: 'Original Host' }));

            const hostId = useAppStore.getState().hosts[0].id;
            useAppStore.getState().toggleHostHidden(hostId);
            store.duplicateHost(hostId);

            const state = useAppStore.getState();
            expect(state.hosts).toHaveLength(2);
            expect(state.hosts[1].name).toBe('Original Host-copy');
            expect(state.hosts[1].id).not.toBe(hostId);
            expect(state.hosts[1].hidden).toBe(false);
        });

        it('should toggle host hidden state', () => {
            const store = useAppStore.getState();
            store.addHost(createTestHost());

            const hostId = useAppStore.getState().hosts[0].id;
            useAppStore.getState().toggleHostHidden(hostId);
            expect(useAppStore.getState().hosts[0].hidden).toBe(true);

            useAppStore.getState().toggleHostHidden(hostId);
            expect(useAppStore.getState().hosts[0].hidden).toBe(false);
        });

        it('should normalize legacy hosts without hidden state', () => {
            const legacyHost = {
                ...createTestHost(),
                id: 'legacy-host',
                status: 'disconnected' as const,
                forwards: [],
            };

            useAppStore.getState()._setInitialData({
                hosts: [legacyHost as unknown as Host],
            });

            expect(useAppStore.getState().hosts[0].hidden).toBe(false);
        });
    });

    describe('Port Forwarding Management', () => {
        let hostId: string;

        beforeEach(() => {
            const store = useAppStore.getState();
            store.addHost(createTestHost());
            hostId = useAppStore.getState().hosts[0].id;
        });

        it('should add a forward', () => {
            const store = useAppStore.getState();
            store.addForward(createTestForward(hostId));

            const state = useAppStore.getState();
            expect(state.forwards).toHaveLength(1);
            expect(state.forwards[0].name).toBe('Test Forward');
            expect(state.forwards[0].status).toBe('stopped');
            expect(state.forwards[0].id).toBeDefined();
        });

        it('should update a forward', () => {
            const store = useAppStore.getState();
            store.addForward(createTestForward(hostId));

            const forwardId = useAppStore.getState().forwards[0].id;
            useAppStore.getState().updateForward(forwardId, { localPort: 9090 });

            const state = useAppStore.getState();
            expect(state.forwards[0].localPort).toBe(9090);
        });

        it('should delete a forward', () => {
            const store = useAppStore.getState();
            store.addForward(createTestForward(hostId));

            const forwardId = useAppStore.getState().forwards[0].id;
            useAppStore.getState().deleteForward(forwardId);

            const state = useAppStore.getState();
            expect(state.forwards).toHaveLength(0);
        });

        it('should toggle forward status', () => {
            const store = useAppStore.getState();
            store.addForward(createTestForward(hostId));

            const forwardId = useAppStore.getState().forwards[0].id;

            useAppStore.getState().toggleForward(forwardId);
            expect(useAppStore.getState().forwards[0].status).toBe('running');

            useAppStore.getState().toggleForward(forwardId);
            expect(useAppStore.getState().forwards[0].status).toBe('stopped');
        });

        it('should start a forward using electronAPI', async () => {
            const store = useAppStore.getState();
            store.addForward(createTestForward(hostId));

            const forwardId = useAppStore.getState().forwards[0].id;

            await useAppStore.getState().startForward(forwardId);

            // @ts-expect-error test
            expect(window.electronAPI.ssh.startTunnel).toHaveBeenCalled();
            expect(useAppStore.getState().forwards[0].status).toBe('running');
        });

        it('should stop a forward using electronAPI', async () => {
            const store = useAppStore.getState();
            store.addForward(createTestForward(hostId, { status: 'running' }));

            const forwardId = useAppStore.getState().forwards[0].id;

            await useAppStore.getState().stopForward(forwardId);

            // @ts-expect-error test
            expect(window.electronAPI.ssh.stopTunnel).toHaveBeenCalledWith(forwardId);
            expect(useAppStore.getState().forwards[0].status).toBe('stopped');
        });
    });
});

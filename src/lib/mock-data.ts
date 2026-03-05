import type { AppSettings, ForwardPreset } from './types';

export const initialSettings: AppSettings = {
    sshBinaryPath: '/usr/bin/ssh',
    configStoragePath: '~/.config/port-bridge',
    autoStartTunnels: false,
    restartOnDisconnect: true,
};

export const forwardPresets: ForwardPreset[] = [
    { name: 'PostgreSQL', localPort: 5432, remoteHost: 'localhost', remotePort: 5432 },
    { name: 'Redis', localPort: 6379, remoteHost: 'localhost', remotePort: 6379 },
    { name: 'MySQL', localPort: 3306, remoteHost: 'localhost', remotePort: 3306 },
    { name: 'Kafka', localPort: 9092, remoteHost: 'localhost', remotePort: 9092 },
    { name: 'Vite', localPort: 5173, remoteHost: 'localhost', remotePort: 5173 },
    { name: 'Grafana', localPort: 3000, remoteHost: 'localhost', remotePort: 3000 },
];

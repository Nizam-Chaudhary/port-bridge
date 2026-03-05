import type { AppSettings, ForwardPreset } from './types';

export const initialSettings: AppSettings = {
    configStoragePath: '~/.config/ssh-manager',
    autoStartTunnels: false,
    restartOnDisconnect: true,
};

export const forwardPresets: ForwardPreset[] = [
    // Databases
    {
        name: 'PostgreSQL',
        description: 'PostgreSQL database (5432)',
        localPort: 5432,
        remoteHost: 'localhost',
        remotePort: 5432,
    },
    {
        name: 'MySQL',
        description: 'MySQL / MariaDB database (3306)',
        localPort: 3306,
        remoteHost: 'localhost',
        remotePort: 3306,
    },
    {
        name: 'MongoDB',
        description: 'MongoDB database (27017)',
        localPort: 27017,
        remoteHost: 'localhost',
        remotePort: 27017,
    },
    // Caching & Messaging
    {
        name: 'Redis',
        description: 'Redis in-memory store (6379)',
        localPort: 6379,
        remoteHost: 'localhost',
        remotePort: 6379,
    },
    {
        name: 'Memcached',
        description: 'Memcached cache (11211)',
        localPort: 11211,
        remoteHost: 'localhost',
        remotePort: 11211,
    },
    {
        name: 'Kafka',
        description: 'Apache Kafka broker (9092)',
        localPort: 9092,
        remoteHost: 'localhost',
        remotePort: 9092,
    },
    {
        name: 'RabbitMQ',
        description: 'RabbitMQ AMQP (5672)',
        localPort: 5672,
        remoteHost: 'localhost',
        remotePort: 5672,
    },
    {
        name: 'RabbitMQ UI',
        description: 'RabbitMQ Management UI (15672)',
        localPort: 15672,
        remoteHost: 'localhost',
        remotePort: 15672,
    },
    // Search
    {
        name: 'Elasticsearch',
        description: 'Elasticsearch HTTP API (9200)',
        localPort: 9200,
        remoteHost: 'localhost',
        remotePort: 9200,
    },
    // Dev Servers
    {
        name: 'Vite',
        description: 'Vite dev server (5173)',
        localPort: 5173,
        remoteHost: 'localhost',
        remotePort: 5173,
    },
    {
        name: 'Next.js',
        description: 'Next.js dev server (3000)',
        localPort: 3000,
        remoteHost: 'localhost',
        remotePort: 3000,
    },
    {
        name: 'Webpack',
        description: 'Webpack dev server (8080)',
        localPort: 8080,
        remoteHost: 'localhost',
        remotePort: 8080,
    },
    {
        name: 'Django',
        description: 'Django dev server (8000)',
        localPort: 8000,
        remoteHost: 'localhost',
        remotePort: 8000,
    },
    // Monitoring
    {
        name: 'Grafana',
        description: 'Grafana dashboard (3000)',
        localPort: 3000,
        remoteHost: 'localhost',
        remotePort: 3000,
    },
    // Storage
    {
        name: 'MinIO',
        description: 'MinIO S3-compatible storage (9000)',
        localPort: 9000,
        remoteHost: 'localhost',
        remotePort: 9000,
    },
    // SOCKS Proxy
    {
        name: 'SOCKS Proxy',
        description: 'Dynamic SOCKS5 proxy (1080)',
        localPort: 1080,
        remoteHost: '',
        remotePort: 0,
    },
];

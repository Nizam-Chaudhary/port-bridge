import { z } from 'zod';

// Enums
export const AuthTypeSchema = z.enum(['key', 'password']);
export const ForwardTypeSchema = z.enum(['local', 'remote', 'dynamic']);
export const ForwardStatusSchema = z.enum(['running', 'stopped', 'error']);

// Custom Option
export const CustomOptionSchema = z.object({
    key: z.string().min(1, 'Key is required'),
    value: z.string().min(1, 'Value is required'),
});

// Port Forward
export const PortForwardSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    hostId: z.string(),
    type: ForwardTypeSchema,
    localPort: z.number().int().positive(),
    remoteHost: z.string().optional(),
    remotePort: z.number().int().positive().optional(),
    localHost: z.string().optional(),
    status: ForwardStatusSchema.default('stopped'),
    // Advanced options
    bindAddress: z.string().optional(),
    autoStart: z.boolean().default(false),
    restartOnDisconnect: z.boolean().default(false),
    gatewayPorts: z.boolean().default(false),
    pinned: z.boolean().default(false),
});

// Host
export const HostSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'Alias is required'),
    hostname: z.string().min(1, 'Hostname or IP is required'),
    port: z.number().int().positive().default(22),
    username: z.string().min(1, 'Username is required'),
    authType: AuthTypeSchema,
    password: z.string().optional(),
    savePassword: z.boolean().default(false),
    identityFile: z.string().optional(),

    // Network (Common Advanced)
    connectTimeout: z.number().int().nonnegative().default(10),
    keepAlive: z.boolean().default(true), // UI toggle for serverAliveInterval/serverAliveCountMax
    serverAliveInterval: z.number().int().nonnegative().default(60),
    serverAliveCountMax: z.number().int().nonnegative().default(3),
    compression: z.boolean().default(false),
    proxyJump: z.string().optional(),

    // Security & Agent
    strictHostKeyChecking: z.enum(['yes', 'no', 'ask', 'accept-new']).default('ask'),
    forwardAgent: z.boolean().default(false),
    identitiesOnly: z.boolean().default(false),

    // Terminal Options
    requestTTY: z.boolean().default(false),
    terminalType: z.string().optional(),

    // Storage for custom options & host-specific forwards
    customOptions: z.array(CustomOptionSchema).default([]),
    forwards: z.array(PortForwardSchema).default([]),

    status: z.enum(['connected', 'disconnected', 'error']).default('disconnected'),
    pinned: z.boolean().default(false),
    hidden: z.boolean().default(false),
});

// Terminal Emulator
export const TerminalTypeSchema = z.enum(['kitty', 'alacritty', 'ghostty', 'custom']);

// Settings
export const AppSettingsSchema = z.object({
    configStoragePath: z.string().default('~/.config/ssh-manager/config.json'),
    autoStartTunnels: z.boolean().default(false),
    restartOnDisconnect: z.boolean().default(true),
    terminal: TerminalTypeSchema.default('kitty'),
    customTerminalPath: z.string().optional(),
});

// Main Config Structure for JSON
export const AppConfigSchema = z.object({
    hosts: z.array(HostSchema).default([]),
    settings: AppSettingsSchema.default({
        configStoragePath: '~/.config/ssh-manager/config.json',
        autoStartTunnels: false,
        restartOnDisconnect: true,
        terminal: 'kitty',
    }),
});

// Infer types from Zod schemas
export type CustomOption = z.infer<typeof CustomOptionSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;

import { z } from 'zod';

import {
    HostSchema,
    PortForwardSchema,
    AppSettingsSchema,
    AuthTypeSchema,
    ForwardTypeSchema,
    ForwardStatusSchema,
} from './schema';

export type AuthType = z.infer<typeof AuthTypeSchema>;
export type ForwardType = z.infer<typeof ForwardTypeSchema>;
export type ForwardStatus = z.infer<typeof ForwardStatusSchema>;

export type Host = z.infer<typeof HostSchema>;
export type PortForward = z.infer<typeof PortForwardSchema>;
export type AppSettings = z.infer<typeof AppSettingsSchema>;

export interface ForwardPreset {
    name: string;
    localPort: number;
    remoteHost: string;
    remotePort: number;
}

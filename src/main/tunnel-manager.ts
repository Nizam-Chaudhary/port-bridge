import { type ChildProcess, spawn } from 'node:child_process';
import net from 'node:net';

interface TunnelInfo {
    forwardId: string;
    process: ChildProcess;
    pid: number;
    startedAt: number;
    restartOnDisconnect: boolean;
    sshArgs: string[];
    sshBinary: string;
}

interface ForwardConfig {
    id: string;
    type: 'local' | 'remote' | 'dynamic';
    localPort: number;
    remoteHost?: string;
    remotePort?: number;
    localHost?: string;
    bindAddress?: string;
    gatewayPorts?: boolean;
    restartOnDisconnect?: boolean;
}

interface HostConfig {
    name: string;
    hostname: string;
    port?: number;
    username?: string;
    identityFile?: string;
    password?: string;
}

export class TunnelManager {
    private tunnels = new Map<string, TunnelInfo>();
    private statusCallback: ((forwardId: string, status: string, error?: string) => void) | null =
        null;

    onStatusChange(cb: (forwardId: string, status: string, error?: string) => void) {
        this.statusCallback = cb;
    }

    buildSshArgs(forward: ForwardConfig, host: HostConfig): string[] {
        const args: string[] = ['-N']; // No remote command, tunnel only

        // Host connection
        if (host.identityFile) {
            args.push('-i', host.identityFile);
        }
        if (host.port && host.port !== 22) {
            args.push('-p', host.port.toString());
        }

        // Forward-specific flags
        const bindAddr = forward.bindAddress || '';

        if (forward.type === 'local') {
            const localBind = bindAddr
                ? `${bindAddr}:${forward.localPort}`
                : `${forward.localPort}`;
            const remoteDest = `${forward.remoteHost || 'localhost'}:${forward.remotePort}`;
            args.push('-L', `${localBind}:${remoteDest}`);
        } else if (forward.type === 'remote') {
            const remoteBind = `${forward.remotePort}`;
            const localDest = `${forward.localHost || 'localhost'}:${forward.localPort}`;
            args.push('-R', `${remoteBind}:${localDest}`);
        } else if (forward.type === 'dynamic') {
            const dynamicBind = bindAddr
                ? `${bindAddr}:${forward.localPort}`
                : `${forward.localPort}`;
            args.push('-D', `${dynamicBind}`);
        }

        // Gateway ports
        if (forward.gatewayPorts) {
            args.push('-o', 'GatewayPorts=yes');
        }

        // Keepalive to detect disconnections
        args.push('-o', 'ServerAliveInterval=30');
        args.push('-o', 'ServerAliveCountMax=3');
        args.push('-o', 'ExitOnForwardFailure=yes');

        // User@Host
        const userHost = host.username ? `${host.username}@${host.hostname}` : host.hostname;
        args.push(userHost);

        return args;
    }

    generateSshCommand(forward: ForwardConfig, host: HostConfig, sshBinary: string): string {
        const args = this.buildSshArgs(forward, host);
        const baseCmd = `${sshBinary} ${args.join(' ')}`;
        return host.password ? `SSHPASS=*** sshpass -e ${baseCmd}` : baseCmd;
    }

    start(forward: ForwardConfig, host: HostConfig, sshBinary: string): { pid: number } {
        // Stop existing tunnel if running
        if (this.tunnels.has(forward.id)) {
            this.stop(forward.id);
        }

        const args = this.buildSshArgs(forward, host);

        let command = sshBinary;
        let finalArgs = args;
        const env: NodeJS.ProcessEnv = { ...process.env };

        if (host.password) {
            command = 'sshpass';
            finalArgs = ['-e', sshBinary, ...args];
            env.SSHPASS = host.password;
        }

        const proc = spawn(command, finalArgs, {
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false,
            env,
        });

        const tunnelInfo: TunnelInfo = {
            forwardId: forward.id,
            process: proc,
            pid: proc.pid!,
            startedAt: Date.now(),
            restartOnDisconnect: forward.restartOnDisconnect ?? false,
            sshArgs: args,
            sshBinary,
        };

        this.tunnels.set(forward.id, tunnelInfo);
        this.statusCallback?.(forward.id, 'running');

        proc.on('error', (err) => {
            console.error(`Tunnel ${forward.id} error:`, err.message);
            this.tunnels.delete(forward.id);
            this.statusCallback?.(forward.id, 'error', err.message);
        });

        proc.on('exit', (code, signal) => {
            const info = this.tunnels.get(forward.id);
            this.tunnels.delete(forward.id);

            if (info?.restartOnDisconnect && code !== 0 && signal !== 'SIGTERM') {
                console.log(`Tunnel ${forward.id} exited (code=${code}), restarting...`);
                setTimeout(() => {
                    try {
                        this.start(forward, host, sshBinary);
                    } catch (err) {
                        console.error(`Tunnel ${forward.id} restart failed:`, err);
                        this.statusCallback?.(forward.id, 'error', 'Restart failed');
                    }
                }, 2000);
            } else {
                this.statusCallback?.(forward.id, 'stopped');
            }
        });

        // Capture stderr for diagnostics
        proc.stderr?.on('data', (data: Buffer) => {
            const msg = data.toString().trim();
            if (msg) {
                console.error(`Tunnel ${forward.id} stderr:`, msg);
            }
        });

        return { pid: proc.pid! };
    }

    stop(forwardId: string): boolean {
        const info = this.tunnels.get(forwardId);
        if (!info) return false;

        // Prevent auto-restart
        info.restartOnDisconnect = false;
        info.process.kill('SIGTERM');
        this.tunnels.delete(forwardId);
        this.statusCallback?.(forwardId, 'stopped');
        return true;
    }

    status(forwardId: string): { running: boolean; pid?: number; startedAt?: number } {
        const info = this.tunnels.get(forwardId);
        if (!info) return { running: false };
        return { running: true, pid: info.pid, startedAt: info.startedAt };
    }

    stopAll(): void {
        for (const [id] of this.tunnels) {
            this.stop(id);
        }
    }

    getRunningIds(): string[] {
        return [...this.tunnels.keys()];
    }
}

// Port availability check utility
export function checkPortAvailability(
    port: number,
): Promise<{ available: boolean; suggestedPort?: number }> {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', () => {
            // Port is in use, find a free one
            void findFreePort(port + 10000).then((suggestedPort) => {
                resolve({ available: false, suggestedPort });
            });
        });

        server.once('listening', () => {
            server.close(() => {
                resolve({ available: true });
            });
        });

        server.listen(port, '127.0.0.1');
    });
}

function findFreePort(startPort: number): Promise<number> {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', () => {
            // Try next port
            resolve(findFreePort(startPort + 1));
        });

        server.once('listening', () => {
            server.close(() => {
                resolve(startPort);
            });
        });

        server.listen(startPort, '127.0.0.1');
    });
}

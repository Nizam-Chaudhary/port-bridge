import { describe, expect, it } from 'vitest';

import { TunnelManager } from './tunnel-manager';

describe('TunnelManager proxy auth handling', () => {
    const manager = new TunnelManager();

    it('builds proxy command with sshpass when proxy has password', () => {
        const args = manager.buildHostSshArgs({
            name: 'target',
            hostname: 'app.internal',
            username: 'app',
            password: 'target-secret',
            proxy: {
                hostname: 'bastion.internal',
                username: 'jump',
                password: 'proxy-secret',
            },
        });

        expect(args).toContain('-o');
        expect(args.join(' ')).toContain(
            'ProxyCommand=env SSHPASS="$SSHPASS_PROXY" sshpass -e ssh',
        );
        expect(args.join(' ')).toContain("'jump@bastion.internal'");
        expect(args.join(' ')).toContain("'-W' %h:%p");
    });

    it('falls back to -J for non-managed proxy jump alias', () => {
        const args = manager.buildHostSshArgs({
            name: 'target',
            hostname: 'app.internal',
            username: 'app',
            proxyJump: 'corp-bastion',
        });

        expect(args).toContain('-J');
        expect(args).toContain('corp-bastion');
    });

    it('keeps outer sshpass when target has password', () => {
        const cmd = manager.generateSshCommand(
            {
                id: 'fwd-1',
                type: 'local',
                localPort: 15432,
                remoteHost: 'localhost',
                remotePort: 5432,
            },
            {
                name: 'target',
                hostname: 'app.internal',
                username: 'app',
                password: 'target-secret',
                proxy: {
                    hostname: 'bastion.internal',
                    username: 'jump',
                    password: 'proxy-secret',
                },
            },
            'ssh',
        );

        expect(cmd).toContain('SSHPASS=*** sshpass -e ssh');
        expect(cmd).toContain('ProxyCommand=env SSHPASS="$SSHPASS_PROXY" sshpass -e ssh');
    });
});

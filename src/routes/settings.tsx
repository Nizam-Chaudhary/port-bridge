import { useForm } from '@tanstack/react-form';
import { createFileRoute } from '@tanstack/react-router';
import { DownloadIcon } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/lib/store';

export const Route = createFileRoute('/settings')({
    component: SettingsPage,
});

function SettingsPage() {
    const { settings, updateSettings, hosts, addHost } = useAppStore();

    const form = useForm({
        defaultValues: {
            sshBinaryPath: settings.sshBinaryPath,
            configStoragePath: settings.configStoragePath,
            autoStartTunnels: settings.autoStartTunnels,
            restartOnDisconnect: settings.restartOnDisconnect,
        },
        onSubmit: async ({ value }) => {
            updateSettings(value);
            toast.success('Settings saved');
        },
    });

    return (
        <>
            <PageHeader title='Settings' />

            <div className='flex max-w-2xl flex-1 flex-col gap-6 p-4'>
                <form
                    id='settings-form'
                    onSubmit={(e) => {
                        e.preventDefault();
                        void form.handleSubmit();
                    }}
                    className='space-y-6'>
                    {/* General */}
                    <Card>
                        <CardHeader>
                            <CardTitle>General</CardTitle>
                            <CardDescription>SSH client and storage configuration.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FieldGroup>
                                <form.Field
                                    name='sshBinaryPath'
                                    children={(field) => (
                                        <Field>
                                            <FieldLabel htmlFor={field.name}>
                                                SSH Binary Path
                                            </FieldLabel>
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                placeholder='/usr/bin/ssh'
                                            />
                                            <FieldDescription>
                                                Path to the SSH binary on your system.
                                            </FieldDescription>
                                        </Field>
                                    )}
                                />
                                <form.Field
                                    name='configStoragePath'
                                    children={(field) => (
                                        <Field>
                                            <FieldLabel htmlFor={field.name}>
                                                Config Storage Path
                                            </FieldLabel>
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                placeholder='~/.config/port-bridge'
                                            />
                                            <FieldDescription>
                                                Where Port Bridge stores its configuration files.
                                            </FieldDescription>
                                        </Field>
                                    )}
                                />
                            </FieldGroup>
                        </CardContent>
                    </Card>

                    {/* Import / Export */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Import & Export SSH Config</CardTitle>
                            <CardDescription>
                                Import from your existing config or export back to the system.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className='flex flex-wrap gap-2'>
                                <Button
                                    type='button'
                                    variant='outline'
                                    onClick={async () => {
                                        try {
                                            const api = (window as any).electronAPI;
                                            const imported =
                                                await api.ssh.importSshConfig('~/.ssh/config');
                                            if (imported && imported.length > 0) {
                                                imported.forEach((h: any) => {
                                                    // Ensure it lacks an ID, so the store assigns one, or leave it if store handles it
                                                    const { id: _id, status: _status, ...rest } = h;
                                                    addHost(rest as any);
                                                });
                                                toast.success(
                                                    `Imported ${imported.length} hosts from ~/.ssh/config`,
                                                );
                                            } else {
                                                toast.info('No new hosts found to import.');
                                            }
                                        } catch (err) {
                                            toast.error('Failed to import config');
                                            console.error(err);
                                        }
                                    }}>
                                    <DownloadIcon className='mr-2 h-4 w-4' />
                                    Import from ~/.ssh/config
                                </Button>
                                <Button
                                    type='button'
                                    variant='outline'
                                    onClick={async () => {
                                        try {
                                            const api = (window as any).electronAPI;
                                            await api.ssh.generateSshConfig('~/.ssh/config', {
                                                hosts,
                                                settings,
                                            });
                                            toast.success('Exported to ~/.ssh/config');
                                        } catch (err) {
                                            console.error(err);
                                            toast.error('Failed to export to ~/.ssh/config');
                                        }
                                    }}>
                                    <DownloadIcon className='mr-2 h-4 w-4' />
                                    Export to ~/.ssh/config
                                </Button>
                                <Button
                                    type='button'
                                    variant='outline'
                                    onClick={async () => {
                                        try {
                                            const api = (window as any).electronAPI;
                                            await api.ssh.generateSshConfig(
                                                '~/.ssh/config.d/ssh-manager.conf',
                                                { hosts, settings },
                                            );
                                            toast.success(
                                                'Exported to ~/.ssh/config.d/ssh-manager.conf',
                                            );
                                        } catch (err) {
                                            console.error(err);
                                            toast.error('Failed to export to config.d');
                                        }
                                    }}>
                                    <DownloadIcon className='mr-2 h-4 w-4' />
                                    Export to ~/.ssh/config.d
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Behavior */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Behavior</CardTitle>
                            <CardDescription>Automatic tunnel management settings.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FieldGroup>
                                <form.Field
                                    name='autoStartTunnels'
                                    children={(field) => (
                                        <Field orientation='horizontal'>
                                            <FieldContent>
                                                <FieldLabel htmlFor='settings-autostart'>
                                                    Start tunnels automatically
                                                </FieldLabel>
                                                <FieldDescription>
                                                    Automatically start saved tunnels when the app
                                                    launches.
                                                </FieldDescription>
                                            </FieldContent>
                                            <Switch
                                                id='settings-autostart'
                                                name={field.name}
                                                checked={field.state.value}
                                                onCheckedChange={field.handleChange}
                                            />
                                        </Field>
                                    )}
                                />
                                <form.Field
                                    name='restartOnDisconnect'
                                    children={(field) => (
                                        <Field orientation='horizontal'>
                                            <FieldContent>
                                                <FieldLabel htmlFor='settings-restart'>
                                                    Restart tunnels on disconnect
                                                </FieldLabel>
                                                <FieldDescription>
                                                    Automatically reconnect tunnels if the SSH
                                                    connection drops.
                                                </FieldDescription>
                                            </FieldContent>
                                            <Switch
                                                id='settings-restart'
                                                name={field.name}
                                                checked={field.state.value}
                                                onCheckedChange={field.handleChange}
                                            />
                                        </Field>
                                    )}
                                />
                            </FieldGroup>
                        </CardContent>
                    </Card>

                    <div className='flex justify-end'>
                        <Button type='submit' form='settings-form'>
                            Save Settings
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

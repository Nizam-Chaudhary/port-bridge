import type { FormEvent } from 'react';

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
    CopyIcon,
    MoreHorizontalIcon,
    PencilIcon,
    PinIcon,
    PinOffIcon,
    PlusIcon,
    SearchIcon,
    TerminalIcon,
    TrashIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { Host } from '@/lib/types';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';

export const Route = createFileRoute('/')({
    component: HostsPage,
});

function HostsPage() {
    const { hosts, deleteHost, duplicateHost, connectHost, toggleHostPin, updateHost } =
        useAppStore();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<Host | null>(null);
    const [promptTarget, setPromptTarget] = useState<Host | null>(null);
    const [promptProxyHost, setPromptProxyHost] = useState<Host | null>(null);
    const [promptTargetPassword, setPromptTargetPassword] = useState('');
    const [promptProxyPassword, setPromptProxyPassword] = useState('');
    const [promptSaveTargetPassword, setPromptSaveTargetPassword] = useState(false);
    const [promptSaveProxyPassword, setPromptSaveProxyPassword] = useState(false);

    const filteredHosts = useMemo(() => {
        if (!search) return hosts;
        const q = search.toLowerCase();
        return hosts.filter(
            (h) =>
                h.name.toLowerCase().includes(q) ||
                h.hostname.toLowerCase().includes(q) ||
                h.username.toLowerCase().includes(q),
        );
    }, [hosts, search]);

    const pinnedHosts = useMemo(() => filteredHosts.filter((h) => h.pinned), [filteredHosts]);
    const unpinnedHosts = useMemo(() => filteredHosts.filter((h) => !h.pinned), [filteredHosts]);

    const handleEdit = (host: Host) => {
        void navigate({ to: '/hosts/edit/$hostId', params: { hostId: host.id } });
    };

    const getProxyHost = (host: Host) =>
        host.proxyJump ? hosts.find((candidate) => candidate.name === host.proxyJump) : undefined;

    const openPasswordPrompt = (host: Host) => {
        const proxyHost = getProxyHost(host);
        const needsTargetPassword = host.authType === 'password' && !host.password;
        const needsProxyPassword = proxyHost?.authType === 'password' && !proxyHost.password;

        if (!needsTargetPassword && !needsProxyPassword) {
            void connectHost(host.id);
            toast.success(`Connecting to ${host.name}...`);
            return;
        }

        setPromptTarget(host);
        setPromptProxyHost(needsProxyPassword ? proxyHost : null);
        setPromptTargetPassword('');
        setPromptProxyPassword('');
        setPromptSaveTargetPassword(false);
        setPromptSaveProxyPassword(false);
    };

    const handleAdd = () => {
        void navigate({ to: '/hosts/new', search: { redirectTo: undefined } });
    };

    const handleCopySshCommand = (host: Host) => {
        let cmd = 'ssh';
        if (host.identityFile) {
            cmd += ` -i "${host.identityFile}"`;
        }
        if (host.identitiesOnly) {
            cmd += ' -o IdentitiesOnly=yes';
        }
        if (host.port !== 22) {
            cmd += ` -p ${host.port}`;
        }
        cmd += ` ${host.username}@${host.hostname}`;

        void navigator.clipboard.writeText(cmd);
        toast.success('SSH command copied', {
            description: 'Command copied to clipboard.',
        });
    };

    const handlePasswordPromptSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!promptTarget) return;

        const needsTargetPassword = promptTarget.authType === 'password' && !promptTarget.password;
        const needsProxyPassword =
            promptProxyHost?.authType === 'password' && !promptProxyHost.password;

        if (needsTargetPassword && !promptTargetPassword) return;
        if (needsProxyPassword && !promptProxyPassword) return;

        const target = promptTarget;
        setPromptTarget(null);
        setPromptProxyHost(null);

        if (needsTargetPassword && promptSaveTargetPassword) {
            updateHost(target.id, { password: promptTargetPassword });
        }
        if (promptProxyHost && needsProxyPassword && promptSaveProxyPassword) {
            updateHost(promptProxyHost.id, { password: promptProxyPassword });
        }

        void connectHost(target.id, {
            target: needsTargetPassword ? promptTargetPassword : undefined,
            proxy: needsProxyPassword ? promptProxyPassword : undefined,
        });
        toast.success(`Connecting to ${target.name}...`);
    };

    return (
        <>
            <PageHeader title='Hosts'>
                <Button size='sm' onClick={handleAdd}>
                    <PlusIcon />
                    Add Host
                </Button>
            </PageHeader>

            <div className='flex flex-1 flex-col gap-4 p-4'>
                {/* Toolbar */}
                <div className='flex items-center gap-2'>
                    <div className='relative max-w-sm flex-1'>
                        <SearchIcon className='absolute top-2.5 left-2.5 size-4 text-muted-foreground' />
                        <Input
                            placeholder='Search hosts...'
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className='pl-9'
                        />
                    </div>
                </div>

                {/* Cards */}
                {filteredHosts.length > 0 ? (
                    <div className='flex flex-col gap-6'>
                        {/* Pinned Hosts */}
                        {pinnedHosts.length > 0 && (
                            <div className='space-y-3'>
                                <h3 className='flex items-center gap-2 text-sm font-semibold'>
                                    <PinIcon className='size-4' />
                                    Pinned Hosts
                                </h3>
                                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                                    {pinnedHosts.map((host) => (
                                        <HostCard
                                            key={host.id}
                                            host={host}
                                            onConnect={() => openPasswordPrompt(host)}
                                            onTogglePin={() => toggleHostPin(host.id)}
                                            onEdit={() => handleEdit(host)}
                                            onDuplicate={() => duplicateHost(host.id)}
                                            onCopySshCommand={() => handleCopySshCommand(host)}
                                            onDelete={() => setDeleteTarget(host)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Unpinned Hosts */}
                        {unpinnedHosts.length > 0 && (
                            <div className='space-y-3'>
                                {pinnedHosts.length > 0 && (
                                    <h3 className='text-sm font-semibold text-muted-foreground'>
                                        Other Hosts
                                    </h3>
                                )}
                                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                                    {unpinnedHosts.map((host) => (
                                        <HostCard
                                            key={host.id}
                                            host={host}
                                            onConnect={() => openPasswordPrompt(host)}
                                            onTogglePin={() => toggleHostPin(host.id)}
                                            onEdit={() => handleEdit(host)}
                                            onDuplicate={() => duplicateHost(host.id)}
                                            onCopySshCommand={() => handleCopySshCommand(host)}
                                            onDelete={() => setDeleteTarget(host)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className='flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12'>
                        <TerminalIcon className='size-8 text-muted-foreground' />
                        <div className='text-center'>
                            <p className='font-medium'>
                                {search ? 'No hosts found' : 'No hosts configured'}
                            </p>
                            <p className='text-sm text-muted-foreground'>
                                {search
                                    ? 'Try adjusting your search query.'
                                    : 'Add a new host to get started.'}
                            </p>
                        </div>
                        {!search && (
                            <Button size='sm' onClick={handleAdd}>
                                <PlusIcon />
                                Add Host
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
                title='Delete Host?'
                description='This action cannot be undone. This will permanently delete the host and all associated port forwards.'
                onConfirm={() => {
                    if (deleteTarget) {
                        deleteHost(deleteTarget.id);
                        toast.success(`Host "${deleteTarget.name}" deleted`);
                        setDeleteTarget(null);
                    }
                }}
            />

            <Dialog
                open={!!promptTarget}
                onOpenChange={(open) => {
                    if (!open) {
                        setPromptTarget(null);
                        setPromptProxyHost(null);
                    }
                }}>
                <DialogContent>
                    <form onSubmit={handlePasswordPromptSubmit}>
                        <DialogHeader>
                            <DialogTitle>Authentication Required</DialogTitle>
                            <DialogDescription>
                                Please enter the password for {promptTarget?.name}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className='py-4'>
                            <div className='space-y-4'>
                                {promptTarget?.authType === 'password' &&
                                    !promptTarget.password && (
                                        <>
                                            <div className='space-y-2'>
                                                <Label htmlFor='targetPassword'>
                                                    Host Password ({promptTarget.name})
                                                </Label>
                                                <Input
                                                    id='targetPassword'
                                                    type='password'
                                                    value={promptTargetPassword}
                                                    onChange={(e) =>
                                                        setPromptTargetPassword(e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div className='flex items-center space-x-2'>
                                                <Checkbox
                                                    id='saveTargetPassword'
                                                    checked={promptSaveTargetPassword}
                                                    onCheckedChange={(checked) =>
                                                        setPromptSaveTargetPassword(!!checked)
                                                    }
                                                />
                                                <Label
                                                    htmlFor='saveTargetPassword'
                                                    className='text-sm font-normal'>
                                                    Save host password
                                                </Label>
                                            </div>
                                        </>
                                    )}

                                {promptProxyHost && (
                                    <>
                                        <div className='space-y-2'>
                                            <Label htmlFor='proxyPassword'>
                                                Proxy Password ({promptProxyHost.name})
                                            </Label>
                                            <Input
                                                id='proxyPassword'
                                                type='password'
                                                value={promptProxyPassword}
                                                onChange={(e) =>
                                                    setPromptProxyPassword(e.target.value)
                                                }
                                            />
                                        </div>
                                        <div className='flex items-center space-x-2'>
                                            <Checkbox
                                                id='saveProxyPassword'
                                                checked={promptSaveProxyPassword}
                                                onCheckedChange={(checked) =>
                                                    setPromptSaveProxyPassword(!!checked)
                                                }
                                            />
                                            <Label
                                                htmlFor='saveProxyPassword'
                                                className='text-sm font-normal'>
                                                Save proxy password
                                            </Label>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type='button'
                                variant='outline'
                                onClick={() => setPromptTarget(null)}>
                                Cancel
                            </Button>
                            <Button
                                type='submit'
                                disabled={
                                    (promptTarget?.authType === 'password' &&
                                        !promptTarget.password &&
                                        !promptTargetPassword) ||
                                    (!!promptProxyHost && !promptProxyPassword)
                                }>
                                Connect
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function HostCard({
    host,
    onConnect,
    onTogglePin,
    onEdit,
    onDuplicate,
    onCopySshCommand,
    onDelete,
}: {
    host: Host;
    onConnect: () => void;
    onTogglePin: () => void;
    onEdit: () => void;
    onDuplicate: () => void;
    onCopySshCommand: () => void;
    onDelete: () => void;
}) {
    return (
        <Card className='py-3'>
            <CardContent className='flex items-center justify-between gap-4'>
                <div className='min-w-0 flex-1 space-y-0.5'>
                    <div className='flex min-w-0 items-center gap-2'>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger
                                    render={
                                        <span className='block min-w-0 cursor-default truncate text-left text-sm font-medium'>
                                            {host.name}
                                        </span>
                                    }
                                />
                                <TooltipContent>{host.name}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <Badge
                            variant='secondary'
                            className='h-4 shrink-0 px-1 py-0 text-[10px] uppercase'>
                            {host.authType}
                        </Badge>
                    </div>
                    <TooltipProvider delay={300}>
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <span className='block min-w-0 cursor-default truncate text-left font-mono text-xs text-muted-foreground'>
                                        {host.username}@{host.hostname}:{host.port}
                                    </span>
                                }
                            />
                            <TooltipContent>
                                {host.username}@{host.hostname}:{host.port}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className='flex shrink-0 items-center gap-1'>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <Button variant='outline' size='icon-sm' onClick={onConnect} />
                                }>
                                <TerminalIcon />
                                <span className='sr-only'>Connect</span>
                            </TooltipTrigger>
                            <TooltipContent>Connect</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant='ghost' size='icon-sm' />}>
                            <MoreHorizontalIcon />
                            <span className='sr-only'>Actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                            <DropdownMenuItem onClick={onTogglePin}>
                                {host.pinned ? <PinOffIcon /> : <PinIcon />}
                                {host.pinned ? 'Unpin' : 'Pin'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onEdit}>
                                <PencilIcon />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onDuplicate}>
                                <CopyIcon />
                                Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onCopySshCommand}>
                                <TerminalIcon />
                                Copy SSH Command
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant='destructive' onClick={onDelete}>
                                <TrashIcon />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardContent>
        </Card>
    );
}

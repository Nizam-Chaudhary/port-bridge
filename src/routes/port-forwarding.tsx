import type { FormEvent } from 'react';

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
    CopyIcon,
    Loader2Icon,
    MoreHorizontalIcon,
    PencilIcon,
    PinIcon,
    PinOffIcon,
    PlayIcon,
    PlusIcon,
    SquareIcon,
    TerminalIcon,
    TrashIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { PortForward } from '@/lib/types';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';

export const Route = createFileRoute('/port-forwarding')({
    component: PortForwardingPage,
});

function PortForwardingPage() {
    const {
        hosts,
        forwards,
        deleteForward,
        startForward,
        stopForward,
        toggleForwardPin,
        updateHost,
    } = useAppStore();
    const navigate = useNavigate();
    const [hostFilter, setHostFilter] = useState('all');
    const [deleteTarget, setDeleteTarget] = useState<PortForward | null>(null);
    const [loadingForwards, setLoadingForwards] = useState<Set<string>>(new Set());
    const [promptTarget, setPromptTarget] = useState<PortForward | string | null>(null);
    const [promptHost, setPromptHost] = useState<Host | null>(null);
    const [promptProxyHost, setPromptProxyHost] = useState<Host | null>(null);
    const [promptTargetPassword, setPromptTargetPassword] = useState('');
    const [promptProxyPassword, setPromptProxyPassword] = useState('');
    const [promptSaveTargetPassword, setPromptSaveTargetPassword] = useState(false);
    const [promptSaveProxyPassword, setPromptSaveProxyPassword] = useState(false);

    const filteredForwards = useMemo(() => {
        if (hostFilter === 'all') return forwards;
        return forwards.filter((f) => f.hostId === hostFilter);
    }, [forwards, hostFilter]);

    const pinnedForwards = useMemo(
        () => filteredForwards.filter((f) => f.pinned),
        [filteredForwards],
    );

    const unpinnedForwards = useMemo(
        () => filteredForwards.filter((f) => !f.pinned),
        [filteredForwards],
    );

    // Group forwards by host (only for unpinned)
    const groupedForwards = useMemo(() => {
        const groups = new Map<string, PortForward[]>();
        for (const f of unpinnedForwards) {
            const existing = groups.get(f.hostId) || [];
            existing.push(f);
            groups.set(f.hostId, existing);
        }
        return groups;
    }, [unpinnedForwards]);

    const getHostName = (hostId: string) => hosts.find((h) => h.id === hostId)?.name ?? 'Unknown';

    const getProxyHost = (host: Host) =>
        host.proxyJump ? hosts.find((candidate) => candidate.name === host.proxyJump) : undefined;

    const openPasswordPrompt = (target: PortForward | string, host: Host) => {
        const proxyHost = getProxyHost(host);
        const needsTargetPassword = host.authType === 'password' && !host.password;
        const needsProxyPassword = proxyHost?.authType === 'password' && !proxyHost.password;

        if (!needsTargetPassword && !needsProxyPassword) {
            return false;
        }

        setPromptTarget(target);
        setPromptHost(host);
        setPromptProxyHost(needsProxyPassword ? proxyHost : null);
        setPromptTargetPassword('');
        setPromptProxyPassword('');
        setPromptSaveTargetPassword(false);
        setPromptSaveProxyPassword(false);
        return true;
    };

    const formatPorts = (forward: PortForward) => {
        if (forward.type === 'dynamic') return `*:${forward.localPort}`;
        if (forward.type === 'local')
            return `${forward.localPort} → ${forward.remoteHost || 'localhost'}:${forward.remotePort}`;
        return `${forward.remotePort} → ${forward.localHost || 'localhost'}:${forward.localPort}`;
    };

    const generateSshCommand = (forward: PortForward) => {
        const host = hosts.find((h) => h.id === forward.hostId);
        const hostName = host?.name ?? '<host>';
        const sshBin = 'ssh';
        const bindAddr = forward.bindAddress || '';

        if (forward.type === 'local') {
            const localBind = bindAddr
                ? `${bindAddr}:${forward.localPort}`
                : `${forward.localPort}`;
            return `${sshBin} -L ${localBind}:${forward.remoteHost || 'localhost'}:${forward.remotePort} ${hostName}`;
        }
        if (forward.type === 'remote') {
            return `${sshBin} -R ${forward.remotePort}:${forward.localHost || 'localhost'}:${forward.localPort} ${hostName}`;
        }
        if (forward.type === 'dynamic') {
            const dynamicBind = bindAddr
                ? `${bindAddr}:${forward.localPort}`
                : `${forward.localPort}`;
            return `${sshBin} -D ${dynamicBind} ${hostName}`;
        }
        return '';
    };

    const handleEdit = (forward: PortForward) => {
        void navigate({ to: '/forwards/edit/$forwardId', params: { forwardId: forward.id } });
    };

    const handleAdd = () => {
        void navigate({ to: '/forwards/new' });
    };

    const _performStart = async (
        forward: PortForward,
        passwords?: string | { target?: string; proxy?: string },
    ) => {
        setLoadingForwards((prev) => new Set(prev).add(forward.id));
        try {
            await startForward(forward.id, passwords);
            toast.success(`Started ${forward.name}`);
        } catch {
            toast.error(`Failed to start ${forward.name}`);
        } finally {
            setLoadingForwards((prev) => {
                const next = new Set(prev);
                next.delete(forward.id);
                return next;
            });
        }
    };

    const handleToggle = async (forward: PortForward) => {
        if (forward.status === 'running') {
            setLoadingForwards((prev) => new Set(prev).add(forward.id));
            try {
                await stopForward(forward.id);
                toast.info(`Stopped ${forward.name}`);
            } catch {
                toast.error(`Failed to stop ${forward.name}`);
            } finally {
                setLoadingForwards((prev) => {
                    const next = new Set(prev);
                    next.delete(forward.id);
                    return next;
                });
            }
        } else {
            const host = hosts.find((h) => h.id === forward.hostId);
            if (host && openPasswordPrompt(forward, host)) {
                return;
            }
            await _performStart(forward);
        }
    };

    const _performStartAll = async (
        hostId: string,
        passwords?: string | { target?: string; proxy?: string },
    ) => {
        const hostForwards = forwards.filter((f) => f.hostId === hostId && f.status !== 'running');
        for (const f of hostForwards) {
            try {
                setLoadingForwards((prev) => new Set(prev).add(f.id));
                await startForward(f.id, passwords);
            } catch {
                toast.error(`Failed to start ${f.name}`);
            } finally {
                setLoadingForwards((prev) => {
                    const next = new Set(prev);
                    next.delete(f.id);
                    return next;
                });
            }
        }
        if (hostForwards.length > 0) {
            toast.success(`Started ${hostForwards.length} forward(s) for ${getHostName(hostId)}`);
        }
    };

    const handleStartAll = async (hostId: string) => {
        const host = hosts.find((h) => h.id === hostId);
        if (!host) return;

        const hostForwards = forwards.filter((f) => f.hostId === hostId && f.status !== 'running');
        if (hostForwards.length === 0) {
            return;
        }

        if (openPasswordPrompt(hostId, host)) {
            return;
        }

        await _performStartAll(hostId);
    };

    const handlePasswordPromptSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!promptHost) return;

        const needsTargetPassword = promptHost.authType === 'password' && !promptHost.password;
        const needsProxyPassword =
            promptProxyHost?.authType === 'password' && !promptProxyHost.password;

        if (needsTargetPassword && !promptTargetPassword) return;
        if (needsProxyPassword && !promptProxyPassword) return;

        const target = promptTarget;
        setPromptTarget(null);
        setPromptHost(null);
        setPromptProxyHost(null);

        const hostId = typeof target === 'string' ? target : target?.hostId;
        if (needsTargetPassword && promptSaveTargetPassword && hostId) {
            updateHost(hostId, { password: promptTargetPassword });
        }
        if (promptProxyHost && needsProxyPassword && promptSaveProxyPassword) {
            updateHost(promptProxyHost.id, { password: promptProxyPassword });
        }

        if (typeof target === 'string') {
            await _performStartAll(target, {
                target: needsTargetPassword ? promptTargetPassword : undefined,
                proxy: needsProxyPassword ? promptProxyPassword : undefined,
            });
        } else if (target) {
            await _performStart(target, {
                target: needsTargetPassword ? promptTargetPassword : undefined,
                proxy: needsProxyPassword ? promptProxyPassword : undefined,
            });
        }
    };

    const handleStopAll = async (hostId: string) => {
        const hostForwards = forwards.filter((f) => f.hostId === hostId && f.status === 'running');
        for (const f of hostForwards) {
            try {
                await stopForward(f.id);
            } catch {
                toast.error(`Failed to stop ${f.name}`);
            }
        }
        if (hostForwards.length > 0) {
            toast.info(`Stopped ${hostForwards.length} forward(s) for ${getHostName(hostId)}`);
        }
    };

    const handleCopyCommand = (forward: PortForward) => {
        const cmd = generateSshCommand(forward);
        void navigator.clipboard.writeText(cmd);
        toast.success('SSH command copied');
    };

    const isLoading = (forwardId: string) => loadingForwards.has(forwardId);

    return (
        <>
            <PageHeader title='Port Forwarding'>
                <Button size='sm' onClick={handleAdd}>
                    <PlusIcon />
                    Add Forward
                </Button>
            </PageHeader>

            <div className='flex flex-1 flex-col gap-4 p-4'>
                {/* Toolbar */}
                <div className='flex items-center gap-2'>
                    <Select
                        value={hostFilter}
                        onValueChange={(val) => {
                            if (val) setHostFilter(val);
                        }}>
                        <SelectTrigger className='w-44'>
                            <SelectValue placeholder='Filter by host'>
                                {hostFilter === 'all'
                                    ? 'All Hosts'
                                    : hosts.find((h) => h.id === hostFilter)?.name}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value='all'>All Hosts</SelectItem>
                            {hosts
                                .filter((host) => forwards.some((f) => f.hostId === host.id))
                                .map((host) => (
                                    <SelectItem key={host.id} value={host.id}>
                                        {host.name}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Running Tunnels Panel Removed */}

                {/* Pinned Forwards */}
                {pinnedForwards.length > 0 && (
                    <div className='space-y-3'>
                        <h3 className='flex items-center gap-2 text-sm font-semibold'>
                            <PinIcon className='size-4' />
                            Pinned Forwards
                        </h3>
                        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
                            {pinnedForwards.map((forward) => (
                                <ForwardCard
                                    key={forward.id}
                                    forward={forward}
                                    isLoading={isLoading(forward.id)}
                                    formatPorts={formatPorts}
                                    onToggle={() => void handleToggle(forward)}
                                    onCopyCommand={() => handleCopyCommand(forward)}
                                    onEdit={() => handleEdit(forward)}
                                    onTogglePin={() => toggleForwardPin(forward.id)}
                                    onDelete={() => setDeleteTarget(forward)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Per-Host Grouped View */}
                {groupedForwards.size > 0 && (
                    <div className='space-y-4 pt-4'>
                        {pinnedForwards.length > 0 && (
                            <h3 className='text-sm font-semibold text-muted-foreground'>
                                Other Forwards
                            </h3>
                        )}
                        {[...groupedForwards.entries()].map(([hostId, hostForwards]) => {
                            const runningCount = hostForwards.filter(
                                (f) => f.status === 'running',
                            ).length;
                            return (
                                <div key={hostId} className='space-y-2'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center gap-2'>
                                            <h3 className='text-sm font-semibold'>
                                                {getHostName(hostId)}
                                            </h3>
                                            <Badge variant='outline' className='text-xs'>
                                                {hostForwards.length} forward
                                                {hostForwards.length !== 1 ? 's' : ''}
                                            </Badge>
                                            {runningCount > 0 && (
                                                <Badge
                                                    variant='secondary'
                                                    className='bg-green-500/10 text-xs text-green-700'>
                                                    {runningCount} running
                                                </Badge>
                                            )}
                                        </div>
                                        <div className='flex gap-1'>
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                onClick={() => void handleStartAll(hostId)}>
                                                <PlayIcon className='size-3 text-green-500' />
                                                Start All
                                            </Button>
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                onClick={() => void handleStopAll(hostId)}>
                                                <SquareIcon className='size-3 text-red-500' />
                                                Stop All
                                            </Button>
                                        </div>
                                    </div>

                                    <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
                                        {hostForwards.map((forward) => (
                                            <ForwardCard
                                                key={forward.id}
                                                forward={forward}
                                                isLoading={isLoading(forward.id)}
                                                formatPorts={formatPorts}
                                                onToggle={() => void handleToggle(forward)}
                                                onCopyCommand={() => handleCopyCommand(forward)}
                                                onEdit={() => handleEdit(forward)}
                                                onTogglePin={() => toggleForwardPin(forward.id)}
                                                onDelete={() => setDeleteTarget(forward)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Empty State */}
                {filteredForwards.length === 0 && (
                    <div className='flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12'>
                        <TerminalIcon className='size-8 text-muted-foreground' />
                        <div className='text-center'>
                            <p className='font-medium'>No port forwards configured</p>
                            <p className='text-sm text-muted-foreground'>
                                Create a new forward to start tunneling.
                            </p>
                        </div>
                        <Button size='sm' onClick={handleAdd}>
                            <PlusIcon />
                            Add Forward
                        </Button>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
                title='Delete Port Forward?'
                description='This action cannot be undone. This will permanently delete this port forward configuration.'
                onConfirm={() => {
                    if (deleteTarget) {
                        deleteForward(deleteTarget.id);
                        toast.success(`Forward "${deleteTarget.name}" deleted`);
                        setDeleteTarget(null);
                    }
                }}
            />

            <Dialog
                open={!!promptTarget}
                onOpenChange={(open) => {
                    if (!open) {
                        setPromptTarget(null);
                        setPromptHost(null);
                        setPromptProxyHost(null);
                    }
                }}>
                <DialogContent>
                    <form onSubmit={handlePasswordPromptSubmit}>
                        <DialogHeader>
                            <DialogTitle>Authentication Required</DialogTitle>
                            <DialogDescription>
                                Please enter the password for{' '}
                                {typeof promptTarget === 'string'
                                    ? getHostName(promptTarget)
                                    : getHostName(promptTarget?.hostId || '')}
                                .
                            </DialogDescription>
                        </DialogHeader>
                        <div className='py-4'>
                            <div className='space-y-4'>
                                {promptHost?.authType === 'password' && !promptHost.password && (
                                    <>
                                        <div className='space-y-2'>
                                            <Label htmlFor='targetPassword'>
                                                Host Password ({promptHost.name})
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
                                    (promptHost?.authType === 'password' &&
                                        !promptHost.password &&
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

function ForwardCard({
    forward,
    isLoading,
    formatPorts,
    onToggle,
    onCopyCommand,
    onEdit,
    onTogglePin,
    onDelete,
}: {
    forward: PortForward;
    isLoading: boolean;
    formatPorts: (forward: PortForward) => string;
    onToggle: () => void;
    onCopyCommand: () => void;
    onEdit: () => void;
    onTogglePin: () => void;
    onDelete: () => void;
}) {
    return (
        <Card className='py-3'>
            <CardContent className='flex items-center justify-between gap-4'>
                <div className='min-w-0 flex-1 space-y-0.5'>
                    <div className='flex min-w-0 items-center gap-2'>
                        <span className='relative flex h-2 w-2 shrink-0'>
                            {isLoading ? (
                                <span className='relative inline-flex h-2 w-2 rounded-full bg-yellow-500' />
                            ) : forward.status === 'running' ? (
                                <>
                                    <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75' />
                                    <span className='relative inline-flex h-2 w-2 rounded-full bg-green-500' />
                                </>
                            ) : forward.status === 'error' ? (
                                <span className='relative inline-flex h-2 w-2 rounded-full bg-red-500' />
                            ) : (
                                <span className='relative inline-flex h-2 w-2 rounded-full bg-zinc-500' />
                            )}
                        </span>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger className='block min-w-0 truncate text-left text-sm font-medium'>
                                    {forward.name}
                                </TooltipTrigger>
                                <TooltipContent>{forward.name}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <Badge
                            variant='secondary'
                            className='h-4 shrink-0 px-1 py-0 text-[10px] uppercase'>
                            {forward.type}
                        </Badge>
                    </div>
                    <TooltipProvider delay={300}>
                        <Tooltip>
                            <TooltipTrigger className='block min-w-0 truncate text-left font-mono text-xs text-muted-foreground'>
                                {formatPorts(forward)}
                            </TooltipTrigger>
                            <TooltipContent>{formatPorts(forward)}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className='flex shrink-0 items-center gap-1'>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <Button
                                        variant='outline'
                                        size='icon-sm'
                                        disabled={isLoading}
                                        onClick={onToggle}
                                    />
                                }>
                                {isLoading ? (
                                    <Loader2Icon className='animate-spin text-yellow-500' />
                                ) : forward.status === 'running' ? (
                                    <SquareIcon className='text-red-500' />
                                ) : (
                                    <PlayIcon className='text-green-500' />
                                )}
                                <span className='sr-only'>
                                    {forward.status === 'running'
                                        ? 'Stop'
                                        : forward.status === 'error'
                                          ? 'Retry'
                                          : 'Start'}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                {forward.status === 'running'
                                    ? 'Stop'
                                    : forward.status === 'error'
                                      ? 'Retry'
                                      : 'Start'}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant='ghost' size='icon-sm' />}>
                            <MoreHorizontalIcon />
                            <span className='sr-only'>Actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                            <DropdownMenuItem onClick={onCopyCommand}>
                                <CopyIcon />
                                Copy SSH Command
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onTogglePin}>
                                {forward.pinned ? <PinOffIcon /> : <PinIcon />}
                                {forward.pinned ? 'Unpin' : 'Pin'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onEdit}>
                                <PencilIcon />
                                Edit
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

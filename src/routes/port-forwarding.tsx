import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
    CopyIcon,
    Loader2Icon,
    MoreHorizontalIcon,
    PauseIcon,
    PencilIcon,
    PlayIcon,
    PlusIcon,
    SquareIcon,
    TerminalIcon,
    TrashIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { PortForward } from '@/lib/types';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';

export const Route = createFileRoute('/port-forwarding')({
    component: PortForwardingPage,
});

function PortForwardingPage() {
    const { hosts, forwards, deleteForward, startForward, stopForward } = useAppStore();
    const navigate = useNavigate();
    const [hostFilter, setHostFilter] = useState('all');
    const [deleteTarget, setDeleteTarget] = useState<PortForward | null>(null);
    const [loadingForwards, setLoadingForwards] = useState<Set<string>>(new Set());

    const filteredForwards = useMemo(() => {
        if (hostFilter === 'all') return forwards;
        return forwards.filter((f) => f.hostId === hostFilter);
    }, [forwards, hostFilter]);

    const runningForwards = useMemo(
        () => forwards.filter((f) => f.status === 'running'),
        [forwards],
    );

    // Group forwards by host
    const groupedForwards = useMemo(() => {
        const groups = new Map<string, PortForward[]>();
        for (const f of filteredForwards) {
            const existing = groups.get(f.hostId) || [];
            existing.push(f);
            groups.set(f.hostId, existing);
        }
        return groups;
    }, [filteredForwards]);

    const getHostName = (hostId: string) => hosts.find((h) => h.id === hostId)?.name ?? 'Unknown';

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

    const handleToggle = async (forward: PortForward) => {
        setLoadingForwards((prev) => new Set(prev).add(forward.id));
        try {
            if (forward.status === 'running') {
                await stopForward(forward.id);
                toast.info(`Stopped ${forward.name}`);
            } else {
                await startForward(forward.id);
                toast.success(`Started ${forward.name}`);
            }
        } catch {
            toast.error(
                `Failed to ${forward.status === 'running' ? 'stop' : 'start'} ${forward.name}`,
            );
        } finally {
            setLoadingForwards((prev) => {
                const next = new Set(prev);
                next.delete(forward.id);
                return next;
            });
        }
    };

    const handleStartAll = async (hostId: string) => {
        const hostForwards = forwards.filter((f) => f.hostId === hostId && f.status !== 'running');
        for (const f of hostForwards) {
            try {
                await startForward(f.id);
            } catch {
                toast.error(`Failed to start ${f.name}`);
            }
        }
        if (hostForwards.length > 0) {
            toast.success(`Started ${hostForwards.length} forward(s) for ${getHostName(hostId)}`);
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
                            {hosts.map((host) => (
                                <SelectItem key={host.id} value={host.id}>
                                    {host.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Running Tunnels Panel */}
                {runningForwards.length > 0 && (
                    <div className='space-y-2'>
                        <h3 className='text-sm font-medium text-muted-foreground'>
                            Running Tunnels ({runningForwards.length})
                        </h3>
                        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
                            {runningForwards.map((forward) => (
                                <Card key={forward.id} className='py-3'>
                                    <CardContent className='flex items-center justify-between'>
                                        <div className='min-w-0 space-y-0.5'>
                                            <div className='flex items-center gap-2'>
                                                <span className='relative flex h-2 w-2'>
                                                    <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75' />
                                                    <span className='relative inline-flex h-2 w-2 rounded-full bg-green-500' />
                                                </span>
                                                <p className='text-sm font-medium'>
                                                    {forward.name}
                                                </p>
                                            </div>
                                            <p className='truncate font-mono text-xs text-muted-foreground'>
                                                {formatPorts(forward)} •{' '}
                                                {getHostName(forward.hostId)}
                                            </p>
                                        </div>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            disabled={isLoading(forward.id)}
                                            onClick={() => void handleToggle(forward)}>
                                            {isLoading(forward.id) ? (
                                                <Loader2Icon className='size-3 animate-spin' />
                                            ) : (
                                                <SquareIcon className='size-3' />
                                            )}
                                            Stop
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Per-Host Grouped View */}
                {groupedForwards.size > 0 && (
                    <div className='space-y-4'>
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
                                                <PlayIcon className='size-3' />
                                                Start All
                                            </Button>
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                onClick={() => void handleStopAll(hostId)}>
                                                <SquareIcon className='size-3' />
                                                Stop All
                                            </Button>
                                        </div>
                                    </div>

                                    <div className='rounded-lg border'>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Ports</TableHead>
                                                    <TableHead>Command</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className='w-12.5' />
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {hostForwards.map((forward) => (
                                                    <TableRow key={forward.id}>
                                                        <TableCell>
                                                            <div>
                                                                <p className='font-medium'>
                                                                    {forward.name}
                                                                </p>
                                                                {forward.description && (
                                                                    <p className='text-xs text-muted-foreground'>
                                                                        {forward.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant='secondary'
                                                                className='capitalize'>
                                                                {forward.type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className='font-mono text-sm'>
                                                            {formatPorts(forward)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger
                                                                        render={
                                                                            <Button
                                                                                variant='ghost'
                                                                                size='icon-sm'
                                                                                onClick={() =>
                                                                                    handleCopyCommand(
                                                                                        forward,
                                                                                    )
                                                                                }
                                                                            />
                                                                        }>
                                                                        <TerminalIcon className='size-3.5' />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <code className='text-xs'>
                                                                            {generateSshCommand(
                                                                                forward,
                                                                            )}
                                                                        </code>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </TableCell>
                                                        <TableCell>
                                                            <StatusBadge status={forward.status} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger
                                                                    render={
                                                                        <Button
                                                                            variant='ghost'
                                                                            size='icon-sm'
                                                                        />
                                                                    }>
                                                                    <MoreHorizontalIcon />
                                                                    <span className='sr-only'>
                                                                        Actions
                                                                    </span>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align='end'>
                                                                    <DropdownMenuItem
                                                                        disabled={isLoading(
                                                                            forward.id,
                                                                        )}
                                                                        onClick={() =>
                                                                            void handleToggle(
                                                                                forward,
                                                                            )
                                                                        }>
                                                                        {forward.status ===
                                                                        'running' ? (
                                                                            <>
                                                                                <PauseIcon />
                                                                                Stop
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <PlayIcon />
                                                                                Start
                                                                            </>
                                                                        )}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            handleCopyCommand(
                                                                                forward,
                                                                            )
                                                                        }>
                                                                        <CopyIcon />
                                                                        Copy SSH Command
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            handleEdit(forward)
                                                                        }>
                                                                        <PencilIcon />
                                                                        Edit
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        variant='destructive'
                                                                        onClick={() =>
                                                                            setDeleteTarget(forward)
                                                                        }>
                                                                        <TrashIcon />
                                                                        Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
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
        </>
    );
}

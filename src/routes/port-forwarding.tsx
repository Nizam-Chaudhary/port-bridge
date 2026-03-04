import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
    MoreHorizontalIcon,
    PauseIcon,
    PencilIcon,
    PlayIcon,
    PlusIcon,
    SquareIcon,
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
import { useAppStore } from '@/lib/store';

export const Route = createFileRoute('/port-forwarding')({
    component: PortForwardingPage,
});

function PortForwardingPage() {
    const { hosts, forwards, deleteForward, toggleForward } = useAppStore();
    const navigate = useNavigate();
    const [hostFilter, setHostFilter] = useState('all');
    const [deleteTarget, setDeleteTarget] = useState<PortForward | null>(null);

    const filteredForwards = useMemo(() => {
        if (hostFilter === 'all') return forwards;
        return forwards.filter((f) => f.hostId === hostFilter);
    }, [forwards, hostFilter]);

    const runningForwards = useMemo(
        () => forwards.filter((f) => f.status === 'running'),
        [forwards],
    );

    const getHostName = (hostId: string) => hosts.find((h) => h.id === hostId)?.name ?? 'Unknown';

    const formatPorts = (forward: PortForward) => {
        if (forward.type === 'dynamic') return `*:${forward.localPort}`;
        if (forward.type === 'local') return `${forward.localPort} → ${forward.remotePort}`;
        return `${forward.remotePort} → ${forward.localPort}`;
    };

    const handleEdit = (forward: PortForward) => {
        void navigate({ to: '/forwards/edit/$forwardId', params: { forwardId: forward.id } });
    };

    const handleAdd = () => {
        void navigate({ to: '/forwards/new' });
    };

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
                            <SelectValue placeholder='Filter by host' />
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
                                        <div className='space-y-0.5'>
                                            <p className='text-sm font-medium'>{forward.name}</p>
                                            <p className='font-mono text-xs text-muted-foreground'>
                                                {formatPorts(forward)} •{' '}
                                                {getHostName(forward.hostId)}
                                            </p>
                                        </div>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() => {
                                                toggleForward(forward.id);
                                                toast.info(`Stopped ${forward.name}`);
                                            }}>
                                            <SquareIcon className='size-3' />
                                            Stop
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className='rounded-lg border'>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Host</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Ports</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className='w-12.5' />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredForwards.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className='h-24 text-center text-muted-foreground'>
                                        No port forwards configured.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredForwards.map((forward) => (
                                    <TableRow key={forward.id}>
                                        <TableCell className='font-medium'>
                                            {forward.name}
                                        </TableCell>
                                        <TableCell>{getHostName(forward.hostId)}</TableCell>
                                        <TableCell>
                                            <Badge variant='secondary' className='capitalize'>
                                                {forward.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className='font-mono text-sm'>
                                            {formatPorts(forward)}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={forward.status} />
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger
                                                    render={
                                                        <Button variant='ghost' size='icon-sm' />
                                                    }>
                                                    <MoreHorizontalIcon />
                                                    <span className='sr-only'>Actions</span>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align='end'>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            toggleForward(forward.id);
                                                            toast.info(
                                                                forward.status === 'running'
                                                                    ? `Stopped ${forward.name}`
                                                                    : `Started ${forward.name}`,
                                                            );
                                                        }}>
                                                        {forward.status === 'running' ? (
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
                                                        onClick={() => handleEdit(forward)}>
                                                        <PencilIcon />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        variant='destructive'
                                                        onClick={() => setDeleteTarget(forward)}>
                                                        <TrashIcon />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
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

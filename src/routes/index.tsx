import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
    CopyIcon,
    DownloadIcon,
    MoreHorizontalIcon,
    PencilIcon,
    PlusIcon,
    SearchIcon,
    TrashIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { Host } from '@/lib/types';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useAppStore } from '@/lib/store';

export const Route = createFileRoute('/')({
    component: HostsPage,
});

function HostsPage() {
    const { hosts, forwards, deleteHost, duplicateHost } = useAppStore();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<Host | null>(null);

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

    const getForwardCount = (hostId: string) => forwards.filter((f) => f.hostId === hostId).length;

    const handleEdit = (host: Host) => {
        void navigate({ to: '/hosts/edit/$hostId', params: { hostId: host.id } });
    };

    const handleAdd = () => {
        void navigate({ to: '/hosts/new' });
    };

    const handleExport = (host: Host) => {
        toast.success(`Exported ${host.name}`, {
            description: 'Host configuration copied to clipboard.',
        });
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

                {/* Table */}
                <div className='rounded-lg border'>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Hostname</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead className='w-17.5'>Port</TableHead>
                                <TableHead>Auth</TableHead>
                                <TableHead className='w-22.5'>Forwards</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className='w-12.5' />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredHosts.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className='h-24 text-center text-muted-foreground'>
                                        {search
                                            ? 'No hosts match your search.'
                                            : 'No hosts yet. Click "Add Host" to get started.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredHosts.map((host) => (
                                    <TableRow key={host.id}>
                                        <TableCell className='font-medium'>{host.name}</TableCell>
                                        <TableCell className='font-mono text-sm'>
                                            {host.hostname}
                                        </TableCell>
                                        <TableCell>{host.username}</TableCell>
                                        <TableCell>{host.port}</TableCell>
                                        <TableCell>
                                            <Badge variant='secondary' className='capitalize'>
                                                {host.authType}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant='outline'>
                                                {getForwardCount(host.id)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={host.status} />
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
                                                        onClick={() => handleEdit(host)}>
                                                        <PencilIcon />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => duplicateHost(host.id)}>
                                                        <CopyIcon />
                                                        Duplicate
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleExport(host)}>
                                                        <DownloadIcon />
                                                        Export
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        variant='destructive'
                                                        onClick={() => setDeleteTarget(host)}>
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
        </>
    );
}

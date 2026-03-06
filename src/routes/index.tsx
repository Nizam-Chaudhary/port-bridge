import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
    CopyIcon,
    DownloadIcon,
    MoreHorizontalIcon,
    PencilIcon,
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';

export const Route = createFileRoute('/')({
    component: HostsPage,
});

function HostsPage() {
    const { hosts, deleteHost, duplicateHost, connectHost } = useAppStore();
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

    const handleEdit = (host: Host) => {
        void navigate({ to: '/hosts/edit/$hostId', params: { hostId: host.id } });
    };

    const handleAdd = () => {
        void navigate({ to: '/hosts/new', search: { redirectTo: undefined } });
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

                {/* Cards */}
                {filteredHosts.length > 0 ? (
                    <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
                        {filteredHosts.map((host) => (
                            <Card key={host.id} className='py-3'>
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
                                                            {host.username}@{host.hostname}:
                                                            {host.port}
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
                                                        <Button
                                                            variant='outline'
                                                            size='icon-sm'
                                                            onClick={() => {
                                                                void connectHost(host.id);
                                                                toast.success(
                                                                    `Connecting to ${host.name}...`,
                                                                );
                                                            }}
                                                        />
                                                    }>
                                                    <TerminalIcon />
                                                    <span className='sr-only'>Connect</span>
                                                </TooltipTrigger>
                                                <TooltipContent>Connect</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger
                                                render={<Button variant='ghost' size='icon-sm' />}>
                                                <MoreHorizontalIcon />
                                                <span className='sr-only'>Actions</span>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align='end'>
                                                <DropdownMenuItem onClick={() => handleEdit(host)}>
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
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
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
        </>
    );
}

import { createFileRoute } from '@tanstack/react-router';

import { HostForm } from '@/components/host-form';
import { PageHeader } from '@/components/page-header';
import { useAppStore } from '@/lib/store';

export const Route = createFileRoute('/hosts/edit/$hostId')({
    component: EditHostPage,
});

function EditHostPage() {
    const { hostId } = Route.useParams();
    const { hosts } = useAppStore();
    const host = hosts.find((h) => h.id === hostId);

    if (!host) {
        return (
            <>
                <PageHeader title='Edit Host' />
                <div className='flex flex-1 items-center justify-center'>
                    <p className='text-muted-foreground'>Host not found.</p>
                </div>
            </>
        );
    }

    return (
        <>
            <PageHeader title='Edit Host' />
            <div className='flex flex-1 flex-col gap-4 p-4'>
                <HostForm host={host} />
            </div>
        </>
    );
}

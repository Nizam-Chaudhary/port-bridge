import { createFileRoute } from '@tanstack/react-router';

import { ForwardForm } from '@/components/forward-form';
import { PageHeader } from '@/components/page-header';
import { useAppStore } from '@/lib/store';

export const Route = createFileRoute('/forwards/edit/$forwardId')({
    component: EditForwardPage,
});

function EditForwardPage() {
    const { forwardId } = Route.useParams();
    const { forwards } = useAppStore();
    const forward = forwards.find((f) => f.id === forwardId);

    if (!forward) {
        return (
            <>
                <PageHeader title='Edit Port Forward' />
                <div className='flex flex-1 items-center justify-center'>
                    <p className='text-muted-foreground'>Port forward not found.</p>
                </div>
            </>
        );
    }

    return (
        <>
            <PageHeader title='Edit Port Forward' />
            <div className='flex flex-1 flex-col gap-4 p-4'>
                <ForwardForm forward={forward} />
            </div>
        </>
    );
}

import { createFileRoute } from '@tanstack/react-router';

import { ForwardForm } from '@/components/forward-form';
import { PageHeader } from '@/components/page-header';

export const Route = createFileRoute('/forwards/new')({
    component: NewForwardPage,
});

function NewForwardPage() {
    return (
        <>
            <PageHeader title='Add Port Forward' />
            <div className='flex flex-1 flex-col gap-4 p-4'>
                <ForwardForm />
            </div>
        </>
    );
}

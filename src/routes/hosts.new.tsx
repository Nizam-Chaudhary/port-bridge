import { createFileRoute } from '@tanstack/react-router';

import { HostForm } from '@/components/host-form';
import { PageHeader } from '@/components/page-header';

export const Route = createFileRoute('/hosts/new')({
    component: NewHostPage,
});

function NewHostPage() {
    return (
        <>
            <PageHeader title='Add Host' />
            <div className='flex flex-1 flex-col gap-4 p-4'>
                <HostForm />
            </div>
        </>
    );
}

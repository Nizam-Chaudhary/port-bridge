import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface PageHeaderProps {
    title: string;
    children?: React.ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
    return (
        <header className='flex h-14 shrink-0 items-center gap-2 border-b px-4'>
            <SidebarTrigger />
            <div className='hidden md:block'>
                <Separator orientation='vertical' className='me-2 h-8' />
            </div>
            <h1 className='text-lg font-semibold'>{title}</h1>
            <div className='ml-auto flex items-center gap-2'>{children}</div>
        </header>
    );
}

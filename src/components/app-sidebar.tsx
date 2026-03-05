import { Link, useRouterState } from '@tanstack/react-router';
import { MonitorIcon, NetworkIcon, SettingsIcon, TerminalIcon } from 'lucide-react';

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarSeparator,
} from '@/components/ui/sidebar';

const mainNav = [
    { title: 'Hosts', to: '/' as const, icon: MonitorIcon },
    { title: 'Port Forwarding', to: '/port-forwarding' as const, icon: NetworkIcon },
];

const settingsNav = [{ title: 'Settings', to: '/settings' as const, icon: SettingsIcon }];

export function AppSidebar() {
    const router = useRouterState();
    const currentPath = router.location.pathname;

    return (
        <Sidebar collapsible='icon'>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size='lg' render={<span />}>
                            <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                                <TerminalIcon className='size-4' />
                            </div>
                            <div className='flex flex-col gap-0.5 leading-none'>
                                <span className='font-semibold'>SSH Manager</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {mainNav.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        tooltip={item.title}
                                        isActive={currentPath === item.to}
                                        render={<Link to={item.to} />}>
                                        <item.icon />
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarSeparator />
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {settingsNav.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        tooltip={item.title}
                                        isActive={currentPath === item.to}
                                        render={<Link to={item.to} />}>
                                        <item.icon />
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    );
}

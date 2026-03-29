import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    CheckIcon,
    ChevronDownIcon,
    ChevronsUpDownIcon,
    CopyIcon,
    FileTextIcon,
    GlobeIcon,
    HashIcon,
    Loader2Icon,
    NetworkIcon,
    PlusIcon,
    ServerIcon,
    SparklesIcon,
    TagIcon,
    TerminalIcon,
    XCircleIcon,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { ForwardType, PortForward } from '@/lib/types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { forwardPresets } from '@/lib/mock-data';
import { useAppStore } from '@/lib/store';

interface ForwardFormProps {
    forward?: PortForward | null;
}

export function ForwardForm({ forward }: ForwardFormProps) {
    const { hosts, addForward, updateForward, checkPortAvailability } = useAppStore();
    const navigate = useNavigate();
    const isEditing = !!forward;
    const [presetOpen, setPresetOpen] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(
        !!(
            forward?.bindAddress ||
            forward?.autoStart ||
            forward?.restartOnDisconnect ||
            forward?.gatewayPorts
        ),
    );
    const [portCheckResult, setPortCheckResult] = useState<{
        available: boolean;
        suggestedPort?: number;
    } | null>(null);
    const [isCheckingPort, setIsCheckingPort] = useState(false);
    const [hostOpen, setHostOpen] = useState(false);
    const selectableHosts = useMemo(() => hosts.filter((host) => !host.hidden), [hosts]);

    const form = useForm({
        defaultValues: {
            name: forward?.name ?? '',
            description: forward?.description ?? '',
            hostId: forward?.hostId ?? '',
            type: (forward?.type ?? 'local') as ForwardType,
            localPort: forward?.localPort ?? 0,
            remoteHost: forward?.remoteHost ?? 'localhost',
            remotePort: forward?.remotePort ?? 0,
            localHost: forward?.localHost ?? 'localhost',
            // Advanced
            bindAddress: forward?.bindAddress ?? '',
            autoStart: forward?.autoStart ?? false,
            restartOnDisconnect: forward?.restartOnDisconnect ?? false,
            gatewayPorts: forward?.gatewayPorts ?? false,
        },
        onSubmit: async ({ value }) => {
            if (!value.name) {
                toast.error('Name is required');
                return;
            }
            if (!value.hostId) {
                toast.error('Host is required');
                return;
            }
            if (isEditing && forward) {
                updateForward(forward.id, { ...value, pinned: false });
                toast.success(`Forward "${value.name}" updated`);
            } else {
                addForward({ ...value, pinned: false });
                toast.success(`Forward "${value.name}" created`);
            }
            void navigate({ to: '/port-forwarding' });
        },
    });

    const [forwardType, setForwardType] = useState<ForwardType>(
        (forward?.type ?? 'local') as ForwardType,
    );

    // Generate SSH command preview
    const generateCommandPreview = useCallback(() => {
        const values = form.state.values;
        const host = hosts.find((h) => h.id === values.hostId);
        const hostName = host?.name ?? '<host>';
        const sshBin = 'ssh';
        const bindAddr = values.bindAddress || '';

        if (values.type === 'local') {
            const localBind = bindAddr ? `${bindAddr}:${values.localPort}` : `${values.localPort}`;
            return `${sshBin} -L ${localBind}:${values.remoteHost || 'localhost'}:${values.remotePort} ${hostName}`;
        }
        if (values.type === 'remote') {
            return `${sshBin} -R ${values.remotePort}:${values.localHost || 'localhost'}:${values.localPort} ${hostName}`;
        }
        if (values.type === 'dynamic') {
            const dynamicBind = bindAddr
                ? `${bindAddr}:${values.localPort}`
                : `${values.localPort}`;
            return `${sshBin} -D ${dynamicBind} ${hostName}`;
        }
        return '';
    }, [form.state.values, hosts]);

    const handleCheckPort = async () => {
        const port = form.state.values.localPort;
        if (!port || port <= 0) {
            toast.error('Enter a valid port first');
            return;
        }
        setIsCheckingPort(true);
        setPortCheckResult(null);
        try {
            const result = await checkPortAvailability(port);
            setPortCheckResult(result);
            if (result.available) {
                toast.success(`Port ${port} is available`);
            } else {
                toast.warning(`Port ${port} is in use`, {
                    description: result.suggestedPort
                        ? `Suggested: ${result.suggestedPort}`
                        : undefined,
                });
            }
        } catch {
            toast.error('Failed to check port availability');
        } finally {
            setIsCheckingPort(false);
        }
    };

    const handleCopyCommand = () => {
        const cmd = generateCommandPreview();
        void navigator.clipboard.writeText(cmd);
        toast.success('SSH command copied to clipboard');
    };

    return (
        <div className='mx-auto w-full max-w-2xl'>
            <div className='mb-6'>
                <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => void navigate({ to: '/port-forwarding' })}>
                    <ArrowLeftIcon />
                    Back to Forwards
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{isEditing ? 'Edit Port Forward' : 'Add Port Forward'}</CardTitle>
                    <CardDescription>
                        {isEditing
                            ? 'Update the port forwarding configuration.'
                            : 'Create a new SSH port forward tunnel.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Quick Add Presets */}
                    {!isEditing && (
                        <>
                            <div className='mb-6 flex items-center gap-2'>
                                <Popover open={presetOpen} onOpenChange={setPresetOpen}>
                                    <PopoverTrigger
                                        render={
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                className='gap-1.5'
                                            />
                                        }>
                                        <SparklesIcon className='size-3.5' />
                                        Quick Add
                                        <ChevronsUpDownIcon className='size-3.5 opacity-50' />
                                    </PopoverTrigger>
                                    <PopoverContent className='w-64 p-0' align='start'>
                                        <Command>
                                            <CommandInput placeholder='Search presets...' />
                                            <CommandList>
                                                <CommandEmpty>No preset found.</CommandEmpty>
                                                <CommandGroup>
                                                    {forwardPresets.map((preset) => (
                                                        <CommandItem
                                                            key={preset.name}
                                                            value={preset.name}
                                                            onSelect={() => {
                                                                form.setFieldValue(
                                                                    'name',
                                                                    preset.name.toLowerCase(),
                                                                );
                                                                form.setFieldValue(
                                                                    'localPort',
                                                                    preset.localPort,
                                                                );
                                                                form.setFieldValue(
                                                                    'remoteHost',
                                                                    preset.remoteHost ||
                                                                        'localhost',
                                                                );
                                                                form.setFieldValue(
                                                                    'remotePort',
                                                                    preset.remotePort,
                                                                );
                                                                // If it's a SOCKS preset, set type to dynamic
                                                                if (preset.remotePort === 0) {
                                                                    form.setFieldValue(
                                                                        'type',
                                                                        'dynamic',
                                                                    );
                                                                    setForwardType('dynamic');
                                                                } else {
                                                                    form.setFieldValue(
                                                                        'type',
                                                                        'local',
                                                                    );
                                                                    setForwardType('local');
                                                                }
                                                                setPresetOpen(false);
                                                                setPortCheckResult(null);
                                                                toast.success(
                                                                    `Applied ${preset.name} preset`,
                                                                );
                                                            }}>
                                                            <div className='flex flex-col'>
                                                                <span className='font-medium'>
                                                                    {preset.name}
                                                                </span>
                                                                <span className='text-xs text-muted-foreground'>
                                                                    {preset.description}
                                                                </span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <span className='text-xs text-muted-foreground'>
                                    Apply common forward configs
                                </span>
                            </div>
                            <Separator className='mb-6' />
                        </>
                    )}

                    <form
                        id='forward-form'
                        onSubmit={(e) => {
                            e.preventDefault();
                            void form.handleSubmit();
                        }}
                        className='space-y-6'>
                        <FieldGroup>
                            <form.Field
                                name='name'
                                children={(field) => {
                                    const isInvalid =
                                        field.state.meta.isTouched && !field.state.meta.isValid;
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                                            <InputGroup>
                                                <InputGroupAddon>
                                                    <TagIcon className='size-4 text-muted-foreground' />
                                                </InputGroupAddon>
                                                <InputGroupInput
                                                    id={field.name}
                                                    name={field.name}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) =>
                                                        field.handleChange(e.target.value)
                                                    }
                                                    aria-invalid={isInvalid}
                                                    placeholder='postgres-prod'
                                                    autoComplete='off'
                                                />
                                            </InputGroup>
                                            {isInvalid && (
                                                <FieldError errors={field.state.meta.errors} />
                                            )}
                                        </Field>
                                    );
                                }}
                            />
                            <form.Field
                                name='description'
                                children={(field) => (
                                    <Field>
                                        <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                                        <InputGroup>
                                            <InputGroupAddon>
                                                <FileTextIcon className='size-4 text-muted-foreground' />
                                            </InputGroupAddon>
                                            <InputGroupInput
                                                id={field.name}
                                                name={field.name}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                placeholder='Production PostgreSQL tunnel'
                                                autoComplete='off'
                                            />
                                        </InputGroup>
                                        <FieldDescription>Optional description.</FieldDescription>
                                    </Field>
                                )}
                            />
                            <form.Field
                                name='hostId'
                                children={(field) => {
                                    const isInvalid =
                                        field.state.meta.isTouched && !field.state.meta.isValid;
                                    const selectedHost = hosts.find(
                                        (h) => h.id === field.state.value,
                                    );
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor='forward-host'>Host</FieldLabel>
                                            <Popover open={hostOpen} onOpenChange={setHostOpen}>
                                                <PopoverTrigger
                                                    render={
                                                        <Button
                                                            variant='outline'
                                                            id='forward-host'
                                                            className='w-full justify-between gap-2 font-normal'
                                                            aria-invalid={isInvalid}
                                                        />
                                                    }>
                                                    <span className='flex min-w-0 items-center gap-2'>
                                                        <ServerIcon className='size-4 text-muted-foreground' />
                                                        <span className='truncate'>
                                                            {selectedHost
                                                                ? `${selectedHost.name} (${selectedHost.hostname})`
                                                                : 'Select host...'}
                                                        </span>
                                                    </span>
                                                    <ChevronsUpDownIcon className='ml-auto size-4 shrink-0 opacity-50' />
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className='w-[--radix-popover-trigger-width] p-0'
                                                    align='start'>
                                                    <Command>
                                                        <CommandInput placeholder='Search hosts...' />
                                                        <CommandList>
                                                            <CommandEmpty>
                                                                <div className='flex flex-col items-center gap-2 py-2'>
                                                                    <p className='text-sm text-muted-foreground'>
                                                                        No hosts found.
                                                                    </p>
                                                                    <Button
                                                                        size='sm'
                                                                        variant='outline'
                                                                        onClick={() => {
                                                                            setHostOpen(false);
                                                                            void navigate({
                                                                                to: '/hosts/new',
                                                                                search: {
                                                                                    redirectTo:
                                                                                        '/forwards/new',
                                                                                },
                                                                            });
                                                                        }}>
                                                                        <PlusIcon className='size-3.5' />
                                                                        Add Host
                                                                    </Button>
                                                                </div>
                                                            </CommandEmpty>
                                                            <CommandGroup>
                                                                {selectableHosts.map((host) => (
                                                                    <CommandItem
                                                                        key={host.id}
                                                                        value={`${host.name} ${host.hostname}`}
                                                                        onSelect={() => {
                                                                            field.handleChange(
                                                                                host.id,
                                                                            );
                                                                            setHostOpen(false);
                                                                        }}>
                                                                        <CheckIcon
                                                                            className={`mr-2 size-4 ${
                                                                                field.state
                                                                                    .value ===
                                                                                host.id
                                                                                    ? 'opacity-100'
                                                                                    : 'opacity-0'
                                                                            }`}
                                                                        />
                                                                        <div className='flex flex-col'>
                                                                            <span className='font-medium'>
                                                                                {host.name}
                                                                            </span>
                                                                            <span className='text-xs text-muted-foreground'>
                                                                                {host.hostname}
                                                                            </span>
                                                                        </div>
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                            <CommandGroup>
                                                                <CommandItem
                                                                    onSelect={() => {
                                                                        setHostOpen(false);
                                                                        void navigate({
                                                                            to: '/hosts/new',
                                                                            search: {
                                                                                redirectTo:
                                                                                    '/forwards/new',
                                                                            },
                                                                        });
                                                                    }}>
                                                                    <PlusIcon className='mr-2 size-4' />
                                                                    Add new host...
                                                                </CommandItem>
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                            {isInvalid && (
                                                <FieldError errors={field.state.meta.errors} />
                                            )}
                                        </Field>
                                    );
                                }}
                            />
                            <form.Field
                                name='type'
                                children={(field) => (
                                    <Field>
                                        <FieldLabel htmlFor='forward-type'>Forward Type</FieldLabel>
                                        <Select
                                            name={field.name}
                                            value={field.state.value}
                                            onValueChange={(val) => {
                                                if (val) {
                                                    field.handleChange(val as ForwardType);
                                                    setForwardType(val as ForwardType);
                                                    setPortCheckResult(null);
                                                }
                                            }}>
                                            <SelectTrigger id='forward-type' className='gap-2'>
                                                <NetworkIcon className='size-4 text-muted-foreground' />
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value='local'>Local Forward</SelectItem>
                                                <SelectItem value='remote'>
                                                    Remote Forward
                                                </SelectItem>
                                                <SelectItem value='dynamic'>
                                                    Dynamic (SOCKS Proxy)
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FieldDescription>
                                            {forwardType === 'local' &&
                                                'Forward a local port to a remote host. Use for database access, admin dashboards, etc.'}
                                            {forwardType === 'remote' &&
                                                'Expose a local service to the remote server. Use for webhook testing, exposing localhost.'}
                                            {forwardType === 'dynamic' &&
                                                'Create a SOCKS5 proxy on a local port. Use as a VPN-style proxy.'}
                                        </FieldDescription>
                                    </Field>
                                )}
                            />
                        </FieldGroup>

                        <Separator />

                        {/* Dynamic fields based on forward type */}
                        <FieldGroup>
                            {(forwardType === 'local' || forwardType === 'dynamic') && (
                                <form.Field
                                    name='localPort'
                                    children={(field) => {
                                        const isInvalid =
                                            field.state.meta.isTouched && !field.state.meta.isValid;
                                        return (
                                            <Field data-invalid={isInvalid}>
                                                <FieldLabel htmlFor='forward-localPort'>
                                                    Local Port
                                                </FieldLabel>
                                                <div className='flex items-center gap-2'>
                                                    <InputGroup className='flex-1'>
                                                        <InputGroupAddon>
                                                            <HashIcon className='size-4 text-muted-foreground' />
                                                        </InputGroupAddon>
                                                        <InputGroupInput
                                                            id='forward-localPort'
                                                            name={field.name}
                                                            type='number'
                                                            value={field.state.value || ''}
                                                            onBlur={field.handleBlur}
                                                            onChange={(e) => {
                                                                field.handleChange(
                                                                    Number(e.target.value),
                                                                );
                                                                setPortCheckResult(null);
                                                            }}
                                                            aria-invalid={isInvalid}
                                                            placeholder='5432'
                                                        />
                                                    </InputGroup>
                                                    <Button
                                                        type='button'
                                                        variant='outline'
                                                        size='sm'
                                                        disabled={isCheckingPort}
                                                        onClick={() => void handleCheckPort()}>
                                                        {isCheckingPort ? (
                                                            <Loader2Icon className='size-3.5 animate-spin' />
                                                        ) : (
                                                            'Test Port'
                                                        )}
                                                    </Button>
                                                </div>
                                                {portCheckResult && (
                                                    <div className='mt-1.5 flex items-center gap-1.5'>
                                                        {portCheckResult.available ? (
                                                            <>
                                                                <CheckCircleIcon className='size-3.5 text-green-500' />
                                                                <span className='text-xs text-green-600'>
                                                                    Port is available
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <XCircleIcon className='size-3.5 text-red-500' />
                                                                <span className='text-xs text-red-600'>
                                                                    Port in use
                                                                </span>
                                                                {portCheckResult.suggestedPort && (
                                                                    <Button
                                                                        type='button'
                                                                        variant='link'
                                                                        size='sm'
                                                                        className='h-auto p-0 text-xs'
                                                                        onClick={() => {
                                                                            field.handleChange(
                                                                                portCheckResult.suggestedPort!,
                                                                            );
                                                                            setPortCheckResult(
                                                                                null,
                                                                            );
                                                                            toast.info(
                                                                                `Port set to ${portCheckResult.suggestedPort}`,
                                                                            );
                                                                        }}>
                                                                        Use{' '}
                                                                        {
                                                                            portCheckResult.suggestedPort
                                                                        }
                                                                    </Button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                                {isInvalid && (
                                                    <FieldError errors={field.state.meta.errors} />
                                                )}
                                            </Field>
                                        );
                                    }}
                                />
                            )}
                            {forwardType === 'local' && (
                                <>
                                    <form.Field
                                        name='remoteHost'
                                        children={(field) => (
                                            <Field>
                                                <FieldLabel htmlFor='forward-remoteHost'>
                                                    Remote Host
                                                </FieldLabel>
                                                <InputGroup>
                                                    <InputGroupAddon>
                                                        <GlobeIcon className='size-4 text-muted-foreground' />
                                                    </InputGroupAddon>
                                                    <InputGroupInput
                                                        id='forward-remoteHost'
                                                        name={field.name}
                                                        value={field.state.value}
                                                        onBlur={field.handleBlur}
                                                        onChange={(e) =>
                                                            field.handleChange(e.target.value)
                                                        }
                                                        placeholder='localhost'
                                                    />
                                                </InputGroup>
                                            </Field>
                                        )}
                                    />
                                    <form.Field
                                        name='remotePort'
                                        children={(field) => {
                                            const isInvalid =
                                                field.state.meta.isTouched &&
                                                !field.state.meta.isValid;
                                            return (
                                                <Field data-invalid={isInvalid}>
                                                    <FieldLabel htmlFor='forward-remotePort'>
                                                        Remote Port
                                                    </FieldLabel>
                                                    <InputGroup>
                                                        <InputGroupAddon>
                                                            <HashIcon className='size-4 text-muted-foreground' />
                                                        </InputGroupAddon>
                                                        <InputGroupInput
                                                            id='forward-remotePort'
                                                            name={field.name}
                                                            type='number'
                                                            value={field.state.value || ''}
                                                            onBlur={field.handleBlur}
                                                            onChange={(e) =>
                                                                field.handleChange(
                                                                    Number(e.target.value),
                                                                )
                                                            }
                                                            aria-invalid={isInvalid}
                                                            placeholder='5432'
                                                        />
                                                    </InputGroup>
                                                    {isInvalid && (
                                                        <FieldError
                                                            errors={field.state.meta.errors}
                                                        />
                                                    )}
                                                </Field>
                                            );
                                        }}
                                    />
                                </>
                            )}
                            {forwardType === 'remote' && (
                                <>
                                    <form.Field
                                        name='remotePort'
                                        children={(field) => {
                                            const isInvalid =
                                                field.state.meta.isTouched &&
                                                !field.state.meta.isValid;
                                            return (
                                                <Field data-invalid={isInvalid}>
                                                    <FieldLabel htmlFor='forward-remotePort-r'>
                                                        Remote Port
                                                    </FieldLabel>
                                                    <InputGroup>
                                                        <InputGroupAddon>
                                                            <HashIcon className='size-4 text-muted-foreground' />
                                                        </InputGroupAddon>
                                                        <InputGroupInput
                                                            id='forward-remotePort-r'
                                                            name={field.name}
                                                            type='number'
                                                            value={field.state.value || ''}
                                                            onBlur={field.handleBlur}
                                                            onChange={(e) =>
                                                                field.handleChange(
                                                                    Number(e.target.value),
                                                                )
                                                            }
                                                            aria-invalid={isInvalid}
                                                            placeholder='8080'
                                                        />
                                                    </InputGroup>
                                                    {isInvalid && (
                                                        <FieldError
                                                            errors={field.state.meta.errors}
                                                        />
                                                    )}
                                                </Field>
                                            );
                                        }}
                                    />
                                    <form.Field
                                        name='localHost'
                                        children={(field) => (
                                            <Field>
                                                <FieldLabel htmlFor='forward-localHost'>
                                                    Local Host
                                                </FieldLabel>
                                                <InputGroup>
                                                    <InputGroupAddon>
                                                        <GlobeIcon className='size-4 text-muted-foreground' />
                                                    </InputGroupAddon>
                                                    <InputGroupInput
                                                        id='forward-localHost'
                                                        name={field.name}
                                                        value={field.state.value}
                                                        onBlur={field.handleBlur}
                                                        onChange={(e) =>
                                                            field.handleChange(e.target.value)
                                                        }
                                                        placeholder='localhost'
                                                    />
                                                </InputGroup>
                                            </Field>
                                        )}
                                    />
                                    <form.Field
                                        name='localPort'
                                        children={(field) => {
                                            const isInvalid =
                                                field.state.meta.isTouched &&
                                                !field.state.meta.isValid;
                                            return (
                                                <Field data-invalid={isInvalid}>
                                                    <FieldLabel htmlFor='forward-localPort-remote'>
                                                        Local Port
                                                    </FieldLabel>
                                                    <InputGroup>
                                                        <InputGroupAddon>
                                                            <HashIcon className='size-4 text-muted-foreground' />
                                                        </InputGroupAddon>
                                                        <InputGroupInput
                                                            id='forward-localPort-remote'
                                                            name={field.name}
                                                            type='number'
                                                            value={field.state.value || ''}
                                                            onBlur={field.handleBlur}
                                                            onChange={(e) =>
                                                                field.handleChange(
                                                                    Number(e.target.value),
                                                                )
                                                            }
                                                            aria-invalid={isInvalid}
                                                            placeholder='3000'
                                                        />
                                                    </InputGroup>
                                                    {isInvalid && (
                                                        <FieldError
                                                            errors={field.state.meta.errors}
                                                        />
                                                    )}
                                                </Field>
                                            );
                                        }}
                                    />
                                </>
                            )}
                        </FieldGroup>

                        {/* Advanced Options */}
                        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                            <CollapsibleTrigger
                                render={
                                    <Button
                                        type='button'
                                        variant='ghost'
                                        size='sm'
                                        className='w-full justify-between'
                                    />
                                }>
                                <span className='flex items-center gap-2'>
                                    Advanced Options
                                    {(form.state.values.bindAddress ||
                                        form.state.values.autoStart ||
                                        form.state.values.restartOnDisconnect ||
                                        form.state.values.gatewayPorts) && (
                                        <Badge variant='secondary' className='text-[10px]'>
                                            configured
                                        </Badge>
                                    )}
                                </span>
                                <ChevronDownIcon
                                    className={`size-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                                />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className='mt-4 space-y-4 rounded-lg border p-4'>
                                    <form.Field
                                        name='bindAddress'
                                        children={(field) => (
                                            <Field>
                                                <FieldLabel htmlFor='forward-bindAddress'>
                                                    Bind Address
                                                </FieldLabel>
                                                <InputGroup>
                                                    <InputGroupAddon>
                                                        <GlobeIcon className='size-4 text-muted-foreground' />
                                                    </InputGroupAddon>
                                                    <InputGroupInput
                                                        id='forward-bindAddress'
                                                        name={field.name}
                                                        value={field.state.value}
                                                        onBlur={field.handleBlur}
                                                        onChange={(e) =>
                                                            field.handleChange(e.target.value)
                                                        }
                                                        placeholder='0.0.0.0'
                                                    />
                                                </InputGroup>
                                                <FieldDescription>
                                                    Leave empty for localhost only. Set to 0.0.0.0
                                                    to allow external connections.
                                                </FieldDescription>
                                            </Field>
                                        )}
                                    />
                                    <div className='space-y-3'>
                                        <form.Field
                                            name='autoStart'
                                            children={(field) => (
                                                <label
                                                    htmlFor='forward-autoStart'
                                                    className='flex items-center gap-3'>
                                                    <Checkbox
                                                        id='forward-autoStart'
                                                        checked={field.state.value}
                                                        onCheckedChange={(checked) =>
                                                            field.handleChange(!!checked)
                                                        }
                                                    />
                                                    <div>
                                                        <p className='text-sm font-medium'>
                                                            Auto Start
                                                        </p>
                                                        <p className='text-xs text-muted-foreground'>
                                                            Start tunnel automatically when app
                                                            launches
                                                        </p>
                                                    </div>
                                                </label>
                                            )}
                                        />
                                        <form.Field
                                            name='restartOnDisconnect'
                                            children={(field) => (
                                                <label
                                                    htmlFor='forward-restartOnDisconnect'
                                                    className='flex items-center gap-3'>
                                                    <Checkbox
                                                        id='forward-restartOnDisconnect'
                                                        checked={field.state.value}
                                                        onCheckedChange={(checked) =>
                                                            field.handleChange(!!checked)
                                                        }
                                                    />
                                                    <div>
                                                        <p className='text-sm font-medium'>
                                                            Restart on Disconnect
                                                        </p>
                                                        <p className='text-xs text-muted-foreground'>
                                                            Automatically reconnect if SSH drops
                                                        </p>
                                                    </div>
                                                </label>
                                            )}
                                        />
                                        <form.Field
                                            name='gatewayPorts'
                                            children={(field) => (
                                                <label
                                                    htmlFor='forward-gatewayPorts'
                                                    className='flex items-center gap-3'>
                                                    <Checkbox
                                                        id='forward-gatewayPorts'
                                                        checked={field.state.value}
                                                        onCheckedChange={(checked) =>
                                                            field.handleChange(!!checked)
                                                        }
                                                    />
                                                    <div>
                                                        <p className='text-sm font-medium'>
                                                            Gateway Ports
                                                        </p>
                                                        <p className='text-xs text-muted-foreground'>
                                                            Allow remote hosts to connect to
                                                            forwarded ports (GatewayPorts yes)
                                                        </p>
                                                    </div>
                                                </label>
                                            )}
                                        />
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>

                        {/* SSH Command Preview */}
                        <div className='rounded-lg border bg-muted/50 p-4'>
                            <div className='mb-2 flex items-center justify-between'>
                                <div className='flex items-center gap-2'>
                                    <TerminalIcon className='size-4 text-muted-foreground' />
                                    <span className='text-sm font-medium'>SSH Command Preview</span>
                                </div>
                                <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon-sm'
                                    onClick={handleCopyCommand}>
                                    <CopyIcon className='size-3.5' />
                                    <span className='sr-only'>Copy command</span>
                                </Button>
                            </div>
                            <code className='block rounded bg-background p-2 font-mono text-xs break-all'>
                                {generateCommandPreview()}
                            </code>
                        </div>
                    </form>
                </CardContent>
                <CardFooter className='flex justify-end gap-2 border-t pt-6'>
                    <Button
                        type='button'
                        variant='outline'
                        onClick={() => void navigate({ to: '/port-forwarding' })}>
                        Cancel
                    </Button>
                    <Button type='submit' form='forward-form'>
                        {isEditing ? 'Save Changes' : 'Create Forward'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

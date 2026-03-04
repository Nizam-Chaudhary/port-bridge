import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { ChevronsUpDownIcon, SparklesIcon, ArrowLeftIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ForwardType, PortForward } from '@/lib/types';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
    const { hosts, addForward, updateForward } = useAppStore();
    const navigate = useNavigate();
    const isEditing = !!forward;
    const [presetOpen, setPresetOpen] = useState(false);

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
                updateForward(forward.id, value);
                toast.success(`Forward "${value.name}" updated`);
            } else {
                addForward(value);
                toast.success(`Forward "${value.name}" created`);
            }
            void navigate({ to: '/port-forwarding' });
        },
    });

    const [forwardType, setForwardType] = useState<ForwardType>(
        (forward?.type ?? 'local') as ForwardType,
    );

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
                                    <PopoverContent className='w-50 p-0' align='start'>
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
                                                                    preset.remoteHost,
                                                                );
                                                                form.setFieldValue(
                                                                    'remotePort',
                                                                    preset.remotePort,
                                                                );
                                                                form.setFieldValue('type', 'local');
                                                                setPresetOpen(false);
                                                            }}>
                                                            {preset.name}
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
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                aria-invalid={isInvalid}
                                                placeholder='postgres-prod'
                                                autoComplete='off'
                                            />
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
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            placeholder='Production PostgreSQL tunnel'
                                            autoComplete='off'
                                        />
                                        <FieldDescription>Optional description.</FieldDescription>
                                    </Field>
                                )}
                            />
                            <form.Field
                                name='hostId'
                                children={(field) => {
                                    const isInvalid =
                                        field.state.meta.isTouched && !field.state.meta.isValid;
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor='forward-host'>Host</FieldLabel>
                                            <Select
                                                name={field.name}
                                                value={field.state.value}
                                                onValueChange={(val) => {
                                                    if (val) field.handleChange(val);
                                                }}>
                                                <SelectTrigger
                                                    id='forward-host'
                                                    aria-invalid={isInvalid}>
                                                    <SelectValue placeholder='Select host' />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {hosts.map((host) => (
                                                        <SelectItem key={host.id} value={host.id}>
                                                            {host.name} ({host.hostname})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
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
                                                }
                                            }}>
                                            <SelectTrigger id='forward-type'>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value='local'>Local</SelectItem>
                                                <SelectItem value='remote'>Remote</SelectItem>
                                                <SelectItem value='dynamic'>Dynamic</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FieldDescription>
                                            {forwardType === 'local' &&
                                                'Forward a local port to a remote host.'}
                                            {forwardType === 'remote' &&
                                                'Forward a remote port to a local host.'}
                                            {forwardType === 'dynamic' &&
                                                'Create a SOCKS proxy on a local port.'}
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
                                                <Input
                                                    id='forward-localPort'
                                                    name={field.name}
                                                    type='number'
                                                    value={field.state.value || ''}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) =>
                                                        field.handleChange(Number(e.target.value))
                                                    }
                                                    aria-invalid={isInvalid}
                                                    placeholder='5432'
                                                />
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
                                                <Input
                                                    id='forward-remoteHost'
                                                    name={field.name}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) =>
                                                        field.handleChange(e.target.value)
                                                    }
                                                    placeholder='localhost'
                                                />
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
                                                    <Input
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
                                                    <Input
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
                                                <Input
                                                    id='forward-localHost'
                                                    name={field.name}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) =>
                                                        field.handleChange(e.target.value)
                                                    }
                                                    placeholder='localhost'
                                                />
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
                                                    <Input
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

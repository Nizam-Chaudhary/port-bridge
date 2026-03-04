import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import { toast } from 'sonner';

import type { Host } from '@/lib/types';

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
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
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldContent,
    FieldDescription,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/lib/store';

interface HostFormProps {
    host?: Host | null;
}

export function HostForm({ host }: HostFormProps) {
    const { addHost, updateHost } = useAppStore();
    const navigate = useNavigate();
    const isEditing = !!host;

    const form = useForm({
        defaultValues: {
            name: host?.name ?? '',
            hostname: host?.hostname ?? '',
            port: host?.port ?? 22,
            username: host?.username ?? '',
            authType: host?.authType ?? ('key' as const),
            identityFile: host?.identityFile ?? '',
            compression: host?.compression ?? false,
            connectTimeout: host?.connectTimeout ?? 30,
            keepAlive: host?.keepAlive ?? true,
        },

        onSubmit: async ({ value }) => {
            if (isEditing && host) {
                updateHost(host.id, value);
                toast.success(`Host "${value.name}" updated`);
            } else {
                addHost(value);
                toast.success(`Host "${value.name}" added`);
            }
            void navigate({ to: '/' });
        },
    });

    return (
        <div className='mx-auto w-full max-w-2xl'>
            <div className='mb-6'>
                <Button variant='ghost' size='sm' onClick={() => void navigate({ to: '/' })}>
                    <ArrowLeftIcon />
                    Back to Hosts
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{isEditing ? 'Edit Host' : 'Add Host'}</CardTitle>
                    <CardDescription>
                        {isEditing
                            ? 'Update the SSH host configuration.'
                            : 'Add a new SSH host to your configuration.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        id='host-form'
                        onSubmit={(e) => {
                            e.preventDefault();
                            void form.handleSubmit();
                        }}
                        className='space-y-6'>
                        {/* Basic Information */}
                        <div className='space-y-1'>
                            <h4 className='text-sm leading-none font-medium'>Basic Information</h4>
                            <p className='text-sm text-muted-foreground'>SSH connection details.</p>
                        </div>
                        <FieldGroup>
                            <form.Field
                                name='name'
                                children={(field) => {
                                    const isInvalid =
                                        field.state.meta.isTouched && !field.state.meta.isValid;
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>
                                                Connection Name
                                            </FieldLabel>
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                aria-invalid={isInvalid}
                                                placeholder='prod-server'
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
                                name='hostname'
                                children={(field) => {
                                    const isInvalid =
                                        field.state.meta.isTouched && !field.state.meta.isValid;
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>Hostname</FieldLabel>
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                aria-invalid={isInvalid}
                                                placeholder='10.0.0.5 or example.com'
                                                autoComplete='off'
                                            />
                                            {isInvalid && (
                                                <FieldError errors={field.state.meta.errors} />
                                            )}
                                        </Field>
                                    );
                                }}
                            />
                            <div className='grid grid-cols-2 gap-4'>
                                <form.Field
                                    name='port'
                                    children={(field) => {
                                        const isInvalid =
                                            field.state.meta.isTouched && !field.state.meta.isValid;
                                        return (
                                            <Field data-invalid={isInvalid}>
                                                <FieldLabel htmlFor={field.name}>Port</FieldLabel>
                                                <Input
                                                    id={field.name}
                                                    name={field.name}
                                                    type='number'
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) =>
                                                        field.handleChange(Number(e.target.value))
                                                    }
                                                    aria-invalid={isInvalid}
                                                    placeholder='22'
                                                />
                                                {isInvalid && (
                                                    <FieldError errors={field.state.meta.errors} />
                                                )}
                                            </Field>
                                        );
                                    }}
                                />
                                <form.Field
                                    name='username'
                                    children={(field) => {
                                        const isInvalid =
                                            field.state.meta.isTouched && !field.state.meta.isValid;
                                        return (
                                            <Field data-invalid={isInvalid}>
                                                <FieldLabel htmlFor={field.name}>
                                                    Username
                                                </FieldLabel>
                                                <Input
                                                    id={field.name}
                                                    name={field.name}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) =>
                                                        field.handleChange(e.target.value)
                                                    }
                                                    aria-invalid={isInvalid}
                                                    placeholder='ubuntu'
                                                    autoComplete='off'
                                                />
                                                {isInvalid && (
                                                    <FieldError errors={field.state.meta.errors} />
                                                )}
                                            </Field>
                                        );
                                    }}
                                />
                            </div>
                        </FieldGroup>

                        {/* Authentication */}
                        <div className='space-y-1'>
                            <h4 className='text-sm leading-none font-medium'>Authentication</h4>
                            <p className='text-sm text-muted-foreground'>
                                How to authenticate with the host.
                            </p>
                        </div>
                        <FieldGroup>
                            <form.Field
                                name='authType'
                                children={(field) => {
                                    const isInvalid =
                                        field.state.meta.isTouched && !field.state.meta.isValid;
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor='host-auth-type'>
                                                Authentication Type
                                            </FieldLabel>
                                            <Select
                                                name={field.name}
                                                value={field.state.value}
                                                onValueChange={(val) => {
                                                    if (val)
                                                        field.handleChange(
                                                            val as 'key' | 'password',
                                                        );
                                                }}>
                                                <SelectTrigger id='host-auth-type'>
                                                    <SelectValue placeholder='Select auth type' />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value='key'>SSH Key</SelectItem>
                                                    <SelectItem value='password'>
                                                        Password
                                                    </SelectItem>
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
                                name='identityFile'
                                children={(field) => {
                                    return (
                                        <Field>
                                            <FieldLabel htmlFor={field.name}>
                                                Identity File
                                            </FieldLabel>
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                placeholder='~/.ssh/id_rsa'
                                                autoComplete='off'
                                            />
                                            <FieldDescription>
                                                Path to your SSH private key file.
                                            </FieldDescription>
                                        </Field>
                                    );
                                }}
                            />
                        </FieldGroup>

                        {/* Advanced Settings */}
                        <Accordion>
                            <AccordionItem value='advanced'>
                                <AccordionTrigger className='text-sm font-medium'>
                                    Advanced Settings
                                </AccordionTrigger>
                                <AccordionContent className='pt-4'>
                                    <FieldGroup>
                                        <form.Field
                                            name='compression'
                                            children={(field) => (
                                                <Field orientation='horizontal'>
                                                    <FieldContent>
                                                        <FieldLabel htmlFor='host-compression'>
                                                            Compression
                                                        </FieldLabel>
                                                        <FieldDescription>
                                                            Enable SSH compression.
                                                        </FieldDescription>
                                                    </FieldContent>
                                                    <Switch
                                                        id='host-compression'
                                                        name={field.name}
                                                        checked={field.state.value}
                                                        onCheckedChange={field.handleChange}
                                                    />
                                                </Field>
                                            )}
                                        />
                                        <form.Field
                                            name='connectTimeout'
                                            children={(field) => {
                                                const isInvalid =
                                                    field.state.meta.isTouched &&
                                                    !field.state.meta.isValid;
                                                return (
                                                    <Field data-invalid={isInvalid}>
                                                        <FieldLabel htmlFor={field.name}>
                                                            Connect Timeout (seconds)
                                                        </FieldLabel>
                                                        <Input
                                                            id={field.name}
                                                            name={field.name}
                                                            type='number'
                                                            value={field.state.value}
                                                            onBlur={field.handleBlur}
                                                            onChange={(e) =>
                                                                field.handleChange(
                                                                    Number(e.target.value),
                                                                )
                                                            }
                                                            aria-invalid={isInvalid}
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
                                            name='keepAlive'
                                            children={(field) => (
                                                <Field orientation='horizontal'>
                                                    <FieldContent>
                                                        <FieldLabel htmlFor='host-keepalive'>
                                                            Keep Alive
                                                        </FieldLabel>
                                                        <FieldDescription>
                                                            Send keep-alive packets.
                                                        </FieldDescription>
                                                    </FieldContent>
                                                    <Switch
                                                        id='host-keepalive'
                                                        name={field.name}
                                                        checked={field.state.value}
                                                        onCheckedChange={field.handleChange}
                                                    />
                                                </Field>
                                            )}
                                        />
                                    </FieldGroup>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </form>
                </CardContent>
                <CardFooter className='flex justify-end gap-2 border-t pt-6'>
                    <Button
                        type='button'
                        variant='outline'
                        onClick={() => void navigate({ to: '/' })}>
                        Cancel
                    </Button>
                    <Button type='submit' form='host-form'>
                        {isEditing ? 'Save Changes' : 'Save Host'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

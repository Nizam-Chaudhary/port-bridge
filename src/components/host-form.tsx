import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from 'lucide-react';
import { toast } from 'sonner';

import type { Host } from '@/lib/types';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/store';

interface HostFormProps {
    host?: Host | null;
    redirectTo?: string;
}

export function HostForm({ host, redirectTo }: HostFormProps) {
    const { addHost, updateHost } = useAppStore();
    const navigate = useNavigate();
    const isEditing = !!host;

    const form = useForm({
        defaultValues: {
            name: host?.name ?? '',
            hostname: host?.hostname ?? '',
            port: host?.port ?? 22,
            username: host?.username ?? '',
            authType: host?.authType ?? 'key',
            password: host?.password ?? '',
            savePassword: host?.savePassword ?? false,
            identityFile: host?.identityFile ?? '',

            // Network
            proxyJump: host?.proxyJump ?? '',
            connectTimeout: host?.connectTimeout ?? 10,
            compression: host?.compression ?? false,
            keepAlive: host?.keepAlive ?? true,
            serverAliveInterval: host?.serverAliveInterval ?? 60,
            serverAliveCountMax: host?.serverAliveCountMax ?? 3,

            // Security
            strictHostKeyChecking: host?.strictHostKeyChecking ?? 'ask',
            forwardAgent: host?.forwardAgent ?? false,
            identitiesOnly: host?.identitiesOnly ?? false,

            // Terminal
            requestTTY: host?.requestTTY ?? false,
            terminalType: host?.terminalType ?? '',

            // Advanced / Custom
            customOptions: host?.customOptions ?? [],

            // Port Forwards specific to this host (to be mapped back globally on save depending on the store, but we handle it together here)
            forwards:
                host?.forwards?.map((f) => ({
                    name: f.name,
                    description: f.description ?? '',
                    hostId: f.hostId,
                    type: f.type,
                    localPort: f.localPort,
                    remoteHost: f.remoteHost ?? '',
                    remotePort: f.remotePort ?? 0,
                    localHost: f.localHost ?? '',
                })) ?? [],
        },

        onSubmit: async ({ value }) => {
            const castValue = value as unknown as Omit<Host, 'id' | 'status'>;
            if (isEditing && host) {
                // we treat forwards as part of the host object when updating the store
                // the store might extract it globally if needed, or we just save it as part of host
                updateHost(host.id, castValue);
                toast.success(`Host "${value.name}" updated`);
            } else {
                addHost(castValue);
                toast.success(`Host "${value.name}" added`);
            }
            void navigate({ to: redirectTo ?? '/' });
        },
    });

    return (
        <div className='mx-auto w-full max-w-4xl'>
            <div className='mb-6'>
                <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => void navigate({ to: redirectTo ?? '/' })}>
                    <ArrowLeftIcon className='mr-2 h-4 w-4' />
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
                        <Tabs defaultValue='basic' className='w-full'>
                            <TabsList className='grid w-full grid-cols-5'>
                                <TabsTrigger value='basic'>Basic</TabsTrigger>
                                <TabsTrigger value='network'>Network</TabsTrigger>
                                <TabsTrigger value='forwards'>Port Forwards</TabsTrigger>
                                <TabsTrigger value='security'>Security</TabsTrigger>
                                <TabsTrigger value='advanced'>Advanced</TabsTrigger>
                            </TabsList>

                            {/* Section 1: Basic Information */}
                            <TabsContent value='basic' className='space-y-6 pt-4'>
                                <FieldGroup>
                                    <form.Field
                                        name='name'
                                        children={(field) => (
                                            <Field
                                                data-invalid={
                                                    field.state.meta.isTouched &&
                                                    !field.state.meta.isValid
                                                }>
                                                <FieldLabel htmlFor={field.name}>
                                                    Connection Name (Alias)
                                                </FieldLabel>
                                                <Input
                                                    id={field.name}
                                                    name={field.name}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) =>
                                                        field.handleChange(e.target.value)
                                                    }
                                                    placeholder='prod-server'
                                                />
                                                {field.state.meta.isTouched &&
                                                    !field.state.meta.isValid && (
                                                        <FieldError
                                                            errors={field.state.meta.errors}
                                                        />
                                                    )}
                                            </Field>
                                        )}
                                    />

                                    <div className='grid grid-cols-2 gap-4'>
                                        <form.Field
                                            name='hostname'
                                            children={(field) => (
                                                <Field
                                                    data-invalid={
                                                        field.state.meta.isTouched &&
                                                        !field.state.meta.isValid
                                                    }>
                                                    <FieldLabel htmlFor={field.name}>
                                                        Hostname / IP
                                                    </FieldLabel>
                                                    <Input
                                                        id={field.name}
                                                        name={field.name}
                                                        value={field.state.value}
                                                        onBlur={field.handleBlur}
                                                        onChange={(e) =>
                                                            field.handleChange(e.target.value)
                                                        }
                                                        placeholder='10.0.0.5 or example.com'
                                                    />
                                                </Field>
                                            )}
                                        />
                                        <form.Field
                                            name='port'
                                            children={(field) => (
                                                <Field>
                                                    <FieldLabel htmlFor={field.name}>
                                                        Port
                                                    </FieldLabel>
                                                    <Input
                                                        id={field.name}
                                                        type='number'
                                                        value={field.state.value}
                                                        onChange={(e) =>
                                                            field.handleChange(
                                                                Number(e.target.value),
                                                            )
                                                        }
                                                        placeholder='22'
                                                    />
                                                </Field>
                                            )}
                                        />
                                    </div>

                                    <form.Field
                                        name='username'
                                        children={(field) => (
                                            <Field>
                                                <FieldLabel htmlFor={field.name}>
                                                    Username
                                                </FieldLabel>
                                                <Input
                                                    id={field.name}
                                                    value={field.state.value}
                                                    onChange={(e) =>
                                                        field.handleChange(e.target.value)
                                                    }
                                                    placeholder='ubuntu'
                                                />
                                            </Field>
                                        )}
                                    />

                                    <div className='grid grid-cols-2 gap-4'>
                                        <form.Field
                                            name='authType'
                                            children={(field) => (
                                                <Field>
                                                    <FieldLabel htmlFor='host-auth-type'>
                                                        Authentication Type
                                                    </FieldLabel>
                                                    <Select
                                                        value={field.state.value}
                                                        onValueChange={(val: any) =>
                                                            field.handleChange(val)
                                                        }>
                                                        <SelectTrigger id='host-auth-type'>
                                                            <SelectValue placeholder='Select auth type' />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value='key'>
                                                                SSH Key
                                                            </SelectItem>
                                                            <SelectItem value='password'>
                                                                Password
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </Field>
                                            )}
                                        />

                                        <form.Subscribe
                                            selector={(state) => state.values.authType}
                                            children={(authType) =>
                                                authType === 'key' ? (
                                                    <form.Field
                                                        name='identityFile'
                                                        children={(field) => (
                                                            <Field>
                                                                <FieldLabel htmlFor={field.name}>
                                                                    Identity File (optional)
                                                                </FieldLabel>
                                                                <Input
                                                                    id={field.name}
                                                                    value={field.state.value}
                                                                    onChange={(e) =>
                                                                        field.handleChange(
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                    placeholder='~/.ssh/id_rsa'
                                                                />
                                                            </Field>
                                                        )}
                                                    />
                                                ) : (
                                                    <div className='flex flex-col gap-4'>
                                                        <form.Subscribe
                                                            selector={(state) =>
                                                                state.values.savePassword
                                                            }
                                                            children={(savePassword) =>
                                                                savePassword ? (
                                                                    <form.Field
                                                                        name='password'
                                                                        children={(field) => (
                                                                            <Field>
                                                                                <FieldLabel
                                                                                    htmlFor={
                                                                                        field.name
                                                                                    }>
                                                                                    Password
                                                                                </FieldLabel>
                                                                                <Input
                                                                                    id={field.name}
                                                                                    type='password'
                                                                                    value={
                                                                                        field.state
                                                                                            .value
                                                                                    }
                                                                                    onChange={(e) =>
                                                                                        field.handleChange(
                                                                                            e.target
                                                                                                .value,
                                                                                        )
                                                                                    }
                                                                                    placeholder='Enter your password'
                                                                                />
                                                                            </Field>
                                                                        )}
                                                                    />
                                                                ) : (
                                                                    <div className='flex items-center text-sm text-muted-foreground'>
                                                                        Password will be prompted on
                                                                        connect.
                                                                    </div>
                                                                )
                                                            }
                                                        />
                                                        <form.Field
                                                            name='savePassword'
                                                            children={(field) => (
                                                                <Field orientation='horizontal'>
                                                                    <FieldContent>
                                                                        <FieldLabel htmlFor='save-password'>
                                                                            Save Password
                                                                        </FieldLabel>
                                                                    </FieldContent>
                                                                    <Switch
                                                                        id='save-password'
                                                                        checked={field.state.value}
                                                                        onCheckedChange={
                                                                            field.handleChange
                                                                        }
                                                                    />
                                                                </Field>
                                                            )}
                                                        />
                                                    </div>
                                                )
                                            }
                                        />
                                    </div>
                                </FieldGroup>
                            </TabsContent>

                            {/* Section 2: Network */}
                            <TabsContent value='network' className='space-y-6 pt-4'>
                                <FieldGroup>
                                    <form.Field
                                        name='proxyJump'
                                        children={(field) => (
                                            <Field>
                                                <FieldLabel htmlFor={field.name}>
                                                    Proxy Jump (Bastion)
                                                </FieldLabel>
                                                <Input
                                                    id={field.name}
                                                    value={field.state.value}
                                                    onChange={(e) =>
                                                        field.handleChange(e.target.value)
                                                    }
                                                    placeholder='bastion-host'
                                                />
                                                <FieldDescription>
                                                    Pass another host's connection alias to jump
                                                    through it.
                                                </FieldDescription>
                                            </Field>
                                        )}
                                    />

                                    <div className='grid grid-cols-2 gap-4'>
                                        <form.Field
                                            name='connectTimeout'
                                            children={(field) => (
                                                <Field>
                                                    <FieldLabel htmlFor={field.name}>
                                                        Connect Timeout (s)
                                                    </FieldLabel>
                                                    <Input
                                                        id={field.name}
                                                        type='number'
                                                        value={field.state.value}
                                                        onChange={(e) =>
                                                            field.handleChange(
                                                                Number(e.target.value),
                                                            )
                                                        }
                                                    />
                                                </Field>
                                            )}
                                        />

                                        <form.Field
                                            name='compression'
                                            children={(field) => (
                                                <Field orientation='horizontal' className='pt-8'>
                                                    <FieldContent>
                                                        <FieldLabel htmlFor='host-compression'>
                                                            Compression
                                                        </FieldLabel>
                                                    </FieldContent>
                                                    <Switch
                                                        id='host-compression'
                                                        checked={field.state.value}
                                                        onCheckedChange={field.handleChange}
                                                    />
                                                </Field>
                                            )}
                                        />
                                    </div>

                                    <div className='border-t pt-4'>
                                        <form.Field
                                            name='keepAlive'
                                            children={(field) => (
                                                <Field orientation='horizontal' className='mb-4'>
                                                    <FieldContent>
                                                        <FieldLabel htmlFor='host-keepalive'>
                                                            Enable Keep Alive
                                                        </FieldLabel>
                                                        <FieldDescription>
                                                            Send packets to avoid connection drops
                                                        </FieldDescription>
                                                    </FieldContent>
                                                    <Switch
                                                        id='host-keepalive'
                                                        checked={field.state.value}
                                                        onCheckedChange={field.handleChange}
                                                    />
                                                </Field>
                                            )}
                                        />

                                        <form.Subscribe
                                            selector={(state) => state.values.keepAlive}
                                            children={(keepAlive) =>
                                                keepAlive && (
                                                    <div className='mt-4 grid grid-cols-2 gap-4'>
                                                        <form.Field
                                                            name='serverAliveInterval'
                                                            children={(field) => (
                                                                <Field>
                                                                    <FieldLabel
                                                                        htmlFor={field.name}>
                                                                        Alive Interval (s)
                                                                    </FieldLabel>
                                                                    <Input
                                                                        type='number'
                                                                        value={field.state.value}
                                                                        onChange={(e) =>
                                                                            field.handleChange(
                                                                                Number(
                                                                                    e.target.value,
                                                                                ),
                                                                            )
                                                                        }
                                                                    />
                                                                </Field>
                                                            )}
                                                        />
                                                        <form.Field
                                                            name='serverAliveCountMax'
                                                            children={(field) => (
                                                                <Field>
                                                                    <FieldLabel
                                                                        htmlFor={field.name}>
                                                                        Max Alive Count
                                                                    </FieldLabel>
                                                                    <Input
                                                                        type='number'
                                                                        value={field.state.value}
                                                                        onChange={(e) =>
                                                                            field.handleChange(
                                                                                Number(
                                                                                    e.target.value,
                                                                                ),
                                                                            )
                                                                        }
                                                                    />
                                                                </Field>
                                                            )}
                                                        />
                                                    </div>
                                                )
                                            }
                                        />
                                    </div>
                                </FieldGroup>
                            </TabsContent>

                            {/* Section 3: Port Forwarding */}
                            <TabsContent value='forwards' className='space-y-6 pt-4'>
                                <form.Field
                                    name='forwards'
                                    mode='array'
                                    children={(field) => (
                                        <div className='space-y-4'>
                                            {field.state.value.map((_, i) => (
                                                <Card key={i} className='relative px-4 pt-4 pb-2'>
                                                    <Button
                                                        type='button'
                                                        variant='ghost'
                                                        size='icon'
                                                        className='absolute top-2 right-2 text-destructive'
                                                        onClick={() => field.removeValue(i)}>
                                                        <TrashIcon className='h-4 w-4' />
                                                    </Button>

                                                    <div className='grid grid-cols-12 items-end gap-3'>
                                                        <form.Field
                                                            name={`forwards[${i}].name`}
                                                            children={(subField) => (
                                                                <Field className='col-span-3'>
                                                                    <FieldLabel>Name</FieldLabel>
                                                                    <Input
                                                                        value={subField.state.value}
                                                                        onChange={(e) =>
                                                                            subField.handleChange(
                                                                                e.target.value,
                                                                            )
                                                                        }
                                                                        placeholder='postgres'
                                                                    />
                                                                </Field>
                                                            )}
                                                        />

                                                        <form.Field
                                                            name={`forwards[${i}].type`}
                                                            children={(subField) => (
                                                                <Field className='col-span-3'>
                                                                    <FieldLabel>Type</FieldLabel>
                                                                    <Select
                                                                        value={subField.state.value}
                                                                        onValueChange={(v: any) =>
                                                                            subField.handleChange(v)
                                                                        }>
                                                                        <SelectTrigger>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value='local'>
                                                                                Local
                                                                            </SelectItem>
                                                                            <SelectItem value='remote'>
                                                                                Remote
                                                                            </SelectItem>
                                                                            <SelectItem value='dynamic'>
                                                                                Dynamic
                                                                            </SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </Field>
                                                            )}
                                                        />

                                                        <form.Field
                                                            name={`forwards[${i}].localPort`}
                                                            children={(subField) => (
                                                                <Field className='col-span-2'>
                                                                    <FieldLabel>
                                                                        Local Port
                                                                    </FieldLabel>
                                                                    <Input
                                                                        type='number'
                                                                        value={subField.state.value}
                                                                        onChange={(e) =>
                                                                            subField.handleChange(
                                                                                Number(
                                                                                    e.target.value,
                                                                                ),
                                                                            )
                                                                        }
                                                                    />
                                                                </Field>
                                                            )}
                                                        />

                                                        {/* Hide remote fields if dynamic */}
                                                        <form.Subscribe
                                                            selector={(s) =>
                                                                s.values.forwards[i]?.type
                                                            }
                                                            children={(type) =>
                                                                type !== 'dynamic' && (
                                                                    <>
                                                                        <form.Field
                                                                            name={`forwards[${i}].remoteHost`}
                                                                            children={(
                                                                                subField,
                                                                            ) => (
                                                                                <Field className='col-span-2'>
                                                                                    <FieldLabel>
                                                                                        Dest Host
                                                                                    </FieldLabel>
                                                                                    <Input
                                                                                        value={
                                                                                            subField
                                                                                                .state
                                                                                                .value ||
                                                                                            ''
                                                                                        }
                                                                                        onChange={(
                                                                                            e,
                                                                                        ) =>
                                                                                            subField.handleChange(
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                            )
                                                                                        }
                                                                                        placeholder='localhost'
                                                                                    />
                                                                                </Field>
                                                                            )}
                                                                        />
                                                                        <form.Field
                                                                            name={`forwards[${i}].remotePort`}
                                                                            children={(
                                                                                subField,
                                                                            ) => (
                                                                                <Field className='col-span-2'>
                                                                                    <FieldLabel>
                                                                                        Dest Port
                                                                                    </FieldLabel>
                                                                                    <Input
                                                                                        type='number'
                                                                                        value={
                                                                                            subField
                                                                                                .state
                                                                                                .value ||
                                                                                            ''
                                                                                        }
                                                                                        onChange={(
                                                                                            e,
                                                                                        ) =>
                                                                                            subField.handleChange(
                                                                                                Number(
                                                                                                    e
                                                                                                        .target
                                                                                                        .value,
                                                                                                ),
                                                                                            )
                                                                                        }
                                                                                        placeholder='5432'
                                                                                    />
                                                                                </Field>
                                                                            )}
                                                                        />
                                                                    </>
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </Card>
                                            ))}

                                            <Button
                                                type='button'
                                                variant='outline'
                                                className='w-full'
                                                onClick={() =>
                                                    field.pushValue({
                                                        name: '',
                                                        description: '',
                                                        hostId: host?.id ?? crypto.randomUUID(),
                                                        type: 'local',
                                                        localPort: 8080,
                                                        remoteHost: '',
                                                        remotePort: 0,
                                                        localHost: '',
                                                    })
                                                }>
                                                <PlusIcon className='mr-2 h-4 w-4' />
                                                Add Port Forward
                                            </Button>
                                        </div>
                                    )}
                                />
                            </TabsContent>

                            {/* Section 4: Security */}
                            <TabsContent value='security' className='space-y-6 pt-4'>
                                <FieldGroup>
                                    <form.Field
                                        name='strictHostKeyChecking'
                                        children={(field) => (
                                            <Field>
                                                <FieldLabel>Strict Host Key Checking</FieldLabel>
                                                <Select
                                                    value={field.state.value}
                                                    onValueChange={(v: any) =>
                                                        field.handleChange(v)
                                                    }>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value='ask'>Ask</SelectItem>
                                                        <SelectItem value='yes'>
                                                            Yes (Strict)
                                                        </SelectItem>
                                                        <SelectItem value='no'>No</SelectItem>
                                                        <SelectItem value='accept-new'>
                                                            Accept New
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </Field>
                                        )}
                                    />

                                    <form.Field
                                        name='forwardAgent'
                                        children={(field) => (
                                            <Field orientation='horizontal'>
                                                <FieldContent>
                                                    <FieldLabel>Forward SSH Agent</FieldLabel>
                                                    <FieldDescription>
                                                        Allow remote host to securely use local SSH
                                                        keys
                                                    </FieldDescription>
                                                </FieldContent>
                                                <Switch
                                                    checked={field.state.value}
                                                    onCheckedChange={field.handleChange}
                                                />
                                            </Field>
                                        )}
                                    />

                                    <form.Field
                                        name='identitiesOnly'
                                        children={(field) => (
                                            <Field orientation='horizontal'>
                                                <FieldContent>
                                                    <FieldLabel>Identities Only</FieldLabel>
                                                    <FieldDescription>
                                                        Only use explicitly configured identity
                                                        files
                                                    </FieldDescription>
                                                </FieldContent>
                                                <Switch
                                                    checked={field.state.value}
                                                    onCheckedChange={field.handleChange}
                                                />
                                            </Field>
                                        )}
                                    />
                                </FieldGroup>
                            </TabsContent>

                            {/* Section 5: Advanced */}
                            <TabsContent value='advanced' className='space-y-6 pt-4'>
                                <FieldGroup>
                                    <div className='grid grid-cols-2 gap-4 border-b pb-6'>
                                        <form.Field
                                            name='requestTTY'
                                            children={(field) => (
                                                <Field orientation='horizontal'>
                                                    <FieldContent>
                                                        <FieldLabel>Request TTY</FieldLabel>
                                                        <FieldDescription>
                                                            Allocate pseudo-terminal
                                                        </FieldDescription>
                                                    </FieldContent>
                                                    <Switch
                                                        checked={field.state.value}
                                                        onCheckedChange={field.handleChange}
                                                    />
                                                </Field>
                                            )}
                                        />
                                        <form.Field
                                            name='terminalType'
                                            children={(field) => (
                                                <Field>
                                                    <FieldLabel>
                                                        Terminal Type (optional)
                                                    </FieldLabel>
                                                    <Input
                                                        value={field.state.value ?? ''}
                                                        onChange={(e) =>
                                                            field.handleChange(e.target.value)
                                                        }
                                                        placeholder='xterm-256color'
                                                    />
                                                </Field>
                                            )}
                                        />
                                    </div>

                                    <div className='pt-2'>
                                        <h4 className='mb-4 text-sm font-medium'>
                                            Custom SSH Options
                                        </h4>
                                        <form.Field
                                            name='customOptions'
                                            mode='array'
                                            children={(field) => (
                                                <div className='space-y-3'>
                                                    {field.state.value.map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className='flex items-center gap-3'>
                                                            <form.Field
                                                                name={`customOptions[${i}].key`}
                                                                children={(subField) => (
                                                                    <Input
                                                                        className='flex-1'
                                                                        value={subField.state.value}
                                                                        onChange={(e) =>
                                                                            subField.handleChange(
                                                                                e.target.value,
                                                                            )
                                                                        }
                                                                        placeholder='Option Name'
                                                                    />
                                                                )}
                                                            />
                                                            <form.Field
                                                                name={`customOptions[${i}].value`}
                                                                children={(subField) => (
                                                                    <Input
                                                                        className='flex-1'
                                                                        value={subField.state.value}
                                                                        onChange={(e) =>
                                                                            subField.handleChange(
                                                                                e.target.value,
                                                                            )
                                                                        }
                                                                        placeholder='Value'
                                                                    />
                                                                )}
                                                            />
                                                            <Button
                                                                type='button'
                                                                variant='ghost'
                                                                size='icon'
                                                                className='shrink-0 text-destructive'
                                                                onClick={() =>
                                                                    field.removeValue(i)
                                                                }>
                                                                <TrashIcon className='h-4 w-4' />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    <Button
                                                        type='button'
                                                        variant='secondary'
                                                        size='sm'
                                                        onClick={() =>
                                                            field.pushValue({ key: '', value: '' })
                                                        }>
                                                        <PlusIcon className='mr-2 h-4 w-4' />
                                                        Add Custom Option
                                                    </Button>
                                                </div>
                                            )}
                                        />
                                    </div>
                                </FieldGroup>
                            </TabsContent>
                        </Tabs>
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

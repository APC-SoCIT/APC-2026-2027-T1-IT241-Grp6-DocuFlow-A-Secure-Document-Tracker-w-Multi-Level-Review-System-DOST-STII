import FieldError from '@/Components/FieldError';
import { Button, buttonVariants } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import GuestLayout from '@/Layouts/GuestLayout';
import { cn } from '@/lib/utils';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Log in" />

            <h1 className="mb-6 text-xl font-medium text-ink">Log in</h1>

            {status && (
                <div className="mb-4 rounded-md bg-stamp-green-bg px-4 py-3 text-sm font-medium text-stamp-green">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        autoComplete="username"
                        autoFocus
                        onChange={(e) => setData('email', e.target.value)}
                        aria-invalid={!!errors.email}
                    />
                    <FieldError message={errors.email} />
                </div>

                <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                        aria-invalid={!!errors.password}
                    />
                    <FieldError message={errors.password} />
                </div>

                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        name="remember"
                        checked={data.remember}
                        onChange={(e) => setData('remember', e.target.checked)}
                        className="rounded border-border text-dost-blue focus:ring-dost-blue"
                    />
                    <span className="text-sm text-ink-muted">Remember me</span>
                </label>

                <div className="flex items-center justify-between gap-4 pt-2">
                    {canResetPassword ? (
                        <Link
                            href={route('password.request')}
                            className={cn(buttonVariants({ variant: 'text' }), 'px-0')}
                        >
                            Forgot your password?
                        </Link>
                    ) : (
                        <span />
                    )}

                    <Button type="submit" disabled={processing}>
                        Log in
                    </Button>
                </div>
            </form>
        </GuestLayout>
    );
}

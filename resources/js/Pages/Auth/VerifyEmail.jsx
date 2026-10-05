import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Loader2Icon } from 'lucide-react';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    const submit = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Email Verification" />

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Verify your email</CardTitle>
                    <CardDescription>
                        Thanks for signing up! Before getting started, could you verify your email
                        address by clicking on the link we just emailed to you? If you didn't
                        receive the email, we will gladly send you another.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    {status === 'verification-link-sent' && (
                        <Alert>
                            <AlertDescription>
                                A new verification link has been sent to the email address you
                                provided during registration.
                            </AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={submit} className="flex items-center justify-between gap-3">
                        <Button type="submit" disabled={processing}>
                            {processing && <Loader2Icon className="animate-spin" aria-hidden="true" />}
                            Resend Verification Email
                        </Button>

                        <Button variant="ghost" asChild>
                            <Link href={route('logout')} method="post" as="button">
                                Log Out
                            </Link>
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}

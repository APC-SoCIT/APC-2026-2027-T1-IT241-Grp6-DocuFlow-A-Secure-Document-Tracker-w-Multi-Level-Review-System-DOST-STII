import { FileTextIcon } from 'lucide-react';

export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted px-4 py-12">
            <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <FileTextIcon className="size-4" aria-hidden="true" />
                </div>
                <span className="font-heading text-xl font-semibold">DocuFlow</span>
            </div>

            <div className="w-full max-w-sm">{children}</div>
        </div>
    );
}

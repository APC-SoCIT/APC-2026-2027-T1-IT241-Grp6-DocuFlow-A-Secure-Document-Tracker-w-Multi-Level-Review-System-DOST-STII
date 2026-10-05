import { Button } from '@/Components/ui/button';
import { Loader2Icon } from 'lucide-react';

/**
 * Form submit button that shows what's happening while the request runs,
 * including the upload percentage when a file is being sent.
 */
export default function SubmitButton({ processing, progress, busyLabel, children }) {
    const percentage = progress?.percentage;

    return (
        <Button type="submit" disabled={processing}>
            {processing && <Loader2Icon className="animate-spin" aria-hidden="true" />}
            {!processing
                ? children
                : percentage !== undefined && percentage < 100
                  ? `Uploading ${percentage}%`
                  : busyLabel}
        </Button>
    );
}

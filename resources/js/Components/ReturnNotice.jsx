import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert';
import { formatDateTime } from '@/lib/format';
import { Undo2Icon } from 'lucide-react';

/**
 * The latest return: who returned it, at which level, when, and the remarks
 * the Document Source has to act on. Shown on the detail and resubmit pages.
 */
export default function ReturnNotice({ lastReturn }) {
    return (
        <Alert className="border-status-returned/20 bg-status-returned-bg/50 px-4 py-3">
            <Undo2Icon aria-hidden="true" className="text-status-returned" />
            <AlertTitle className="text-[13px] text-status-returned">
                Returned by {lastReturn.reviewer} at Level {lastReturn.review_level}
            </AlertTitle>
            <AlertDescription className="text-[13px] text-foreground">
                <p className="mb-1! text-xs text-muted-foreground">{formatDateTime(lastReturn.returned_at)}</p>
                <p className="whitespace-pre-line">{lastReturn.remarks || 'No remarks were given.'}</p>
            </AlertDescription>
        </Alert>
    );
}

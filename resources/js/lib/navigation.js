import { router } from '@inertiajs/react';

// How many in-app pages sit behind the current one in the browser history,
// so a Back button can use the history only when it stays inside the app.
let depth = -1; // the first navigate event is the landing page
let poppedState = false;

if (typeof window !== 'undefined') {
    window.addEventListener('popstate', () => {
        poppedState = true;
    });

    router.on('navigate', () => {
        if (depth < 0) {
            depth = 0;
        } else if (poppedState) {
            depth = Math.max(0, depth - 1);
        } else {
            depth += 1;
        }
        poppedState = false;
    });
}

/**
 * Go back to the previous page in the app, or to `fallback` when the person
 * landed here directly (e.g. from a bookmark or a fresh login).
 */
export function goBack(fallback) {
    if (depth > 0) {
        window.history.back();
    } else {
        router.visit(fallback);
    }
}

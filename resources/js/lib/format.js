export function formatDateTime(value) {
    return new Date(value).toLocaleString('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

export function formatDate(value) {
    return new Date(value).toLocaleDateString('en-PH', { dateStyle: 'medium' });
}

export function formatTime(value) {
    return new Date(value).toLocaleTimeString('en-PH', { timeStyle: 'short' });
}

const RELATIVE_UNITS = [
    ['year', 365 * 24 * 3600],
    ['month', 30 * 24 * 3600],
    ['week', 7 * 24 * 3600],
    ['day', 24 * 3600],
    ['hour', 3600],
    ['minute', 60],
];

// "3 days ago", "in 2 hours", "just now".
export function formatRelative(value) {
    const seconds = (new Date(value).getTime() - Date.now()) / 1000;
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    for (const [unit, size] of RELATIVE_UNITS) {
        if (Math.abs(seconds) >= size) {
            return rtf.format(Math.round(seconds / size), unit);
        }
    }
    return 'just now';
}

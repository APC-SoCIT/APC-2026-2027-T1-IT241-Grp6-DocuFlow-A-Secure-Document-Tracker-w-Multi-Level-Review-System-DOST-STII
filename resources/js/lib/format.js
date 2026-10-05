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

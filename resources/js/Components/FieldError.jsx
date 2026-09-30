export default function FieldError({ message }) {
    if (!message) {
        return null;
    }

    return <p className="mt-1.5 text-sm text-stamp-rust">{message}</p>;
}

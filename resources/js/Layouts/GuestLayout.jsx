export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-12 text-ink">
            <div className="mb-8 flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-[32px] text-dost-blue">
                    description
                </span>
                <span className="text-2xl font-bold">DocuFlow</span>
            </div>

            <div className="w-full max-w-md rounded-lg border border-border bg-white p-8">
                {children}
            </div>
        </div>
    );
}

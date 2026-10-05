<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    /**
     * The signed-in account's in-system notifications, newest first.
     */
    public function index(Request $request): Response
    {
        $notifications = $request->user()->notifications()
            ->with('document:id,reference_number')
            ->latest('id')
            ->limit(100)
            ->get();

        return Inertia::render('Notifications/Index', [
            'notifications' => $notifications->map(fn (Notification $n) => $this->row($n)),
        ]);
    }

    /**
     * The latest few notifications and the unread count, for the bell's
     * popover in the top bar.
     */
    public function recent(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'unread' => $user->notifications()->where('is_read', false)->count(),
            'notifications' => $user->notifications()
                ->with('document:id,reference_number')
                ->latest('id')
                ->limit(6)
                ->get()
                ->map(fn (Notification $n) => $this->row($n)),
        ]);
    }

    /**
     * Mark one notification read and open its document.
     */
    public function read(Request $request, Notification $notification): RedirectResponse
    {
        if ($notification->user_id !== $request->user()->id) {
            $this->deny('That notification belongs to another account.');
        }

        $notification->update(['is_read' => true]);

        return $notification->document_id
            ? redirect()->route('documents.show', $notification->document_id)
            : redirect()->route('notifications.index');
    }

    public function readAll(Request $request): RedirectResponse
    {
        $request->user()->notifications()->where('is_read', false)->update(['is_read' => true]);

        // Back to wherever it was clicked: the Notifications page or the bell's popover.
        return redirect()->back(fallback: route('notifications.index'));
    }

    /**
     * @return array<string, mixed>
     */
    private function row(Notification $notification): array
    {
        return [
            'id' => $notification->id,
            'message' => $notification->message,
            'is_read' => $notification->is_read,
            'created_at' => $notification->created_at,
            'reference_number' => $notification->document?->reference_number,
        ];
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Notification;
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
            'notifications' => $notifications->map(fn (Notification $n) => [
                'id' => $n->id,
                'message' => $n->message,
                'is_read' => $n->is_read,
                'created_at' => $n->created_at,
                'reference_number' => $n->document?->reference_number,
            ]),
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

        return redirect()->route('notifications.index');
    }
}

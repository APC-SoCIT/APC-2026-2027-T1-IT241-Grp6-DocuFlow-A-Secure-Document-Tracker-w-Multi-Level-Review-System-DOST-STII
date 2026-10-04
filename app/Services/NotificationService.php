<?php

namespace App\Services;

use App\Models\Document;
use App\Models\Notification;

/**
 * In-system notifications only: the prototype sends no email.
 */
class NotificationService
{
    public function notify(int $userId, Document $document, string $message): Notification
    {
        return $document->notifications()->create([
            'user_id' => $userId,
            'message' => $message,
        ]);
    }
}

<?php

use App\Http\Controllers\DocumentController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\SubmissionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Guests are sent to login by the auth middleware; signed-in users to their home screen.
Route::redirect('/', '/dashboard');

// Login lands here; send each role to its home screen.
Route::get('/dashboard', function (Request $request) {
    return redirect()->route($request->user()->homeRoute());
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/documents', [DocumentController::class, 'index'])
        ->name('documents.index');
    Route::get('/documents/search', [DocumentController::class, 'search'])
        ->name('documents.search');
    Route::get('/documents/create', [SubmissionController::class, 'create'])
        ->name('documents.create');
    Route::post('/documents', [SubmissionController::class, 'store'])
        ->name('documents.store');
    Route::get('/documents/{document}', [DocumentController::class, 'show'])
        ->name('documents.show');
    Route::get('/documents/{document}/file', [DocumentController::class, 'file'])
        ->name('documents.file');
    Route::post('/documents/{document}/reviews', [ReviewController::class, 'store'])
        ->name('reviews.store');
    Route::get('/documents/{document}/resubmit', [SubmissionController::class, 'editResubmission'])
        ->name('documents.resubmit.edit');
    Route::post('/documents/{document}/resubmit', [SubmissionController::class, 'resubmit'])
        ->name('documents.resubmit');
    Route::get('/review-queue', [DocumentController::class, 'reviewQueue'])
        ->name('reviews.index');
    Route::get('/notifications', [NotificationController::class, 'index'])
        ->name('notifications.index');
    Route::post('/notifications/read-all', [NotificationController::class, 'readAll'])
        ->name('notifications.read-all');
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'read'])
        ->name('notifications.read');
});

require __DIR__.'/auth.php';

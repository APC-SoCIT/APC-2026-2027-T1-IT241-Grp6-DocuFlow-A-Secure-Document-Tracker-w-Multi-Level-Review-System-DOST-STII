<?php

use App\Http\Controllers\DocumentController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReviewController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Guests are sent to login by the auth middleware; signed-in users to their home screen.
Route::redirect('/', '/dashboard');

// Login lands here; send each role to its home screen.
Route::get('/dashboard', function (Request $request) {
    return $request->user()->role === User::ROLE_DOCUMENT_SOURCE
        ? redirect()->route('documents.index')
        : redirect()->route('reviews.index');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/documents', [DocumentController::class, 'index'])
        ->name('documents.index');
    Route::get('/documents/create', [DocumentController::class, 'create'])
        ->name('documents.create');
    Route::post('/documents', [DocumentController::class, 'store'])
        ->name('documents.store');
    Route::get('/documents/{document}', [DocumentController::class, 'show'])
        ->name('documents.show');
    Route::get('/documents/{document}/file', [DocumentController::class, 'file'])
        ->name('documents.file');
    Route::post('/documents/{document}/reviews', [ReviewController::class, 'store'])
        ->name('reviews.store');
    Route::get('/documents/{document}/resubmit', [DocumentController::class, 'editResubmission'])
        ->name('documents.resubmit.edit');
    Route::post('/documents/{document}/resubmit', [DocumentController::class, 'resubmit'])
        ->name('documents.resubmit');
    Route::get('/review-queue', [DocumentController::class, 'reviewQueue'])
        ->name('reviews.index');
    // Placeholder until Day 9.
    Route::get('/notifications', fn () => Inertia::render('Placeholder', ['title' => 'Notifications']))
        ->name('notifications.index');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';

<?php

use App\Http\Controllers\ProfileController;
use App\Models\User;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// Login lands here; send each role to its home screen.
Route::get('/dashboard', function (Request $request) {
    return $request->user()->role === User::ROLE_DOCUMENT_SOURCE
        ? redirect()->route('documents.index')
        : redirect()->route('reviews.index');
})->middleware(['auth', 'verified'])->name('dashboard');

// Placeholders until each screen is built (Days 2, 5 and 9).
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/documents', fn () => Inertia::render('Placeholder', ['title' => 'My documents']))
        ->name('documents.index');
    Route::get('/documents/create', fn () => Inertia::render('Placeholder', ['title' => 'Submit document']))
        ->name('documents.create');
    Route::get('/review-queue', fn () => Inertia::render('Placeholder', ['title' => 'Review queue']))
        ->name('reviews.index');
    Route::get('/notifications', fn () => Inertia::render('Placeholder', ['title' => 'Notifications']))
        ->name('notifications.index');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';

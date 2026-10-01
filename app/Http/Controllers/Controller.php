<?php

namespace App\Http\Controllers;

use Illuminate\Http\Exceptions\HttpResponseException;

abstract class Controller
{
    /**
     * Stop a blocked request with a clear message (shown as the red banner).
     * Page visits go straight to the account's home screen (not via
     * /dashboard, whose extra redirect would drop the message), actions go
     * back to where they came from. Redirecting page visits "back" could loop
     * on another blocked page.
     */
    protected function deny(string $message): never
    {
        $redirect = request()->isMethod('GET')
            ? redirect()->route(request()->user()->homeRoute())
            : redirect()->back();

        throw new HttpResponseException($redirect->with('error', $message));
    }
}

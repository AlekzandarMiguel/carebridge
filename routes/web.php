<?php

use Illuminate\Support\Facades\Route;

Route::get('/up', fn () => response('OK', 200));

// SPA catch-all - serves the React app for all non-API routes.
Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');

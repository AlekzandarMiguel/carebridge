<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\HospitalCapacityController;
use App\Http\Controllers\Api\HospitalController;
use App\Http\Controllers\Api\IncomingRequestController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\TransferRequestController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/auth/options', [AuthController::class, 'options']);
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::get('/auth/settings', [AuthController::class, 'settings']);
    Route::put('/auth/settings', [AuthController::class, 'updateSettings']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Hospitals
    Route::get('/hospitals', [HospitalController::class, 'index']);
    Route::get('/hospitals/{id}', [HospitalController::class, 'show']);

    // Hospital Capacity
    Route::get('/hospitals/{id}/capacity', [HospitalCapacityController::class, 'index']);
    Route::put('/hospitals/{id}/capacity', [HospitalCapacityController::class, 'update']);

    // Transfer Requests
    Route::get('/transfer-requests', [TransferRequestController::class, 'index']);
    Route::get('/transfer-recommendations', [TransferRequestController::class, 'recommendations']);
    Route::get('/transfer-requests/export', [TransferRequestController::class, 'export']);
    Route::post('/transfer-requests', [TransferRequestController::class, 'store']);
    Route::get('/transfer-board', [TransferRequestController::class, 'board']);
    Route::get('/transfer-requests/{id}', [TransferRequestController::class, 'show']);

    // Incoming Requests
    Route::get('/incoming-requests', [IncomingRequestController::class, 'index']);

    // Transfer Status Actions
    Route::put('/transfer-requests/{id}/accept', [TransferRequestController::class, 'accept']);
    Route::put('/transfer-requests/{id}/decline', [TransferRequestController::class, 'decline']);
    Route::put('/transfer-requests/{id}/reserve', [TransferRequestController::class, 'reserve']);
    Route::put('/transfer-requests/{id}/transfer', [TransferRequestController::class, 'startTransfer']);
    Route::put('/transfer-requests/{id}/arrive', [TransferRequestController::class, 'markArrived']);
    Route::put('/transfer-requests/{id}/complete', [TransferRequestController::class, 'complete']);
    Route::put('/transfer-requests/{id}/cancel', [TransferRequestController::class, 'cancel']);
    Route::put('/transfer-requests/{id}/escalate', [TransferRequestController::class, 'escalate']);
    Route::put('/transfer-requests/{id}/coordinator-notes', [TransferRequestController::class, 'updateCoordinatorNotes']);
    Route::put('/transfer-requests/{id}/assign-dispatcher', [TransferRequestController::class, 'assignDispatcher']);
    Route::put('/transfer-requests/{id}/route-estimate', [TransferRequestController::class, 'updateRouteEstimate']);
    Route::post('/transfer-requests/{id}/delivery-events', [TransferRequestController::class, 'addDeliveryEvent']);

    // Transfer Tracking
    Route::get('/transfer-tracking', [TransferRequestController::class, 'index']);

    // Analytics
    Route::get('/analytics', [AnalyticsController::class, 'index']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);

    // Admin Management
    Route::get('/admin', [AdminController::class, 'index']);
    Route::post('/admin/users', [AdminController::class, 'createUser']);
    Route::put('/admin/users/{id}', [AdminController::class, 'updateUser']);
    Route::post('/admin/hospitals', [AdminController::class, 'createHospital']);
    Route::put('/admin/hospitals/{id}', [AdminController::class, 'updateHospital']);
    Route::get('/admin/system-settings', [AdminController::class, 'systemSettings']);
    Route::put('/admin/system-settings', [AdminController::class, 'updateSystemSettings']);
    Route::post('/admin/demo-refresh', [AdminController::class, 'refreshDemoData']);
    Route::get('/audit-logs', [AuditLogController::class, 'index']);
    Route::get('/audit-logs/export', [AuditLogController::class, 'export']);
});

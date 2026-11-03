<?php

use App\Http\Controllers\Api\V1\AdministrationController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DailyReportController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\EmployeeController;
use App\Http\Controllers\Api\V1\MasterDataController;
use App\Http\Controllers\Api\V1\ReportExportController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('app-info', [AdministrationController::class, 'appInfo']);
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::put('auth/password', [AuthController::class, 'changePassword']);

        Route::get('dashboard', DashboardController::class);

        // Laporan: cakupan data dan kepemilikan ditegakkan di ReportQuery & DailyReportPolicy.
        Route::get('reports/summary', [ReportExportController::class, 'summary']);
        Route::get('reports/export', [ReportExportController::class, 'export'])->middleware('throttle:exports');
        Route::apiResource('reports', DailyReportController::class);

        Route::get('units', [MasterDataController::class, 'units']);
        Route::get('ranks', [MasterDataController::class, 'ranks']);

        Route::middleware('role:admin,pimpinan')->group(function () {
            Route::get('employees/options', [EmployeeController::class, 'options']);
        });

        Route::middleware('role:admin')->group(function () {
            Route::apiResource('employees', EmployeeController::class);
            Route::patch('users/{user}/status', [EmployeeController::class, 'updateStatus']);
            Route::post('users/{user}/reset-password', [EmployeeController::class, 'resetPassword']);

            Route::post('units', [MasterDataController::class, 'storeUnit']);
            Route::put('units/{unit}', [MasterDataController::class, 'updateUnit']);
            Route::delete('units/{unit}', [MasterDataController::class, 'destroyUnit']);
            Route::post('ranks', [MasterDataController::class, 'storeRank']);
            Route::put('ranks/{rank}', [MasterDataController::class, 'updateRank']);
            Route::delete('ranks/{rank}', [MasterDataController::class, 'destroyRank']);

            Route::get('period-locks', [AdministrationController::class, 'periodLocks']);
            Route::put('period-locks', [AdministrationController::class, 'updatePeriodLock']);
            Route::get('activity-logs', [AdministrationController::class, 'activityLogs']);
            Route::get('settings', [AdministrationController::class, 'settings']);
            Route::put('settings', [AdministrationController::class, 'updateSettings']);
        });
    });
});

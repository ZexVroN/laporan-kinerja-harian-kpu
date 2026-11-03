<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const MAX_ATTEMPTS = 5;

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:150'],
            'password' => ['required', 'string', 'max:200'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        $throttleKey = 'login:'.Str::lower($data['login']).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, self::MAX_ATTEMPTS)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'login' => "Terlalu banyak percobaan masuk. Coba lagi dalam {$seconds} detik.",
            ])->status(429);
        }

        $field = filter_var($data['login'], FILTER_VALIDATE_EMAIL) ? 'email' : 'username';
        $user = User::query()->where($field, $data['login'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            RateLimiter::hit($throttleKey, 60);
            if ($user) {
                ActivityLogger::log('auth.login_failed', 'Percobaan masuk gagal', $user, user: $user);
            }

            throw ValidationException::withMessages(['login' => 'Nama pengguna atau kata sandi salah.']);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages(['login' => 'Akun Anda telah dinonaktifkan. Hubungi Administrator.']);
        }

        RateLimiter::clear($throttleKey);
        Auth::guard('web')->login($user, (bool) ($data['remember'] ?? false));
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        $user->forceFill(['last_login_at' => now()])->save();
        ActivityLogger::log('auth.login', 'Masuk ke sistem', $user, user: $user);

        return response()->json([
            'data' => new UserResource($user->load('employee.rank', 'employee.unit')),
            'message' => 'Berhasil masuk.',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        ActivityLogger::log('auth.logout', 'Keluar dari sistem', $user);

        Auth::guard('web')->logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Anda telah keluar.']);
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user()->load('employee.rank', 'employee.unit', 'employee.supervisor'));
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password:web'],
            'password' => ['required', 'confirmed', 'different:current_password', Password::min(8)->letters()->numbers()],
        ]);

        $user = $request->user();
        $user->forceFill([
            'password' => $data['password'],
            'must_change_password' => false,
        ])->save();

        // Keluarkan sesi lain yang mungkin masih aktif di perangkat lain.
        Auth::guard('web')->logoutOtherDevices($data['password']);
        ActivityLogger::log('auth.password_changed', 'Mengganti kata sandi sendiri', $user);

        return response()->json(['message' => 'Kata sandi berhasil diganti.']);
    }
}

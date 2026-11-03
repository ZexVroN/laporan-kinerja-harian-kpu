<?php

use App\Http\Middleware\EnsureActiveUser;
use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // SPA di domain yang sama: autentikasi lewat cookie sesi + CSRF (Sanctum).
        $middleware->statefulApi();
        $middleware->append(SecurityHeaders::class);
        $middleware->alias([
            'role' => EnsureRole::class,
            'active' => EnsureActiveUser::class,
        ]);
        // Hostinger meneruskan HTTPS lewat proxy; percayai header X-Forwarded-*.
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $isApi = fn (Request $request) => $request->is('api/*') || $request->expectsJson();

        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $isApi($request));

        $exceptions->render(function (AuthenticationException $e, Request $request) use ($isApi) {
            if ($isApi($request)) {
                return response()->json(['message' => 'Sesi Anda telah berakhir. Silakan masuk kembali.'], 401);
            }
        });

        $exceptions->render(function (AuthorizationException|AccessDeniedHttpException $e, Request $request) use ($isApi) {
            if ($isApi($request)) {
                $message = $e->getMessage();
                $generic = ['This action is unauthorized.', ''];

                return response()->json([
                    'message' => in_array($message, $generic, true) ? 'Anda tidak memiliki akses untuk tindakan ini.' : $message,
                ], 403);
            }
        });

        $exceptions->render(function (NotFoundHttpException|ModelNotFoundException $e, Request $request) use ($isApi) {
            if ($isApi($request)) {
                return response()->json(['message' => 'Data tidak ditemukan.'], 404);
            }
        });

        $exceptions->render(function (ThrottleRequestsException $e, Request $request) use ($isApi) {
            if ($isApi($request)) {
                $retry = (int) ($e->getHeaders()['Retry-After'] ?? 60);

                return response()->json(['message' => "Terlalu banyak percobaan. Coba lagi dalam {$retry} detik."], 429, $e->getHeaders());
            }
        });

        // TokenMismatchException sudah diubah menjadi HttpException 419 sebelum sampai di sini.
        $exceptions->render(function (HttpException $e, Request $request) use ($isApi) {
            if ($e->getStatusCode() === 419 && $isApi($request)) {
                return response()->json(['message' => 'Sesi halaman kedaluwarsa. Muat ulang halaman lalu coba lagi.'], 419);
            }
        });
    })->create();

<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\EmployeeRequest;
use App\Http\Resources\EmployeeResource;
use App\Models\Employee;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EmployeeController extends Controller
{
    private const EMPLOYEE_FIELDS = ['full_name', 'nip', 'rank_id', 'position', 'unit_id', 'supervisor_id'];

    private const USER_FIELDS = ['username', 'email', 'role'];

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'unit_id' => ['nullable', 'integer'],
            'role' => ['nullable', Rule::enum(Role::class)],
            'status' => ['nullable', 'in:active,inactive'],
            'per_page' => ['nullable', 'integer', 'between:5,100'],
        ]);

        $employees = Employee::query()
            ->with(['rank', 'unit', 'supervisor', 'user'])
            ->withCount('reports')
            ->when($filters['q'] ?? null, function (Builder $query, string $q) {
                $term = '%'.addcslashes($q, '%_\\').'%';
                $query->where(fn (Builder $w) => $w->where('full_name', 'like', $term)
                    ->orWhere('nip', 'like', $term)
                    ->orWhereHas('user', fn (Builder $u) => $u->where('username', 'like', $term)->orWhere('email', 'like', $term)));
            })
            ->when($filters['unit_id'] ?? null, fn (Builder $q, $unit) => $q->where('unit_id', $unit))
            ->when($filters['role'] ?? null, fn (Builder $q, $role) => $q->whereHas('user', fn (Builder $u) => $u->where('role', $role)))
            ->when($filters['status'] ?? null, fn (Builder $q, $status) => $q->whereHas('user', fn (Builder $u) => $u->where('is_active', $status === 'active')))
            ->orderBy('full_name')
            ->paginate($filters['per_page'] ?? 25)
            ->withQueryString();

        return EmployeeResource::collection($employees);
    }

    /** Daftar ringkas untuk pilihan penyaring (Admin & Pimpinan). */
    public function options(): JsonResponse
    {
        $employees = Employee::query()
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'nip', 'unit_id', 'position']);

        return response()->json(['data' => $employees]);
    }

    public function store(EmployeeRequest $request): JsonResponse
    {
        $data = $request->validated();
        $temporaryPassword = $data['password'] ?? null;
        $generated = $temporaryPassword === null;
        $temporaryPassword ??= self::generatePassword();

        $employee = DB::transaction(function () use ($data, $temporaryPassword) {
            $employee = Employee::create(array_intersect_key($data, array_flip(self::EMPLOYEE_FIELDS)));
            $user = $employee->user()->create([
                ...array_intersect_key($data, array_flip(self::USER_FIELDS)),
                'name' => $employee->full_name,
                'password' => $temporaryPassword,
                'must_change_password' => true,
            ]);

            ActivityLogger::log('account.created', "Membuat pegawai {$employee->full_name} dengan akun {$user->username} ({$user->role->label()})", $employee);

            return $employee;
        });

        return response()->json([
            'data' => new EmployeeResource($employee->load('rank', 'unit', 'supervisor', 'user')),
            // Ditampilkan sekali agar Administrator dapat menyerahkannya ke pegawai.
            'temporary_password' => $generated ? $temporaryPassword : null,
            'message' => 'Pegawai dan akun berhasil dibuat.',
        ], 201);
    }

    public function show(Employee $employee): EmployeeResource
    {
        return new EmployeeResource($employee->load('rank', 'unit', 'supervisor', 'user')->loadCount('reports'));
    }

    public function update(EmployeeRequest $request, Employee $employee): EmployeeResource
    {
        $data = $request->validated();
        $user = $employee->user;

        if ($user && $user->is($request->user()) && $data['role'] !== $user->role->value) {
            throw ValidationException::withMessages(['role' => 'Anda tidak dapat mengubah peran akun sendiri.']);
        }

        DB::transaction(function () use ($data, $employee, $user) {
            $employee->fill(array_intersect_key($data, array_flip(self::EMPLOYEE_FIELDS)))->save();
            $employeeDiff = ActivityLogger::diff($employee, self::EMPLOYEE_FIELDS);

            $userDiff = ['old' => [], 'new' => []];
            if ($user) {
                $user->fill([...array_intersect_key($data, array_flip(self::USER_FIELDS)), 'name' => $employee->full_name])->save();
                $userDiff = ActivityLogger::diff($user, self::USER_FIELDS);
            }

            $changes = [
                'old' => [...$employeeDiff['old'], ...$userDiff['old']],
                'new' => [...$employeeDiff['new'], ...$userDiff['new']],
            ];
            if ($changes['new'] !== []) {
                ActivityLogger::log('account.updated', "Mengubah data pegawai {$employee->full_name}", $employee, $changes);
            }
        });

        return (new EmployeeResource($employee->load('rank', 'unit', 'supervisor', 'user')->loadCount('reports')))
            ->additional(['message' => 'Data pegawai berhasil diperbarui.']);
    }

    /** Hanya pegawai tanpa laporan yang boleh dihapus; selebihnya cukup dinonaktifkan. */
    public function destroy(Request $request, Employee $employee): JsonResponse
    {
        if ($employee->reports()->withTrashed()->exists()) {
            return response()->json([
                'message' => 'Pegawai ini memiliki riwayat laporan dan tidak dapat dihapus. Nonaktifkan akunnya saja.',
            ], 422);
        }

        if ($employee->user?->is($request->user())) {
            return response()->json(['message' => 'Anda tidak dapat menghapus data Anda sendiri.'], 422);
        }

        DB::transaction(function () use ($employee) {
            $employee->user?->forceFill(['is_active' => false])->save();
            $employee->delete();
            ActivityLogger::log('account.deleted', "Menghapus pegawai {$employee->full_name}", $employee);
        });

        return response()->json(['message' => 'Data pegawai berhasil dihapus.']);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['is_active' => ['required', 'boolean']]);

        if ($user->is($request->user())) {
            return response()->json(['message' => 'Anda tidak dapat menonaktifkan akun sendiri.'], 422);
        }

        $user->forceFill(['is_active' => $data['is_active']])->save();
        if (! $user->is_active) {
            // Putuskan sesi yang masih aktif (driver sesi database).
            DB::table('sessions')->where('user_id', $user->id)->delete();
            $user->forceFill(['remember_token' => Str::random(60)])->save();
        }

        ActivityLogger::log('account.status_changed', ($user->is_active ? 'Mengaktifkan' : 'Menonaktifkan')." akun {$user->username}", $user);

        return response()->json([
            'data' => ['id' => $user->id, 'is_active' => $user->is_active],
            'message' => $user->is_active ? 'Akun diaktifkan.' : 'Akun dinonaktifkan.',
        ]);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $password = self::generatePassword();

        $user->forceFill([
            'password' => $password,
            'must_change_password' => true,
            'remember_token' => Str::random(60),
        ])->save();
        DB::table('sessions')->where('user_id', $user->id)->delete();

        ActivityLogger::log('account.password_reset', "Mengatur ulang kata sandi akun {$user->username}", $user);

        return response()->json([
            'temporary_password' => $password,
            'message' => 'Kata sandi sementara dibuat. Serahkan kepada pegawai; ia wajib menggantinya saat masuk.',
        ]);
    }

    /** Kata sandi sementara yang mudah dibacakan: tanpa karakter ambigu, selalu berisi huruf dan angka. */
    private static function generatePassword(): string
    {
        $letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
        $digits = '23456789';
        $pool = $letters.$digits;

        $chars = [$letters[random_int(0, strlen($letters) - 1)], $digits[random_int(0, strlen($digits) - 1)]];
        while (count($chars) < 12) {
            $chars[] = $pool[random_int(0, strlen($pool) - 1)];
        }
        shuffle($chars);

        return implode('', $chars);
    }
}

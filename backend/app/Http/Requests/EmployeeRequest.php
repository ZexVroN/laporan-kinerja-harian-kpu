<?php

namespace App\Http\Requests;

use App\Enums\Role;
use App\Models\Employee;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/** Data pegawai sekaligus akun masuknya (khusus Administrator). */
class EmployeeRequest extends FormRequest
{
    /** Huruf kecil, angka, titik, tanda hubung, garis bawah; contoh: siti.nanda */
    public const USERNAME_PATTERN = '/^[a-z0-9][a-z0-9._-]*$/';

    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        /** @var Employee|null $employee */
        $employee = $this->route('employee');
        $userId = $employee?->user?->id;
        $creating = $employee === null;

        return [
            'full_name' => ['required', 'string', 'max:150'],
            'nip' => ['required', 'digits:18', Rule::unique('employees', 'nip')->ignore($employee?->id)],
            'rank_id' => ['nullable', 'integer', 'exists:ranks,id'],
            'position' => ['required', 'string', 'max:150'],
            'unit_id' => ['required', 'integer', Rule::exists('units', 'id')->where('is_active', true)],
            'supervisor_id' => ['nullable', 'integer', Rule::exists('employees', 'id')->whereNull('deleted_at'), Rule::notIn(array_filter([$employee?->id]))],

            'username' => ['required', 'string', 'min:3', 'max:50', 'regex:'.self::USERNAME_PATTERN, Rule::unique('users', 'username')->ignore($userId)],
            'email' => ['nullable', 'email', 'max:150', Rule::unique('users', 'email')->ignore($userId)],
            'role' => ['required', Rule::enum(Role::class)],
            'password' => $creating
                ? ['nullable', 'string', Password::min(8)->letters()->numbers()]
                : ['prohibited'],
        ];
    }

    public function attributes(): array
    {
        return [
            'full_name' => 'nama lengkap',
            'nip' => 'NIP',
            'rank_id' => 'pangkat/golongan',
            'position' => 'jabatan',
            'unit_id' => 'unit kerja',
            'supervisor_id' => 'atasan langsung',
            'username' => 'nama pengguna',
            'email' => 'email',
            'role' => 'peran',
            'password' => 'kata sandi awal',
        ];
    }

    public function messages(): array
    {
        return [
            'nip.unique' => 'NIP ini sudah terdaftar.',
            'username.regex' => 'Nama pengguna hanya boleh berisi huruf kecil, angka, titik, tanda hubung, dan garis bawah.',
            'supervisor_id.not_in' => 'Pegawai tidak dapat menjadi atasan bagi dirinya sendiri.',
            'password.prohibited' => 'Gunakan fitur atur ulang kata sandi untuk mengganti kata sandi.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'nip' => preg_replace('/\s+/', '', (string) $this->input('nip')),
            'username' => strtolower(trim((string) $this->input('username'))),
            'email' => $this->filled('email') ? strtolower(trim((string) $this->input('email'))) : null,
        ]);
    }
}

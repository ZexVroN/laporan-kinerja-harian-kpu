<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Rank;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class EmployeeManagementTest extends TestCase
{
    private function payload(array $overrides = []): array
    {
        return [
            'full_name' => 'Yuliana Mahuze',
            'nip' => '19960721 202203 2 001',
            'rank_id' => Rank::factory()->create()->id,
            'position' => 'Penata Kelola Pemilu Ahli Pertama',
            'unit_id' => Unit::factory()->create()->id,
            'username' => 'Yuliana.Mahuze',
            'email' => 'yuliana@contoh.go.id',
            'role' => 'pegawai',
            ...$overrides,
        ];
    }

    public function test_admin_membuat_pegawai_dan_akun(): void
    {
        $admin = $this->admin();

        $response = $this->actingAs($admin)->postJson('/api/v1/employees', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.nip', '199607212022032001')
            ->assertJsonPath('data.nip_formatted', '19960721 202203 2 001')
            ->assertJsonPath('data.user.username', 'yuliana.mahuze')
            ->assertJsonPath('data.user.role', 'pegawai');

        $temporary = $response->json('temporary_password');
        $this->assertIsString($temporary);
        $this->assertSame(12, strlen($temporary));

        $user = User::query()->where('username', 'yuliana.mahuze')->sole();
        $this->assertTrue(Hash::check($temporary, $user->password));
        $this->assertTrue($user->must_change_password);
        $this->assertDatabaseHas('activity_logs', ['action' => 'account.created', 'user_id' => $admin->id]);

        // Pegawai baru dapat langsung masuk dengan kata sandi sementara.
        $this->postJson('/api/v1/auth/logout');
        $this->postJson('/api/v1/auth/login', ['login' => 'yuliana.mahuze', 'password' => $temporary])
            ->assertOk()->assertJsonPath('data.must_change_password', true);
    }

    public function test_admin_dapat_menentukan_kata_sandi_awal(): void
    {
        $response = $this->actingAs($this->admin())->postJson('/api/v1/employees', $this->payload(['password' => 'Awal12345']))->assertCreated();

        $this->assertNull($response->json('temporary_password'));
        $this->assertTrue(Hash::check('Awal12345', User::query()->where('username', 'yuliana.mahuze')->sole()->password));
    }

    public function test_validasi_nip_unik_dan_18_digit(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->postJson('/api/v1/employees', $this->payload())->assertCreated();

        $this->actingAs($admin)->postJson('/api/v1/employees', $this->payload(['username' => 'lain', 'email' => null]))
            ->assertStatus(422)->assertJsonPath('errors.nip.0', 'NIP ini sudah terdaftar.');

        $this->actingAs($admin)->postJson('/api/v1/employees', $this->payload(['nip' => '12345', 'username' => 'lain2', 'email' => null]))
            ->assertStatus(422)->assertJsonPath('errors.nip.0', 'NIP harus terdiri dari 18 digit angka.');

        $this->actingAs($admin)->postJson('/api/v1/employees', $this->payload(['nip' => '199607212022032009', 'username' => 'yuliana.mahuze', 'email' => null]))
            ->assertStatus(422)->assertJsonValidationErrors('username');

        $this->assertSame(1, Employee::count());
    }

    public function test_hanya_admin_yang_mengelola_pegawai(): void
    {
        foreach ([$this->pegawai(), $this->pimpinan()] as $user) {
            $this->actingAs($user)->getJson('/api/v1/employees')->assertForbidden();
            $this->actingAs($user)->postJson('/api/v1/employees', $this->payload())->assertForbidden();
            $this->actingAs($user)->patchJson("/api/v1/users/{$user->id}/status", ['is_active' => false])->assertForbidden();
            $this->actingAs($user)->getJson('/api/v1/activity-logs')->assertForbidden();
            $this->actingAs($user)->putJson('/api/v1/period-locks', ['year' => 2026, 'quarter' => 3, 'is_locked' => false])->assertForbidden();
        }

        // Pimpinan tetap boleh mengambil daftar pegawai untuk penyaring.
        $this->actingAs($this->pimpinan())->getJson('/api/v1/employees/options')->assertOk();
        $this->actingAs($this->pegawai())->getJson('/api/v1/employees/options')->assertForbidden();
    }

    public function test_admin_mengubah_data_pegawai_dengan_audit(): void
    {
        $admin = $this->admin();
        $user = $this->pegawai(['position' => 'Pengelola Keuangan']);
        $employee = $user->employee;

        $this->actingAs($admin)->putJson("/api/v1/employees/{$employee->id}", [
            'full_name' => $employee->full_name,
            'nip' => $employee->nip,
            'rank_id' => $employee->rank_id,
            'position' => 'Analis Keuangan',
            'unit_id' => $employee->unit_id,
            'username' => $user->username,
            'email' => $user->email,
            'role' => 'pimpinan',
        ])->assertOk()->assertJsonPath('data.position', 'Analis Keuangan')->assertJsonPath('data.user.role', 'pimpinan');

        $log = \App\Models\ActivityLog::query()->where('action', 'account.updated')->sole();
        $this->assertSame('Pengelola Keuangan', $log->properties['old']['position']);
        $this->assertSame('pimpinan', $log->properties['new']['role']);
    }

    public function test_nonaktifkan_dan_atur_ulang_kata_sandi(): void
    {
        $admin = $this->admin();
        $user = $this->pegawai();

        $this->actingAs($admin)->patchJson("/api/v1/users/{$user->id}/status", ['is_active' => false])->assertOk();
        $this->assertFalse($user->fresh()->is_active);
        $this->postJson('/api/v1/auth/logout');
        $this->postJson('/api/v1/auth/login', ['login' => $user->username, 'password' => 'password'])->assertStatus(422);

        $this->actingAs($admin)->patchJson("/api/v1/users/{$admin->id}/status", ['is_active' => false])->assertStatus(422);

        $temp = $this->actingAs($admin)->postJson("/api/v1/users/{$user->id}/reset-password")->assertOk()->json('temporary_password');
        $this->assertTrue(Hash::check($temp, $user->fresh()->password));
        $this->assertTrue($user->fresh()->must_change_password);
        $this->assertDatabaseHas('activity_logs', ['action' => 'account.password_reset']);
        $this->assertDatabaseHas('activity_logs', ['action' => 'account.status_changed']);
    }

    public function test_pegawai_dengan_laporan_tidak_dapat_dihapus(): void
    {
        $admin = $this->admin();
        $withReports = $this->pegawai();
        $this->reportFor($withReports);
        $fresh = $this->pegawai();

        $this->actingAs($admin)->deleteJson("/api/v1/employees/{$withReports->employee_id}")->assertStatus(422);
        $this->assertNotSoftDeleted($withReports->employee);

        $this->actingAs($admin)->deleteJson("/api/v1/employees/{$fresh->employee_id}")->assertOk();
        $this->assertSoftDeleted($fresh->employee);
        $this->assertFalse($fresh->fresh()->is_active);
    }

    public function test_pencarian_dan_penyaringan_pegawai(): void
    {
        $admin = $this->admin();
        $unit = $this->unit('Unit Cari');
        $this->pegawai(['full_name' => 'Maria Kaize', 'unit_id' => $unit->id]);
        $this->pegawai(['full_name' => 'Paulus Basik']);

        $this->actingAs($admin)->getJson('/api/v1/employees?q=Kaize')->assertJsonCount(1, 'data')->assertJsonPath('data.0.full_name', 'Maria Kaize');
        $this->actingAs($admin)->getJson('/api/v1/employees?unit_id='.$unit->id)->assertJsonCount(1, 'data');
        $this->actingAs($admin)->getJson('/api/v1/employees?status=active')->assertJsonCount(2, 'data');
    }

    public function test_data_induk_unit(): void
    {
        $admin = $this->admin();
        $user = $this->pegawai();

        $id = $this->actingAs($admin)->postJson('/api/v1/units', ['name' => 'Unit Baru', 'code' => 'UB'])->assertCreated()->json('data.id');
        $this->actingAs($user)->getJson('/api/v1/units')->assertOk();
        $this->actingAs($user)->postJson('/api/v1/units', ['name' => 'X'])->assertForbidden();

        // Unit yang dipakai tidak dapat dihapus.
        $this->actingAs($admin)->deleteJson("/api/v1/units/{$user->employee->unit_id}")->assertStatus(422);
        $this->actingAs($admin)->deleteJson("/api/v1/units/{$id}")->assertOk();
    }
}

<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    public function test_login_dengan_username_dan_email(): void
    {
        $user = $this->pegawai();
        $user->update(['username' => 'siti.nanda', 'email' => 'siti@contoh.go.id']);

        $this->postJson('/api/v1/auth/login', ['login' => 'siti.nanda', 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('data.username', 'siti.nanda')
            ->assertJsonPath('data.role', 'pegawai')
            ->assertJsonPath('data.employee.nip', $user->employee->nip);

        $this->assertAuthenticatedAs($user, 'web');
        $this->assertNotNull($user->fresh()->last_login_at);
        $this->assertDatabaseHas('activity_logs', ['user_id' => $user->id, 'action' => 'auth.login']);

        $this->postJson('/api/v1/auth/logout')->assertOk();
        $this->assertGuest('web');
        $this->assertDatabaseHas('activity_logs', ['user_id' => $user->id, 'action' => 'auth.logout']);

        $this->postJson('/api/v1/auth/login', ['login' => 'siti@contoh.go.id', 'password' => 'password'])->assertOk();
    }

    public function test_kata_sandi_salah_ditolak_dan_password_tersimpan_terhash(): void
    {
        $user = $this->pegawai();

        $this->assertTrue(Hash::isHashed($user->password));
        $this->assertNotSame('password', $user->password);

        $this->postJson('/api/v1/auth/login', ['login' => $user->username, 'password' => 'salah'])
            ->assertStatus(422)
            ->assertJsonPath('errors.login.0', 'Nama pengguna atau kata sandi salah.');
        $this->assertGuest('web');
    }

    public function test_akun_nonaktif_tidak_bisa_masuk(): void
    {
        $user = User::factory()->pegawai()->inactive()->create();

        $this->postJson('/api/v1/auth/login', ['login' => $user->username, 'password' => 'password'])
            ->assertStatus(422)
            ->assertJsonPath('errors.login.0', 'Akun Anda telah dinonaktifkan. Hubungi Administrator.');
    }

    public function test_login_dibatasi_setelah_lima_kali_gagal(): void
    {
        $user = $this->pegawai();

        foreach (range(1, 5) as $_) {
            $this->postJson('/api/v1/auth/login', ['login' => $user->username, 'password' => 'salah'])->assertStatus(422);
        }

        // Kata sandi benar pun ditahan sampai jeda selesai.
        $this->postJson('/api/v1/auth/login', ['login' => $user->username, 'password' => 'password'])->assertStatus(429);
        $this->assertGuest('web');
    }

    public function test_endpoint_terlindungi_tanpa_login(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401)
            ->assertJsonPath('message', 'Sesi Anda telah berakhir. Silakan masuk kembali.');
        $this->getJson('/api/v1/reports')->assertStatus(401);
        $this->getJson('/api/v1/dashboard')->assertStatus(401);
    }

    public function test_tidak_ada_pendaftaran_publik(): void
    {
        $this->postJson('/api/v1/auth/register', ['username' => 'baru'])->assertStatus(404);
        $this->postJson('/api/v1/employees', [])->assertStatus(401);
    }

    public function test_akun_yang_dinonaktifkan_kehilangan_sesi(): void
    {
        $user = $this->pegawai();
        $this->actingAs($user)->getJson('/api/v1/auth/me')->assertOk();

        $user->update(['is_active' => false]);

        $this->actingAs($user->fresh())->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    public function test_ganti_kata_sandi(): void
    {
        $user = $this->pegawai();
        $user->update(['must_change_password' => true]);

        $this->actingAs($user)->putJson('/api/v1/auth/password', [
            'current_password' => 'salah',
            'password' => 'RahasiaBaru123',
            'password_confirmation' => 'RahasiaBaru123',
        ])->assertStatus(422)->assertJsonValidationErrors('current_password');

        $this->actingAs($user)->putJson('/api/v1/auth/password', [
            'current_password' => 'password',
            'password' => 'RahasiaBaru123',
            'password_confirmation' => 'RahasiaBaru123',
        ])->assertOk();

        $user->refresh();
        $this->assertTrue(Hash::check('RahasiaBaru123', $user->password));
        $this->assertFalse($user->must_change_password);
        $this->assertSame(1, ActivityLog::query()->where('action', 'auth.password_changed')->count());
    }

    public function test_header_keamanan_terpasang(): void
    {
        $this->getJson('/api/v1/app-info')
            ->assertOk()
            ->assertJsonPath('data.app_name', 'SILAKH')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }
}

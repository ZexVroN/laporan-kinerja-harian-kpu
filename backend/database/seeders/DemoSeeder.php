<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\DailyReport;
use App\Models\Employee;
use App\Models\Rank;
use App\Models\Unit;
use App\Models\User;
use Carbon\CarbonPeriod;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Data contoh untuk pengembangan lokal saja: php artisan db:seed --class=DemoSeeder
 * Semua akun contoh memakai kata sandi "password". Ditolak di lingkungan produksi.
 */
class DemoSeeder extends Seeder
{
    private const ACTIVITIES = [
        'Menyusun konsep surat undangan rapat koordinasi',
        'Memverifikasi kelengkapan berkas pertanggungjawaban kegiatan',
        'Menginput transaksi belanja ke aplikasi keuangan',
        'Memutakhirkan data pemilih berkelanjutan',
        'Mengagendakan dan mendistribusikan surat masuk',
        'Menyiapkan bahan rapat evaluasi bulanan',
        'Mengikuti apel pagi dan arahan pimpinan',
        'Menyusun notula rapat koordinasi internal',
        'Merekap daftar hadir pegawai',
        'Menyiapkan bahan sosialisasi pendidikan pemilih',
    ];

    public function run(): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('DemoSeeder tidak boleh dijalankan di produksi.');
        }

        $this->call([RankSeeder::class, UnitSeeder::class]);

        $units = Unit::all();
        $ranks = Rank::query()->whereIn('code', ['II/c', 'III/a', 'III/b', 'III/c', 'III/d', 'IV/a'])->get();

        User::query()->firstOrCreate(['username' => 'admin'], [
            'name' => 'Administrator Demo', 'email' => 'admin@demo.test', 'password' => 'password', 'role' => Role::Admin,
        ]);

        $sekretaris = $this->employeeWithUser('pimpinan', 'Pimpinan Demo', $units->firstWhere('code', 'SEK'), $ranks->last(), 'Sekretaris', Role::Pimpinan);

        $pegawai = collect();
        foreach ($units as $i => $unit) {
            foreach (range(1, 3) as $n) {
                $pegawai->push($this->employeeWithUser(
                    $i === 1 && $n === 1 ? 'pegawai' : "pegawai{$i}{$n}",
                    fake('id_ID')->name(),
                    $unit,
                    $ranks->random(),
                    'Pelaksana',
                    Role::Pegawai,
                    $sekretaris,
                ));
            }
        }

        $period = CarbonPeriod::create(today()->startOfYear(), today()->subDay());
        foreach ($pegawai as $employee) {
            foreach ($period as $day) {
                if ($day->isWeekend() || fake()->boolean(4)) {
                    continue;
                }
                foreach (range(1, fake()->numberBetween(1, 3)) as $_) {
                    DailyReport::factory()->for($employee)->create([
                        'report_date' => $day->toDateString(),
                        'activity_description' => fake()->randomElement(self::ACTIVITIES),
                        'remarks' => fake()->boolean(40) ? 'Selesai' : null,
                        'created_by' => $employee->user->id,
                    ]);
                }
            }
        }
    }

    private function employeeWithUser(string $username, string $name, Unit $unit, Rank $rank, string $position, Role $role, ?Employee $supervisor = null): Employee
    {
        $employee = Employee::factory()->create([
            'full_name' => $name,
            'unit_id' => $unit->id,
            'rank_id' => $rank->id,
            'position' => $position,
            'supervisor_id' => $supervisor?->id,
        ]);

        User::query()->firstOrCreate(['username' => $username], [
            'employee_id' => $employee->id,
            'name' => $name,
            'email' => "{$username}@demo.test",
            'password' => 'password',
            'role' => $role,
        ]);

        return $employee->load('user');
    }
}

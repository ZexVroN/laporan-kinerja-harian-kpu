<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Daftar awal Rencana Aksi; Administrator dapat mengubahnya di menu Data Induk. */
    private const DEFAULT_PLANS = [
        'Penyusunan surat dinas',
        'Pengelolaan administrasi kepegawaian',
        'Digitalisasi dokumen pegawai',
        'Penyusunan konten informasi kepemiluan',
        'Dokumentasi kegiatan kedinasan',
        'Pengolahan dan pemutakhiran data',
        'Penyusunan bahan administrasi teknis pemilu',
        'Penyiapan atau penelaahan bahan hukum',
        'Pengelolaan administrasi keuangan/logistik',
    ];

    public function up(): void
    {
        Schema::create('action_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name', 200)->unique();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $now = now();
        DB::table('action_plans')->insert(array_map(
            fn (string $name, int $i) => ['name' => $name, 'sort_order' => $i + 1, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            self::DEFAULT_PLANS,
            array_keys(self::DEFAULT_PLANS),
        ));

        // Semua kolom nullable agar laporan yang dibuat sebelum fitur ini tetap sah.
        Schema::table('daily_reports', function (Blueprint $table) {
            $table->foreignId('action_plan_id')->nullable()->after('employee_id')->constrained('action_plans')->restrictOnDelete();
            // Salinan nama Rencana Aksi saat laporan dibuat, atau isian bebas bila memilih "Lainnya".
            $table->string('action_plan_name', 200)->nullable()->after('action_plan_id');
            $table->string('work_type', 20)->nullable()->after('action_plan_name');
            $table->string('data_source', 150)->nullable()->after('remarks');
            $table->unsignedInteger('target')->nullable()->after('data_source');
            $table->unsignedInteger('realization')->nullable()->after('target');
            $table->string('unit_of_measure', 30)->nullable()->after('realization');
            $table->string('evidence_url', 500)->nullable()->after('unit_of_measure');
            $table->boolean('is_completed')->nullable()->after('evidence_url');
        });
    }

    public function down(): void
    {
        Schema::table('daily_reports', function (Blueprint $table) {
            $table->dropConstrainedForeignId('action_plan_id');
            $table->dropColumn(['action_plan_name', 'work_type', 'data_source', 'target', 'realization', 'unit_of_measure', 'evidence_url', 'is_completed']);
        });
        Schema::dropIfExists('action_plans');
    }
};

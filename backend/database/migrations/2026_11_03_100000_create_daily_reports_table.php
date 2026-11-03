<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->restrictOnDelete();
            $table->date('report_date');
            $table->text('activity_description');
            $table->text('remarks')->nullable();

            // Salinan identitas saat laporan dibuat, agar dokumen periode lama tetap akurat
            // meskipun pangkat, jabatan, atau unit pegawai berubah di kemudian hari.
            $table->string('snapshot_rank', 120)->nullable();
            $table->string('snapshot_position', 150);
            $table->foreignId('snapshot_unit_id')->constrained('units')->restrictOnDelete();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // Bulan, tahun, dan triwulan diturunkan dari report_date; filter memakai rentang tanggal
            // sehingga indeks di bawah ini tetap terpakai.
            $table->index(['employee_id', 'report_date']);
            $table->index(['snapshot_unit_id', 'report_date']);
            $table->index('report_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_reports');
    }
};

<?php

namespace App\Models;

use App\Enums\WorkType;
use App\Services\QuarterService;
use App\Services\WorkHours;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

class DailyReport extends Model
{
    use HasFactory, SoftDeletes;

    /** Pilihan satuan untuk target dan realisasi. */
    public const UNITS_OF_MEASURE = ['Dokumen', 'Surat', 'Konten', 'Kegiatan', 'Berkas', 'Data', 'Orang', 'Lainnya'];

    protected $fillable = [
        'employee_id',
        'action_plan_id',
        'action_plan_name',
        'work_type',
        'report_date',
        'start_time',
        'end_time',
        'activity_description',
        'remarks',
        'data_source',
        'target',
        'realization',
        'unit_of_measure',
        'evidence_url',
        'is_completed',
        'snapshot_rank',
        'snapshot_position',
        'snapshot_unit_id',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'report_date' => 'date',
            'work_type' => WorkType::class,
            'target' => 'integer',
            'realization' => 'integer',
            'is_completed' => 'boolean',
        ];
    }

    public function actionPlan(): BelongsTo
    {
        return $this->belongsTo(ActionPlan::class);
    }

    /** "3 / 5 Dokumen", atau null untuk laporan lama tanpa target. */
    public function progressLabel(): ?string
    {
        return $this->target === null || $this->realization === null
            ? null
            : "{$this->realization} / {$this->target} ".($this->unit_of_measure ?? '');
    }

    /** "Selesai" / "Berlanjut", atau null untuk laporan lama. */
    public function statusLabel(): ?string
    {
        return $this->is_completed === null ? null : ($this->is_completed ? 'Selesai' : 'Berlanjut');
    }

    /** Simpan selalu sebagai Y-m-d agar perbandingan rentang tanggal konsisten di MySQL dan SQLite. */
    public function setReportDateAttribute(mixed $value): void
    {
        $this->attributes['report_date'] = Carbon::parse($value)->toDateString();
    }

    /** Jam disimpan seragam sebagai HH:MM:SS (bentuk kolom TIME di MySQL) agar urutan dan perbandingan konsisten. */
    public function setStartTimeAttribute(?string $value): void
    {
        $this->attributes['start_time'] = self::normalizeTime($value);
    }

    public function setEndTimeAttribute(?string $value): void
    {
        $this->attributes['end_time'] = self::normalizeTime($value);
    }

    private static function normalizeTime(?string $value): ?string
    {
        return $value === null || $value === '' ? null : substr($value, 0, 5).':00';
    }

    /** "07:30–08:00", atau null untuk laporan lama tanpa jam. */
    public function timeRange(): ?string
    {
        return $this->start_time && $this->end_time
            ? WorkHours::short($this->start_time).'–'.WorkHours::short($this->end_time)
            : null;
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class)->withTrashed();
    }

    public function snapshotUnit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'snapshot_unit_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function quarter(): int
    {
        return QuarterService::quarterOf($this->report_date);
    }

    /** Isi kolom salinan identitas dari data pegawai saat ini. */
    public function fillSnapshotFrom(Employee $employee): static
    {
        $employee->loadMissing('rank');

        $this->snapshot_rank = $employee->rankLabel();
        $this->snapshot_position = $employee->position;
        $this->snapshot_unit_id = $employee->unit_id;

        return $this;
    }
}

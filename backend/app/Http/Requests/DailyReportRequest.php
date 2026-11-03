<?php

namespace App\Http\Requests;

use App\Enums\WorkType;
use App\Models\ActionPlan;
use App\Models\DailyReport;
use App\Policies\DailyReportPolicy;
use App\Services\QuarterService;
use App\Services\WorkHours;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/** Dipakai untuk membuat dan mengubah laporan harian. */
class DailyReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // hak akses dicek oleh DailyReportPolicy di controller
    }

    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        $slots = WorkHours::slots();
        $report = $this->route('report');
        $touchesPlan = $this->isMethod('post') || $this->has('action_plan_id') || $this->has('action_plan_other');

        return [
            // Rencana Aksi dari daftar (yang aktif, atau yang sudah tersimpan di laporan ini), atau "Lainnya" berupa isian bebas.
            'action_plan_id' => ['nullable', 'integer', Rule::exists('action_plans', 'id')->where(
                fn ($q) => $q->where('is_active', true)->orWhere('id', $report?->action_plan_id ?? 0)
            )],
            'action_plan_other' => array_filter(['nullable', 'string', 'max:200', $touchesPlan ? 'required_without:action_plan_id' : null]),
            'work_type' => [$required, Rule::enum(WorkType::class)],
            'report_date' => [$required, 'date_format:Y-m-d', 'before_or_equal:today'],
            'start_time' => [$required, 'date_format:H:i', Rule::in($slots)],
            'end_time' => [$required, 'date_format:H:i', Rule::in($slots)],
            'activity_description' => [$required, 'string', 'min:10', 'max:1000'],
            'data_source' => ['nullable', 'string', 'max:150'],
            'target' => [$required, 'integer', 'min:0', 'max:1000000'],
            'realization' => [$required, 'integer', 'min:0', 'max:1000000'],
            'unit_of_measure' => [$required, Rule::in(DailyReport::UNITS_OF_MEASURE)],
            'evidence_url' => ['nullable', 'url:https', 'max:500'],
            'remarks' => ['nullable', 'string', 'max:500'],
            'is_completed' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Data siap simpan: nama Rencana Aksi disalin dari daftar, atau diambil dari isian "Lainnya".
     *
     * @return array<string, mixed>
     */
    public function reportData(): array
    {
        $data = $this->validated();

        if (array_key_exists('action_plan_id', $data) || array_key_exists('action_plan_other', $data)) {
            $planId = $data['action_plan_id'] ?? null;
            $report = $this->route('report');
            $data['action_plan_id'] = $planId;
            $data['action_plan_name'] = match (true) {
                // Rencana Aksi tidak diganti: pertahankan nama saat laporan dibuat, walau Admin sudah mengganti namanya.
                $planId !== null && $report?->action_plan_id === (int) $planId => $report->action_plan_name,
                $planId !== null => ActionPlan::query()->whereKey($planId)->value('name'),
                default => $data['action_plan_other'],
            };
        }
        unset($data['action_plan_other']);

        if ($this->isMethod('post')) {
            $data['is_completed'] ??= false;
        }

        return $data;
    }

    public function attributes(): array
    {
        return [
            'action_plan_id' => 'rencana aksi',
            'action_plan_other' => 'rencana aksi lainnya',
            'work_type' => 'jenis pekerjaan',
            'data_source' => 'sumber data',
            'target' => 'target',
            'realization' => 'realisasi',
            'unit_of_measure' => 'satuan',
            'evidence_url' => 'bukti dukung',
            'is_completed' => 'status selesai',
            'start_time' => 'jam mulai',
            'end_time' => 'jam selesai',
            'report_date' => 'tanggal laporan',
            'activity_description' => 'kegiatan harian',
            'remarks' => 'keterangan',
        ];
    }

    public function messages(): array
    {
        return [
            'report_date.before_or_equal' => 'Tanggal laporan tidak boleh melebihi hari ini.',
            'report_date.date_format' => 'Tanggal laporan tidak valid.',
            'start_time.in' => self::slotMessage('Jam mulai'),
            'end_time.in' => self::slotMessage('Jam selesai'),
            'action_plan_other.required_without' => 'Pilih Rencana Aksi, atau isi Rencana Aksi lainnya.',
            'action_plan_id.exists' => 'Rencana Aksi yang dipilih tidak tersedia.',
            'unit_of_measure.in' => 'Satuan yang dipilih tidak valid.',
            'evidence_url.url' => 'Bukti dukung harus berupa tautan https:// yang valid.',
        ];
    }

    private static function slotMessage(string $label): string
    {
        $c = config('silakh.work_hours');

        return "{$label} harus antara {$c['start']} dan {$c['end']} dengan kelipatan {$c['step']} menit.";
    }

    protected function prepareForValidation(): void
    {
        $this->merge(array_map(
            fn ($value) => is_string($value) ? trim($value) : $value,
            $this->only('activity_description', 'remarks', 'start_time', 'end_time', 'action_plan_other', 'data_source', 'evidence_url'),
        ));
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                // Saat mengubah, jam yang tidak dikirim diambil dari laporan yang ada.
                $report = $this->route('report');
                $start = $this->input('start_time', WorkHours::short($report?->start_time));
                $end = $this->input('end_time', WorkHours::short($report?->end_time));

                if ($validator->errors()->hasAny(['start_time', 'end_time']) || ! $start || ! $end) {
                    return;
                }
                if (WorkHours::toMinutes($end) <= WorkHours::toMinutes($start)) {
                    $validator->errors()->add('end_time', 'Jam selesai harus setelah jam mulai.');
                }
            },
            function (Validator $validator) {
                // Pegawai tidak boleh mengisi atau memindahkan laporan ke periode yang terkunci.
                if ($this->user()->isAdmin() || $validator->errors()->has('report_date') || ! $this->filled('report_date')) {
                    return;
                }

                $date = Carbon::parse($this->input('report_date'));
                if (QuarterService::isDateLocked($date)) {
                    $validator->errors()->add('report_date', DailyReportPolicy::lockedMessage($date->year, QuarterService::quarterOf($date)));
                }
            },
        ];
    }
}

<?php

namespace App\Http\Requests;

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

        return [
            'report_date' => [$required, 'date_format:Y-m-d', 'before_or_equal:today'],
            'start_time' => [$required, 'date_format:H:i', Rule::in($slots)],
            'end_time' => [$required, 'date_format:H:i', Rule::in($slots)],
            'activity_description' => [$required, 'string', 'min:10', 'max:1000'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function attributes(): array
    {
        return [
            'start_time' => 'jam mulai',
            'end_time' => 'jam selesai',
            'report_date' => 'tanggal laporan',
            'activity_description' => 'kegiatan tugas jabatan',
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
            $this->only('activity_description', 'remarks', 'start_time', 'end_time'),
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

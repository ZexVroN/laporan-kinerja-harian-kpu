<?php

namespace App\Http\Requests;

use App\Policies\DailyReportPolicy;
use App\Services\QuarterService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
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

        return [
            'report_date' => [$required, 'date_format:Y-m-d', 'before_or_equal:today'],
            'activity_description' => [$required, 'string', 'min:10', 'max:1000'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function attributes(): array
    {
        return [
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
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(array_map(
            fn ($value) => is_string($value) ? trim($value) : $value,
            $this->only('activity_description', 'remarks'),
        ));
    }

    public function after(): array
    {
        return [
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

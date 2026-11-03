<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Parameter penyaringan yang sama untuk daftar, rekap triwulan, dan ekspor. */
class ReportFilterRequest extends FormRequest
{
    public const SORTABLE = ['report_date', 'created_at', 'employee_name'];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:100'],
            'employee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'unit_id' => ['nullable', 'integer', 'exists:units,id'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'year' => ['nullable', 'integer', 'between:2000,2100', 'required_with:month,quarter'],
            'month' => ['nullable', 'integer', 'between:1,12'],
            'quarter' => ['nullable', 'integer', 'between:1,4'],
            'sort' => ['nullable', 'in:'.implode(',', self::SORTABLE)],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'between:5,100'],
            'format' => ['nullable', 'in:pdf,xlsx'],
        ];
    }

    public function attributes(): array
    {
        return [
            'employee_id' => 'pegawai',
            'unit_id' => 'unit kerja',
            'date_from' => 'tanggal awal',
            'date_to' => 'tanggal akhir',
            'year' => 'tahun',
            'month' => 'bulan',
            'quarter' => 'triwulan',
            'format' => 'format',
        ];
    }
}

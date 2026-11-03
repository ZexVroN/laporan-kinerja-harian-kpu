<?php

namespace App\Http\Controllers\Api\V1;

use App\Exports\ReportExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\ReportFilterRequest;
use App\Services\ActivityLogger;
use App\Services\ReportCompiler;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\Response;

class ReportExportController extends Controller
{
    /** Rekap (biasanya triwulan) dalam JSON untuk tampilan pratinjau. */
    public function summary(ReportFilterRequest $request): JsonResponse
    {
        return response()->json(['data' => ReportCompiler::compile($request->user(), $request->validated())]);
    }

    public function export(ReportFilterRequest $request): Response
    {
        $filters = $request->validated();
        $format = $filters['format'] ?? 'pdf';
        $data = ReportCompiler::compile($request->user(), $filters);
        $filename = $this->filename($data, $format);

        ActivityLogger::log('report.exported', "Mengunduh {$data['total']} laporan ({$data['period_label']}) sebagai ".strtoupper($format), properties: [
            'filters' => array_diff_key($filters, ['format' => true]),
        ]);

        if ($format === 'xlsx') {
            return Excel::download(new ReportExport($data), $filename, \Maatwebsite\Excel\Excel::XLSX);
        }

        return Pdf::loadView('pdf.report', ['data' => $data, 'logo' => $this->logoDataUri()])
            ->setPaper('a4', 'portrait')
            ->download($filename);
    }

    private function filename(array $data, string $format): string
    {
        $who = count($data['groups']) === 1 ? '-'.Str::slug($data['groups'][0]['employee']['full_name']) : '';

        return 'laporan-kinerja-'.Str::slug($data['period_label']).$who.'.'.$format;
    }

    /** Logo opsional: letakkan berkas di public/images/logo-instansi.png. */
    private function logoDataUri(): ?string
    {
        $path = public_path('images/logo-instansi.png');

        return is_file($path) ? 'data:image/png;base64,'.base64_encode((string) file_get_contents($path)) : null;
    }
}

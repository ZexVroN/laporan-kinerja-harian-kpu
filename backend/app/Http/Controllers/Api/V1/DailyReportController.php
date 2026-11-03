<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\DailyReportRequest;
use App\Http\Requests\ReportFilterRequest;
use App\Http\Resources\DailyReportResource;
use App\Models\DailyReport;
use App\Services\ActivityLogger;
use App\Services\ReportQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class DailyReportController extends Controller
{
    private const AUDITED = ['report_date', 'activity_description', 'remarks'];

    public function index(ReportFilterRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();

        $reports = ReportQuery::applySort(ReportQuery::build($request->user(), $filters), $filters)
            ->with(['employee', 'snapshotUnit'])
            ->paginate($filters['per_page'] ?? 25)
            ->withQueryString();

        return DailyReportResource::collection($reports);
    }

    public function store(DailyReportRequest $request): JsonResponse
    {
        Gate::authorize('create', DailyReport::class);

        $user = $request->user();
        $employee = $user->employee()->with('rank')->firstOrFail();

        $report = DB::transaction(function () use ($request, $user, $employee) {
            $report = new DailyReport($request->validated());
            $report->employee_id = $employee->id;
            $report->created_by = $user->id;
            $report->fillSnapshotFrom($employee)->save();

            ActivityLogger::log('report.created', "Menambah laporan tanggal {$report->report_date->format('d/m/Y')}", $report);

            return $report;
        });

        return (new DailyReportResource($report->load('employee', 'snapshotUnit')))
            ->additional(['message' => 'Laporan berhasil disimpan.'])
            ->response()
            ->setStatusCode(201);
    }

    public function show(DailyReport $report): DailyReportResource
    {
        Gate::authorize('view', $report);

        return new DailyReportResource($report->load('employee', 'snapshotUnit'));
    }

    public function update(DailyReportRequest $request, DailyReport $report): DailyReportResource
    {
        Gate::authorize('update', $report);

        DB::transaction(function () use ($request, $report) {
            $report->fill($request->validated());
            $report->updated_by = $request->user()->id;
            $report->save();

            $diff = ActivityLogger::diff($report, self::AUDITED);
            if ($diff['new'] !== []) {
                ActivityLogger::log('report.updated', "Mengubah laporan tanggal {$report->report_date->format('d/m/Y')} milik {$report->employee->full_name}", $report, $diff);
            }
        });

        return (new DailyReportResource($report->load('employee', 'snapshotUnit')))
            ->additional(['message' => 'Laporan berhasil diperbarui.']);
    }

    public function destroy(DailyReport $report): JsonResponse
    {
        Gate::authorize('delete', $report);

        DB::transaction(function () use ($report) {
            $report->delete();
            ActivityLogger::log('report.deleted', "Menghapus laporan tanggal {$report->report_date->format('d/m/Y')} milik {$report->employee->full_name}", $report, [
                'old' => array_intersect_key($report->getRawOriginal(), array_flip([...self::AUDITED, 'employee_id'])),
            ]);
        });

        return response()->json(['message' => 'Laporan berhasil dihapus.']);
    }
}

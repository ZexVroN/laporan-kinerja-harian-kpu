<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\PeriodLock;
use App\Models\Setting;
use App\Services\ActivityLogger;
use App\Services\QuarterService;
use App\Services\WorkHours;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Kunci periode, log aktivitas, dan pengaturan instansi. */
class AdministrationController extends Controller
{
    public function periodLocks(Request $request): JsonResponse
    {
        $year = (int) ($request->validate(['year' => ['nullable', 'integer', 'between:2000,2100']])['year'] ?? now()->year);
        $overrides = PeriodLock::query()->with('changer:id,name')->where('year', $year)->get()->keyBy('quarter');

        $data = collect(range(1, 4))->map(function (int $quarter) use ($year, $overrides) {
            [$start, $end] = QuarterService::range($year, $quarter);
            $override = $overrides->get($quarter);

            return [
                'year' => $year,
                'quarter' => $quarter,
                'label' => 'Triwulan '.QuarterService::roman($quarter),
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
                'auto_lock_at' => QuarterService::editDeadline($year, $quarter)->toIso8601String(),
                'is_locked' => QuarterService::isLocked($year, $quarter),
                'mode' => $override ? 'manual' : 'otomatis',
                'changed_by' => $override?->changer?->name,
                'changed_at' => $override?->updated_at?->toIso8601String(),
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function updatePeriodLock(Request $request): JsonResponse
    {
        $data = $request->validate([
            'year' => ['required', 'integer', 'between:2000,2100'],
            'quarter' => ['required', 'integer', 'between:1,4'],
            // null = kembali ke aturan otomatis
            'is_locked' => ['present', 'nullable', 'boolean'],
        ], [], ['year' => 'tahun', 'quarter' => 'triwulan', 'is_locked' => 'status kunci']);

        $where = ['year' => $data['year'], 'quarter' => $data['quarter']];
        $label = 'Triwulan '.QuarterService::roman($data['quarter'])." {$data['year']}";

        if ($data['is_locked'] === null) {
            PeriodLock::query()->where($where)->get()->each->delete();
            ActivityLogger::log('period.auto', "Mengembalikan kunci {$label} ke aturan otomatis");
        } else {
            PeriodLock::query()->updateOrCreate($where, ['is_locked' => $data['is_locked'], 'changed_by' => $request->user()->id]);
            ActivityLogger::log($data['is_locked'] ? 'period.locked' : 'period.unlocked', ($data['is_locked'] ? 'Mengunci ' : 'Membuka kunci ').$label);
        }

        return response()->json([
            'data' => ['is_locked' => QuarterService::isLocked($data['year'], $data['quarter'])],
            'message' => "Status kunci {$label} diperbarui.",
        ]);
    }

    public function activityLogs(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'user_id' => ['nullable', 'integer'],
            'action' => ['nullable', 'string', 'max:50'],
            'q' => ['nullable', 'string', 'max:100'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d'],
            'per_page' => ['nullable', 'integer', 'between:5,100'],
        ]);

        $logs = ActivityLog::query()
            ->with('user:id,name,username,role')
            ->when($filters['user_id'] ?? null, fn (Builder $q, $id) => $q->where('user_id', $id))
            ->when($filters['action'] ?? null, fn (Builder $q, $action) => $q->where('action', 'like', addcslashes($action, '%_\\').'%'))
            ->when($filters['q'] ?? null, fn (Builder $q, $term) => $q->where('description', 'like', '%'.addcslashes($term, '%_\\').'%'))
            ->when($filters['date_from'] ?? null, fn (Builder $q, $d) => $q->where('created_at', '>=', $d.' 00:00:00'))
            ->when($filters['date_to'] ?? null, fn (Builder $q, $d) => $q->where('created_at', '<=', $d.' 23:59:59'))
            ->latest('id')
            ->paginate($filters['per_page'] ?? 25)
            ->withQueryString();

        return response()->json($logs->through(fn (ActivityLog $log) => [
            'id' => $log->id,
            'action' => $log->action,
            'description' => $log->description,
            'properties' => $log->properties,
            'subject_type' => $log->subject_type ? class_basename($log->subject_type) : null,
            'subject_id' => $log->subject_id,
            'ip_address' => $log->ip_address,
            'user' => $log->user ? ['id' => $log->user->id, 'name' => $log->user->name, 'username' => $log->user->username, 'role_label' => $log->user->role->label()] : null,
            'created_at' => $log->created_at->toIso8601String(),
        ]));
    }

    /** Informasi publik untuk halaman masuk (tanpa autentikasi). */
    public function appInfo(): JsonResponse
    {
        $settings = Setting::allValues();

        return response()->json(['data' => [
            'app_name' => $settings['app_name'],
            'instansi_nama' => $settings['instansi_nama'],
            'work_hours' => WorkHours::describe(),
        ]]);
    }

    public function settings(): JsonResponse
    {
        return response()->json(['data' => Setting::allValues()]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'app_name' => ['required', 'string', 'max:40'],
            'instansi_nama' => ['required', 'string', 'max:150'],
            'instansi_kop_1' => ['required', 'string', 'max:150'],
            'instansi_kop_2' => ['nullable', 'string', 'max:150'],
            'instansi_alamat' => ['nullable', 'string', 'max:255'],
            'kota_ttd' => ['required', 'string', 'max:60'],
        ], [], [
            'app_name' => 'nama aplikasi', 'instansi_nama' => 'nama instansi', 'instansi_kop_1' => 'kop baris 1',
            'instansi_kop_2' => 'kop baris 2', 'instansi_alamat' => 'alamat', 'kota_ttd' => 'kota penandatanganan',
        ]);

        Setting::store($data);
        ActivityLogger::log('settings.updated', 'Mengubah pengaturan instansi');

        return response()->json(['data' => Setting::allValues(), 'message' => 'Pengaturan disimpan.']);
    }
}

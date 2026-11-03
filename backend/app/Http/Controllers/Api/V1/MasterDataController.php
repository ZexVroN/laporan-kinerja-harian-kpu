<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ActionPlan;
use App\Models\DailyReport;
use App\Models\Rank;
use App\Models\Unit;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Unit kerja dan pangkat/golongan. Baca: semua pengguna; ubah: Administrator. */
class MasterDataController extends Controller
{
    public function units(): JsonResponse
    {
        return response()->json(['data' => Unit::query()->withCount('employees')->orderBy('name')->get()]);
    }

    public function storeUnit(Request $request): JsonResponse
    {
        $unit = Unit::create($this->validateUnit($request));
        ActivityLogger::log('master.unit_created', "Menambah unit kerja {$unit->name}", $unit);

        return response()->json(['data' => $unit, 'message' => 'Unit kerja ditambahkan.'], 201);
    }

    public function updateUnit(Request $request, Unit $unit): JsonResponse
    {
        $unit->fill($this->validateUnit($request, $unit))->save();
        ActivityLogger::log('master.unit_updated', "Mengubah unit kerja {$unit->name}", $unit, ActivityLogger::diff($unit, ['name', 'code', 'is_active']));

        return response()->json(['data' => $unit, 'message' => 'Unit kerja diperbarui.']);
    }

    public function destroyUnit(Unit $unit): JsonResponse
    {
        $used = $unit->employees()->withTrashed()->exists()
            || DailyReport::withTrashed()->where('snapshot_unit_id', $unit->id)->exists();

        if ($used) {
            return response()->json(['message' => 'Unit kerja sudah dipakai pegawai atau laporan. Nonaktifkan saja.'], 422);
        }

        $unit->delete();
        ActivityLogger::log('master.unit_deleted', "Menghapus unit kerja {$unit->name}");

        return response()->json(['message' => 'Unit kerja dihapus.']);
    }

    public function ranks(): JsonResponse
    {
        return response()->json(['data' => Rank::query()->orderBy('sort_order')->get()]);
    }

    public function storeRank(Request $request): JsonResponse
    {
        $rank = Rank::create($this->validateRank($request));
        ActivityLogger::log('master.rank_created', "Menambah pangkat {$rank->label()}", $rank);

        return response()->json(['data' => $rank, 'message' => 'Pangkat/golongan ditambahkan.'], 201);
    }

    public function updateRank(Request $request, Rank $rank): JsonResponse
    {
        $rank->fill($this->validateRank($request, $rank))->save();
        ActivityLogger::log('master.rank_updated', "Mengubah pangkat {$rank->label()}", $rank, ActivityLogger::diff($rank, ['code', 'name', 'sort_order']));

        return response()->json(['data' => $rank, 'message' => 'Pangkat/golongan diperbarui.']);
    }

    public function destroyRank(Rank $rank): JsonResponse
    {
        if ($rank->employees()->withTrashed()->exists()) {
            return response()->json(['message' => 'Pangkat/golongan masih dipakai pegawai.'], 422);
        }

        $rank->delete();
        ActivityLogger::log('master.rank_deleted', "Menghapus pangkat {$rank->label()}");

        return response()->json(['message' => 'Pangkat/golongan dihapus.']);
    }

    public function actionPlans(): JsonResponse
    {
        return response()->json(['data' => ActionPlan::query()->withCount('reports')->orderBy('sort_order')->orderBy('name')->get()]);
    }

    public function storeActionPlan(Request $request): JsonResponse
    {
        $plan = ActionPlan::create($this->validateActionPlan($request) + ['sort_order' => (int) ActionPlan::max('sort_order') + 1]);
        ActivityLogger::log('master.action_plan_created', "Menambah Rencana Aksi {$plan->name}", $plan);

        return response()->json(['data' => $plan, 'message' => 'Rencana Aksi ditambahkan.'], 201);
    }

    public function updateActionPlan(Request $request, ActionPlan $actionPlan): JsonResponse
    {
        $actionPlan->fill($this->validateActionPlan($request, $actionPlan))->save();
        ActivityLogger::log('master.action_plan_updated', "Mengubah Rencana Aksi {$actionPlan->name}", $actionPlan, ActivityLogger::diff($actionPlan, ['name', 'sort_order', 'is_active']));

        return response()->json(['data' => $actionPlan, 'message' => 'Rencana Aksi diperbarui.']);
    }

    public function destroyActionPlan(ActionPlan $actionPlan): JsonResponse
    {
        if (DailyReport::withTrashed()->where('action_plan_id', $actionPlan->id)->exists()) {
            return response()->json(['message' => 'Rencana Aksi sudah dipakai di laporan. Nonaktifkan saja agar tidak muncul di formulir.'], 422);
        }

        $actionPlan->delete();
        ActivityLogger::log('master.action_plan_deleted', "Menghapus Rencana Aksi {$actionPlan->name}");

        return response()->json(['message' => 'Rencana Aksi dihapus.']);
    }

    private function validateActionPlan(Request $request, ?ActionPlan $plan = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:200', Rule::unique('action_plans', 'name')->ignore($plan?->id)],
            'sort_order' => ['sometimes', 'integer', 'between:0,999'],
            'is_active' => ['sometimes', 'boolean'],
        ], [], ['name' => 'nama rencana aksi', 'sort_order' => 'urutan']);
    }

    private function validateUnit(Request $request, ?Unit $unit = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:150', Rule::unique('units', 'name')->ignore($unit?->id)],
            'code' => ['nullable', 'string', 'max:30', Rule::unique('units', 'code')->ignore($unit?->id)],
            'is_active' => ['sometimes', 'boolean'],
        ], [], ['name' => 'nama unit', 'code' => 'kode']);
    }

    private function validateRank(Request $request, ?Rank $rank = null): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:10', Rule::unique('ranks', 'code')->ignore($rank?->id)],
            'name' => ['required', 'string', 'max:80'],
            'sort_order' => ['sometimes', 'integer', 'between:0,999'],
        ], [], ['code' => 'golongan', 'name' => 'nama pangkat']);
    }
}

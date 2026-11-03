<?php

namespace App\Http\Resources;

use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Employee */
class EmployeeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'nip' => $this->nip,
            'nip_formatted' => Employee::formatNip($this->nip),
            'position' => $this->position,
            'rank' => $this->whenLoaded('rank', fn () => $this->rank ? [
                'id' => $this->rank->id,
                'code' => $this->rank->code,
                'name' => $this->rank->name,
                'label' => $this->rank->label(),
            ] : null),
            'unit' => $this->whenLoaded('unit', fn () => ['id' => $this->unit->id, 'name' => $this->unit->name]),
            'supervisor' => $this->whenLoaded('supervisor', fn () => $this->supervisor ? [
                'id' => $this->supervisor->id,
                'full_name' => $this->supervisor->full_name,
                'nip' => $this->supervisor->nip,
                'position' => $this->supervisor->position,
            ] : null),
            'user' => $this->whenLoaded('user', fn () => $this->user ? [
                'id' => $this->user->id,
                'username' => $this->user->username,
                'email' => $this->user->email,
                'role' => $this->user->role->value,
                'role_label' => $this->user->role->label(),
                'is_active' => $this->user->is_active,
                'last_login_at' => $this->user->last_login_at?->toIso8601String(),
            ] : null),
            'reports_count' => $this->whenCounted('reports'),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
        ];
    }
}

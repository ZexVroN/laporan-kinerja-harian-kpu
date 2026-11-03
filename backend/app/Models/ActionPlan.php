<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Rencana Aksi bersama yang dipilih pegawai saat mengisi laporan (dikelola Administrator). */
class ActionPlan extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'sort_order' => 'integer'];
    }

    public function reports(): HasMany
    {
        return $this->hasMany(DailyReport::class);
    }
}

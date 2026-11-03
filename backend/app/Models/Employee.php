<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'full_name',
        'nip',
        'rank_id',
        'position',
        'unit_id',
        'supervisor_id',
    ];

    public function rank(): BelongsTo
    {
        return $this->belongsTo(Rank::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'supervisor_id')->withTrashed();
    }

    public function user(): HasOne
    {
        return $this->hasOne(User::class);
    }

    public function reports(): HasMany
    {
        return $this->hasMany(DailyReport::class);
    }

    /** Pangkat lengkap, contoh: "Penata Muda Tk. I (III/b)". */
    public function rankLabel(): ?string
    {
        return $this->rank?->label();
    }

    /** NIP dengan spasi baku: 19900314 201503 2 007. */
    public static function formatNip(?string $nip): ?string
    {
        if ($nip === null || strlen($nip) !== 18) {
            return $nip;
        }

        return substr($nip, 0, 8).' '.substr($nip, 8, 6).' '.substr($nip, 14, 1).' '.substr($nip, 15, 3);
    }
}

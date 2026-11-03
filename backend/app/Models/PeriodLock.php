<?php

namespace App\Models;

use App\Services\QuarterService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PeriodLock extends Model
{
    protected $fillable = ['year', 'quarter', 'is_locked', 'changed_by'];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'quarter' => 'integer',
            'is_locked' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saved(fn () => QuarterService::flushLockCache());
        static::deleted(fn () => QuarterService::flushLockCache());
    }

    public function changer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}

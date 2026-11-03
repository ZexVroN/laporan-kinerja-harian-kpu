<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ActivityLogger
{
    /** @param array<string, mixed> $properties */
    public static function log(string $action, string $description, ?Model $subject = null, array $properties = [], ?User $user = null): ActivityLog
    {
        $request = request();

        return ActivityLog::create([
            'user_id' => $user?->id ?? $request->user()?->id,
            'action' => $action,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'description' => Str::limit($description, 250),
            'properties' => $properties ?: null,
            'ip_address' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 250, ''),
        ]);
    }

    /**
     * Kolom yang berubah pada save() terakhir, nilai mentah sebelum/sesudah.
     *
     * @param list<string> $fields
     * @return array{old: array<string, mixed>, new: array<string, mixed>}
     */
    public static function diff(Model $model, array $fields): array
    {
        $previous = $model->getPrevious();
        $old = [];
        $new = [];
        foreach ($fields as $field) {
            if ($model->wasChanged($field)) {
                $old[$field] = $previous[$field] ?? null;
                $new[$field] = $model->getRawOriginal($field);
            }
        }

        return ['old' => $old, 'new' => $new];
    }
}

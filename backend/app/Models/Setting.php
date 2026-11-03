<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    /** Kunci yang boleh diubah Administrator beserta nilai bawaannya. */
    public const DEFAULTS = [
        'app_name' => 'SILAKH',
        'instansi_nama' => 'KPU Kabupaten Merauke',
        'instansi_kop_1' => 'KOMISI PEMILIHAN UMUM',
        'instansi_kop_2' => 'KABUPATEN MERAUKE',
        'instansi_alamat' => '',
        'kota_ttd' => 'Merauke',
    ];

    private const CACHE_KEY = 'silakh.settings';

    /** @return array<string, string> */
    public static function allValues(): array
    {
        $stored = Cache::rememberForever(self::CACHE_KEY, fn () => static::query()->pluck('value', 'key')->all());

        return array_merge(self::DEFAULTS, array_intersect_key($stored, self::DEFAULTS));
    }

    public static function value(string $key): string
    {
        return (string) (static::allValues()[$key] ?? '');
    }

    /** @param array<string, string|null> $values */
    public static function store(array $values): void
    {
        foreach (array_intersect_key($values, self::DEFAULTS) as $key => $value) {
            static::query()->updateOrCreate(['key' => $key], ['value' => $value ?? '']);
        }

        Cache::forget(self::CACHE_KEY);
    }
}

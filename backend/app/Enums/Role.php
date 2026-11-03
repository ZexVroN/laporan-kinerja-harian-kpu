<?php

namespace App\Enums;

enum Role: string
{
    case Pegawai = 'pegawai';
    case Admin = 'admin';
    case Pimpinan = 'pimpinan';

    public function label(): string
    {
        return match ($this) {
            self::Pegawai => 'Pegawai',
            self::Admin => 'Administrator',
            self::Pimpinan => 'Pimpinan',
        };
    }

    /** Peran yang boleh melihat laporan seluruh pegawai. */
    public function seesAllReports(): bool
    {
        return $this !== self::Pegawai;
    }
}

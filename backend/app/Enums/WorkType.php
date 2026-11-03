<?php

namespace App\Enums;

enum WorkType: string
{
    case Trajectory = 'trajectory';
    case NonTrajectory = 'non_trajectory';

    public function label(): string
    {
        return match ($this) {
            self::Trajectory => 'Trajectory',
            self::NonTrajectory => 'Non-Trajectory',
        };
    }
}

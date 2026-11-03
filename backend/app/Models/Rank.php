<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Rank extends Model
{
    use HasFactory;

    protected $fillable = ['code', 'name', 'sort_order'];

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    public function label(): string
    {
        return "{$this->name} ({$this->code})";
    }
}

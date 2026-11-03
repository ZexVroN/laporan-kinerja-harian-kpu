<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>{{ $data['title'] }}</title>
<style>
    @page { margin: 1.6cm 1.8cm 1.8cm 1.8cm; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #111; line-height: 1.35; }
    .kop { width: 100%; border-bottom: 3px double #111; padding-bottom: 6px; margin-bottom: 14px; }
    .kop td { vertical-align: middle; }
    .kop .logo { width: 70px; }
    .kop .logo img { width: 62px; }
    .kop .text { text-align: center; }
    .kop .l1 { font-size: 14pt; font-weight: bold; letter-spacing: 0.5px; }
    .kop .l2 { font-size: 15pt; font-weight: bold; letter-spacing: 0.5px; }
    .kop .addr { font-size: 9.5pt; }
    h1 { font-size: 12pt; text-align: center; text-decoration: underline; margin: 0; }
    .period { text-align: center; margin: 2px 0 14px; }
    table.identity td { padding: 1px 0; vertical-align: top; }
    table.identity td.k { width: 130px; }
    table.identity td.s { width: 14px; }
    table.grid { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; }
    table.grid th, table.grid td { border: 1px solid #111; padding: 4px 5px; vertical-align: top; }
    table.grid th { background: #ececec; }
    table.grid td.c { text-align: center; white-space: nowrap; }
    table.grid tr { page-break-inside: avoid; }
    table.grid tfoot td { font-weight: bold; background: #ececec; }
    table.sign { width: 100%; margin-top: 22px; page-break-inside: avoid; }
    table.sign td { width: 50%; vertical-align: top; }
    .space { height: 62px; }
    .name { font-weight: bold; text-decoration: underline; }
    .page-break { page-break-after: always; }
    .footer { position: fixed; bottom: -1.1cm; left: 0; right: 0; font-size: 8pt; color: #555; }
    .empty { text-align: center; margin-top: 40px; font-style: italic; }
</style>
</head>
<body>
@php
    $s = $data['settings'];
    $signDate = \Carbon\CarbonImmutable::parse($data['period_to'])->min(today());
@endphp

<div class="footer">Dicetak dari {{ $s['app_name'] }} pada {{ \Carbon\Carbon::parse($data['generated_at'])->format('d/m/Y H.i') }} WIT</div>

@forelse ($data['groups'] as $group)
    <table class="kop">
        <tr>
            <td class="logo">@if ($logo)<img src="{{ $logo }}" alt="">@endif</td>
            <td class="text">
                <div class="l1">{{ $s['instansi_kop_1'] }}</div>
                @if ($s['instansi_kop_2'])<div class="l2">{{ $s['instansi_kop_2'] }}</div>@endif
                @if ($s['instansi_alamat'])<div class="addr">{{ $s['instansi_alamat'] }}</div>@endif
            </td>
            <td class="logo"></td>
        </tr>
    </table>

    <h1>{{ $data['title'] }}</h1>
    <div class="period">{{ $data['period_label'] }}</div>

    <table class="identity">
        <tr><td class="k">Nama</td><td class="s">:</td><td>{{ $group['employee']['full_name'] }}</td></tr>
        <tr><td class="k">NIP</td><td class="s">:</td><td>{{ $group['employee']['nip_formatted'] }}</td></tr>
        <tr><td class="k">Pangkat/Golongan</td><td class="s">:</td><td>{{ $group['employee']['rank'] ?? '-' }}</td></tr>
        <tr><td class="k">Jabatan</td><td class="s">:</td><td>{{ $group['employee']['position'] }}</td></tr>
        <tr><td class="k">Unit Kerja</td><td class="s">:</td><td>{{ $group['employee']['unit'] }}</td></tr>
    </table>

    <table class="grid">
        <thead>
            <tr>
                <th style="width: 28px;">No.</th>
                <th style="width: 72px;">Tanggal</th>
                <th style="width: 70px;">Waktu</th>
                <th>Kegiatan Tugas Jabatan</th>
                <th style="width: 150px;">Keterangan</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($group['reports'] as $i => $report)
                <tr>
                    <td class="c">{{ $i + 1 }}</td>
                    <td class="c">{{ $report['report_date_formatted'] }}</td>
                    <td class="c">{{ $report['time_range'] ?? '-' }}</td>
                    <td>{!! nl2br(e($report['activity_description'])) !!}</td>
                    <td>{!! nl2br(e($report['remarks'] ?? '')) !!}</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="4" style="text-align: right;">Jumlah kegiatan ({{ $group['days_reported'] }} hari)</td>
                <td>{{ $group['total'] }} kegiatan</td>
            </tr>
        </tfoot>
    </table>

    <table class="sign">
        <tr>
            <td>
                <div>&nbsp;</div>
                <div>Mengetahui,</div>
                <div>{{ $group['supervisor']['position'] ?? 'Atasan Langsung' }}</div>
                <div class="space"></div>
                <div class="name">{{ $group['supervisor']['full_name'] ?? '................................................' }}</div>
                <div>NIP {{ $group['supervisor']['nip_formatted'] ?? '.........................................' }}</div>
            </td>
            <td>
                <div>{{ $s['kota_ttd'] }}, {{ \App\Services\QuarterService::formatDate($signDate) }}</div>
                <div>Pegawai yang bersangkutan,</div>
                <div>&nbsp;</div>
                <div class="space"></div>
                <div class="name">{{ $group['employee']['full_name'] }}</div>
                <div>NIP {{ $group['employee']['nip_formatted'] }}</div>
            </td>
        </tr>
    </table>

    @unless ($loop->last)<div class="page-break"></div>@endunless
@empty
    <h1>{{ $data['title'] }}</h1>
    <div class="period">{{ $data['period_label'] }}</div>
    <p class="empty">Tidak ada laporan pada periode dan penyaring yang dipilih.</p>
@endforelse
</body>
</html>

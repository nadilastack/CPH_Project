<!DOCTYPE html>
<html>
<head>
    <title>{{ $title }}</title>
    <style>
        body { font-family: 'Helvetica', sans-serif; color: #333; margin: 0; padding: 0; }
        .header { text-align: center; border-bottom: 2px solid #22c55e; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #166534; font-size: 24px; }
        .header p { margin: 5px 0 0; color: #666; font-size: 14px; }
        .info { margin-bottom: 20px; font-size: 12px; }
        table { border-collapse: collapse; width: 100%; table-layout: fixed; word-wrap: break-word; }
        th { background-color: #f0fdf4; color: #166534; border: 1px solid #dcfce7; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
        td { border: 1px solid #f0f0f0; padding: 8px; text-align: left; font-size: 10px; vertical-align: top; }
        tr:nth-child(even) { background-color: #fafafa; }
        .footer { margin-top: 30px; text-align: right; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
        
        /* Top Section Styles */
        .top-section { background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 8px; padding: 15px; margin-bottom: 25px; }
        .top-section h3 { margin: 0 0 15px 0; color: #166534; font-size: 14px; border-bottom: 1px solid #dcfce7; padding-bottom: 8px; }
        .top-table { width: 100%; }
        .top-table th { background-color: #166534; color: white; padding: 8px; font-size: 10px; }
        .top-table td { padding: 8px; font-size: 10px; border: 1px solid #dcfce7; }
        .top-table tr:nth-child(even) { background-color: #ecfdf5; }
        .rank { display: inline-block; width: 20px; height: 20px; background: #166534; color: white; text-align: center; line-height: 20px; border-radius: 50%; font-size: 10px; font-weight: bold; }
        
        /* Summary Box */
        .summary-box { display: inline-block; background: white; border: 1px solid #dcfce7; padding: 10px 15px; margin: 5px; border-radius: 5px; text-align: center; }
        .summary-box .value { font-size: 16px; font-weight: bold; color: #166534; }
        .summary-box .label { font-size: 10px; color: #666; }
        
        .section-title { background: #166534; color: white; padding: 10px; margin: 25px 0 15px 0; font-size: 12px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>CENTRAL PALANTEA HIDROPONIK</h1>
        <p>Jl. Melayu, Babussalam, Mandau, Bengkalis Regency, Riau 28784</p>
        <h2 style="margin-top: 15px; color: #333;">{{ $title }}</h2>
    </div>
    
    <div class="info">
        <p><strong>{{ $period }}</strong></p>
        <p>Tanggal Cetak: {{ date('d/m/Y H:i') }}</p>
    </div>

    {{-- SUMMARY REKAPITULASI PENJUALAN (OMZET, CASH, QRIS, TRANSAKSI) --}}
    @if(isset($summary))
    <table style="width: 100%; margin-bottom: 20px; border-collapse: separate; border-spacing: 8px 0;">
        <tr>
            <td style="width: 25%; padding: 12px 10px; background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; text-align: center;">
                <div style="font-size: 9px; color: #166534; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">TOTAL PENJUALAN (OMZET)</div>
                <div style="font-size: 15px; font-weight: bold; color: #15803d; margin-top: 5px;">Rp {{ number_format($summary['total_omzet'] ?? 0, 0, ',', '.') }}</div>
                <div style="font-size: 8px; color: #16a34a; margin-top: 3px;">Akumulasi omzet lunas</div>
            </td>
            <td style="width: 25%; padding: 12px 10px; background-color: #ecfdf5; border: 1.5px solid #6ee7b7; border-radius: 8px; text-align: center;">
                <div style="font-size: 9px; color: #065f46; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">TOTAL KAS TUNAI (CASH)</div>
                <div style="font-size: 15px; font-weight: bold; color: #047857; margin-top: 5px;">Rp {{ number_format($summary['total_cash'] ?? 0, 0, ',', '.') }}</div>
                <div style="font-size: 8px; color: #059669; margin-top: 3px;">Pemasukan uang fisik</div>
            </td>
            <td style="width: 25%; padding: 12px 10px; background-color: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 8px; text-align: center;">
                <div style="font-size: 9px; color: #1e40af; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">TOTAL NON-TUNAI (QRIS)</div>
                <div style="font-size: 15px; font-weight: bold; color: #2563eb; margin-top: 5px;">Rp {{ number_format($summary['total_qris'] ?? 0, 0, ',', '.') }}</div>
                <div style="font-size: 8px; color: #3b82f6; margin-top: 3px;">Mutasi QRIS / Bank</div>
            </td>
            <td style="width: 25%; padding: 12px 10px; background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; text-align: center;">
                <div style="font-size: 9px; color: #334155; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">TOTAL TRANSAKSI</div>
                <div style="font-size: 15px; font-weight: bold; color: #0f172a; margin-top: 5px;">{{ number_format($summary['total_transaksi'] ?? 0, 0, ',', '.') }} Pesanan</div>
                <div style="font-size: 8px; color: #64748b; margin-top: 3px;">Jumlah order terlayani</div>
            </td>
        </tr>
    </table>
    @endif

    {{-- TOP PRODUCTS SECTION (For Penjualan Report) --}}
    @if(isset($topProducts) && count($topProducts) > 0)
    <div class="top-section">
        <h3>🏆 TOP 5 PRODUK TERLARIS</h3>
        <table class="top-table">
            <thead>
                <tr>
                    <th style="width: 8%;">#</th>
                    <th style="width: 37%;">Nama Produk</th>
                    <th style="width: 20%;">Qty Terjual</th>
                    <th style="width: 35%;">Total Omzet</th>
                </tr>
            </thead>
            <tbody>
                @foreach($topProducts as $index => $product)
                <tr>
                    <td><span class="rank">{{ $index + 1 }}</span></td>
                    <td><strong>{{ $product['nama'] }}</strong></td>
                    <td>{{ number_format($product['total_qty'], 0, ',', '.') }} pcs</td>
                    <td>Rp {{ number_format($product['total_omzet'], 0, ',', '.') }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    {{-- TOP VISIT TYPES SECTION (For Kunjungan Report) --}}
    @if(isset($topVisitTypes) && count($topVisitTypes) > 0)
    <div class="top-section">
        <h3>TOP TIPE KUNJUNGAN TERFAVORIT</h3>
        <table class="top-table">
            <thead>
                <tr>
                    <th style="width: 8%;">#</th>
                    <th style="width: 32%;">Tipe Kunjungan</th>
                    <th style="width: 20%;">Total Kunjungan</th>
                    <th style="width: 20%;">Total Pengunjung</th>
                    <th style="width: 20%;">Total Pendapatan</th>
                </tr>
            </thead>
            <tbody>
                @foreach($topVisitTypes as $index => $type)
                <tr>
                    <td><span class="rank">{{ $index + 1 }}</span></td>
                    <td><strong>{{ $type['nama_tipe'] }}</strong></td>
                    <td>{{ number_format($type['total_kunjungan'], 0, ',', '.') }}x</td>
                    <td>{{ number_format($type['total_pengunjung'], 0, ',', '.') }} orang</td>
                    <td>Rp {{ number_format($type['total_pendapatan'], 0, ',', '.') }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    {{-- MAIN DATA TABLE --}}
    <div class="section-title">DETAIL DATA</div>
    <table>
        <thead>
            <tr>
                @foreach($headers as $header)
                    <th>{{ $header }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @foreach($data as $row)
                <tr>
                    @foreach($row as $header => $value)
                        @php
                            $displayValue = $value;
                            if (strpos($header, 'Telepon') !== false) {
                                $displayValue = trim($value, "'");
                            } elseif (is_numeric($value) && strpos($header, 'ID') === false && $value > 1000) {
                                $displayValue = number_format($value, 0, ',', '.');
                            }
                        @endphp
                        <td>{{ $displayValue }}</td>
                    @endforeach
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        <p>Laporan ini dihasilkan secara otomatis oleh sistem Manajemen CPH.</p>
    </div>
</body>
</html>

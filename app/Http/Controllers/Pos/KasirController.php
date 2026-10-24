<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Models\PosFood;
use App\Models\PosFoodCategory;
use App\Models\PosOrder;
use App\Models\PosOrderItem;
use App\Models\PosPayment;
use App\Models\PosTable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class KasirController extends Controller
{
    /**
     * Tampilkan Halaman Utama POS Kasir
     */
    public function index()
    {
        // 1. Auto-seed Pempek Palantea jika belum ada di database
        try {
            if (!PosFood::where('nama', 'like', '%Pempek%')->exists()) {
                $snackCat = PosFoodCategory::where('nama_kategori', 'Snack')->first();
                $catId = $snackCat ? $snackCat->id : 4;
                PosFood::create([
                    'category_id' => $catId,
                    'nama' => 'Pempek Palantea (Isi 6 Pcs)',
                    'deskripsi' => '★ Menu Baru - Pempek asli ikan tenggiri disajikan dengan kuah cuko segar (Isi 6 pcs)',
                    'harga' => 30000,
                    'gambar' => 'pos_foods/pempek_palantea.png',
                    'status' => 'Aktif',
                ]);
            }
        } catch (\Throwable $e) {}

        // 2. Pastikan kolom is_served ada di pos_order_items
        try {
            if (!\Illuminate\Support\Facades\Schema::hasColumn('pos_order_items', 'is_served')) {
                \Illuminate\Support\Facades\DB::statement("ALTER TABLE pos_order_items ADD COLUMN is_served TINYINT(1) NOT NULL DEFAULT 0");
            }
        } catch (\Throwable $e) {}

        $this->ensureColumnsExist();

        // Auto-recovery: bebaskan meja yang berstatus OCCUPIED tapi tidak memiliki pesanan aktif HARI INI
        try {
            $todayStart = now()->startOfDay();
            $occupiedTables = PosTable::where('status', 'OCCUPIED')->get();
            foreach ($occupiedTables as $tbl) {
                if ($tbl->nomor_meja === 'KASIR') {
                    $tbl->update(['status' => 'AVAILABLE']);
                    continue;
                }
                $hasActiveToday = PosOrder::where('table_id', $tbl->id)
                    ->whereIn('order_status', ['NEW', 'PROCESSING', 'READY'])
                    ->where('created_at', '>=', $todayStart)
                    ->exists();

                if (!$hasActiveToday) {
                    $tbl->update(['status' => 'AVAILABLE']);
                }
            }
        } catch (\Throwable $e) {}

        $tables = PosTable::with(['activeOrder.items.food', 'activeOrder.cashier', 'activeOrder.payment'])
            ->orderBy('nomor_meja', 'asc')
            ->get();

        $categories = PosFoodCategory::with(['foods' => function ($query) {
            $query->where('status', 'Aktif')->orderBy('nama', 'asc');
        }])->where('status', 'Aktif')->get();

        $activeOrders = PosOrder::with(['table', 'cashier', 'items.food', 'payment'])
            ->whereIn('order_status', ['NEW', 'PROCESSING', 'READY'])
            ->orWhere(function ($query) {
                $query->where('order_status', 'COMPLETED')
                    ->whereDate('updated_at', now()->today());
            })
            ->latest()
            ->take(50)
            ->get();

        return Inertia::render('POS/Kasir', [
            'tables' => $tables,
            'categories' => $categories,
            'activeOrders' => $activeOrders,
        ]);
    }

    /**
     * Buat Pesanan Baru dari Kasir
     */
    private function ensureColumnsExist()
    {
        try {
            if (!\Illuminate\Support\Facades\Schema::hasColumn('pos_payments', 'cash_amount')) {
                \Illuminate\Support\Facades\DB::statement("ALTER TABLE pos_payments ADD COLUMN cash_amount INT NOT NULL DEFAULT 0");
            }
            if (!\Illuminate\Support\Facades\Schema::hasColumn('pos_payments', 'qris_amount')) {
                \Illuminate\Support\Facades\DB::statement("ALTER TABLE pos_payments ADD COLUMN qris_amount INT NOT NULL DEFAULT 0");
            }
            if (!\Illuminate\Support\Facades\Schema::hasColumn('pos_payments', 'catatan_koreksi')) {
                \Illuminate\Support\Facades\DB::statement("ALTER TABLE pos_payments ADD COLUMN catatan_koreksi TEXT NULL");
            }
            if (!\Illuminate\Support\Facades\Schema::hasColumn('pos_order_items', 'status')) {
                \Illuminate\Support\Facades\DB::statement("ALTER TABLE pos_order_items ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'");
            }
            if (!\Illuminate\Support\Facades\Schema::hasColumn('pos_order_items', 'batal_alasan')) {
                \Illuminate\Support\Facades\DB::statement("ALTER TABLE pos_order_items ADD COLUMN batal_alasan VARCHAR(255) NULL");
            }
            if (!\Illuminate\Support\Facades\Schema::hasColumn('pos_order_items', 'batch_no')) {
                \Illuminate\Support\Facades\DB::statement("ALTER TABLE pos_order_items ADD COLUMN batch_no INT NOT NULL DEFAULT 1");
            }
            if (!\Illuminate\Support\Facades\Schema::hasColumn('pos_orders', 'dp_amount')) {
                \Illuminate\Support\Facades\DB::statement("ALTER TABLE pos_orders ADD COLUMN dp_amount INT NOT NULL DEFAULT 0");
            }
            try {
                \Illuminate\Support\Facades\DB::statement("ALTER TABLE pos_orders MODIFY COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID'");
            } catch (\Throwable $e) {}

            try {
                if (!PosTable::where('nomor_meja', 'KASIR')->exists()) {
                    PosTable::create([
                        'nomor_meja' => 'KASIR',
                        'status' => 'AVAILABLE'
                    ]);
                }
            } catch (\Throwable $e) {}
        } catch (\Exception $e) {
            // Ignore jika sudah ada
        }
    }

    public function storeOrder(Request $request)
    {
        $this->ensureColumnsExist();

        $isQuickOrder = $request->boolean('is_quick_order') || ($request->input('order_type') === 'quick');

        $request->validate([
            'table_id' => 'required|exists:pos_tables,id',
            'nama_pelanggan' => $isQuickOrder ? 'nullable|string|max:100' : 'required|string|min:2|max:100',
            'status_pembayaran' => 'nullable|in:Cash,QRIS,SPLIT,UNPAID,DP',
            'metode_pembayaran' => 'nullable|in:Cash,QRIS,SPLIT,DP',
            'dp_amount' => 'nullable|integer|min:0',
            'dp_method' => 'nullable|in:Cash,QRIS',
            'jumlah_bayar' => 'nullable|integer|min:0',
            'cash_amount' => 'nullable|integer|min:0',
            'qris_amount' => 'nullable|integer|min:0',
            'items' => 'required|array|min:1',
            'items.*.food_id' => 'required|exists:pos_foods,id',
            'items.*.jumlah' => 'required|integer|min:1',
            'items.*.catatan' => 'nullable|string|max:255',
            'catatan' => 'nullable|string|max:500',
        ], [
            'table_id.required' => 'Pilih nomor antrian terlebih dahulu.',
            'nama_pelanggan.required' => 'Nama pelanggan wajib diisi!',
            'nama_pelanggan.min' => 'Nama pelanggan minimal 2 karakter!',
            'items.required' => 'Pesanan tidak boleh kosong.',
            'items.min' => 'Minimal pilih 1 item makanan/minuman.',
        ]);

        $namaPelanggan = trim((string) $request->nama_pelanggan);
        if ($isQuickOrder) {
            if (empty($namaPelanggan)) {
                $namaPelanggan = 'Pelanggan Kasir';
            }
        } else {
            if (empty($namaPelanggan) || strcasecmp($namaPelanggan, 'Pelanggan') === 0) {
                return back()->with('error', 'Nama pelanggan wajib diisi secara spesifik (tidak boleh kosong atau hanya bertuliskan "Pelanggan")!');
            }
        }

        try {
            DB::beginTransaction();

            // Pessimistic Locking untuk mencegah double order pada nomor antrian sama
            $table = PosTable::where('id', $request->table_id)->lockForUpdate()->first();

            $isKasirTable = $table && ($table->nomor_meja === 'KASIR');
            if (!$table || (!$isKasirTable && $table->status !== 'AVAILABLE')) {
                DB::rollBack();
                return back()->with('error', 'Nomor Antrian ' . ($table ? $table->nomor_meja : '') . ' sedang terisi atau perlu dibersihkan!');
            }

            // Generate Nomor Pesanan Unik: CP-POS-YYYYMMDD-XXX (Anti-Collision & Auto-Increment)
            $todayStr = now()->format('Ymd');
            $prefix = 'CP-POS-' . $todayStr . '-';

            // Ambil nomor pesanan tertinggi hari ini untuk mencegah bentrok duplicate entry
            $lastOrder = PosOrder::where('nomor_pesanan', 'like', $prefix . '%')
                ->orderBy('id', 'desc')
                ->lockForUpdate()
                ->first();

            $nextNum = 1;
            if ($lastOrder && preg_match('/-(\d+)$/', $lastOrder->nomor_pesanan, $matches)) {
                $nextNum = ((int) $matches[1]) + 1;
            }

            // Loop guard: pastikan nomor pesanan benar-benar belum ada di database
            do {
                $orderNumber = $prefix . sprintf('%03d', $nextNum);
                $exists = PosOrder::where('nomor_pesanan', $orderNumber)->exists();
                if ($exists) {
                    $nextNum++;
                }
            } while ($exists);

            // Hitung Total
            $subtotal = 0;
            $itemsData = [];

            foreach ($request->items as $item) {
                $food = PosFood::findOrFail($item['food_id']);

                if ($food->status !== 'Aktif') {
                    DB::rollBack();
                    return back()->with('error', 'Menu "' . $food->nama . '" sedang tidak aktif!');
                }

                $itemSubtotal = $food->harga * $item['jumlah'];
                $subtotal += $itemSubtotal;

                $itemsData[] = [
                    'food_id' => $food->id,
                    'jumlah' => $item['jumlah'],
                    'harga_satuan' => $food->harga,
                    'subtotal' => $itemSubtotal,
                    'catatan' => $item['catatan'] ?? null,
                    'is_served' => $isQuickOrder ? 1 : 0,
                    'status' => 'ACTIVE',
                ];
            }

            // Tentukan status pembayaran awal
            $selectedStatus = $request->status_pembayaran ?: ($request->metode_pembayaran ?: 'UNPAID');
            $dpAmount = 0;

            if ($selectedStatus === 'DP') {
                $paymentStatus = 'DP';
                $dpMethod = in_array($request->dp_method, ['Cash', 'QRIS']) ? $request->dp_method : 'Cash';
                $metodePembayaran = $dpMethod;
                $dpAmount = (int) ($request->dp_amount ?? 0);
                if ($dpAmount <= 0) {
                    $dpAmount = min($subtotal, 50000);
                }
            } elseif (in_array($selectedStatus, ['Cash', 'QRIS', 'SPLIT'])) {
                $paymentStatus = 'PAID';
                $metodePembayaran = $selectedStatus;
            } else {
                $paymentStatus = 'UNPAID';
                $metodePembayaran = 'Cash';
            }

            $initialOrderStatus = $isQuickOrder ? 'COMPLETED' : 'NEW';

            // Create Order
            $order = PosOrder::create([
                'nomor_pesanan' => $orderNumber,
                'nama_pelanggan' => $namaPelanggan,
                'table_id' => $table->id,
                'cashier_id' => Auth::id() ?: 1,
                'order_status' => $initialOrderStatus,
                'payment_status' => $paymentStatus,
                'metode_pembayaran' => $metodePembayaran,
                'subtotal' => $subtotal,
                'diskon' => 0,
                'total' => $subtotal,
                'dp_amount' => $dpAmount,
                'catatan' => $request->catatan,
            ]);

            // If paid directly (Cash/QRIS/SPLIT), create PosPayment record
            if ($paymentStatus === 'PAID') {
                $cashAmount = (int) ($request->cash_amount ?? 0);
                $qrisAmount = (int) ($request->qris_amount ?? 0);

                if ($metodePembayaran === 'SPLIT') {
                    $totalBayar = $cashAmount + $qrisAmount;
                    $kembalianVal = max(0, $totalBayar - $subtotal);
                } elseif ($metodePembayaran === 'QRIS') {
                    $totalBayar = $qrisAmount > 0 ? $qrisAmount : (($request->filled('jumlah_bayar') && (int)$request->jumlah_bayar > 0) ? (int)$request->jumlah_bayar : $subtotal);
                    $qrisAmount = $totalBayar;
                    $kembalianVal = max(0, $totalBayar - $subtotal);
                } else {
                    $totalBayar = $cashAmount > 0 ? $cashAmount : (($request->filled('jumlah_bayar') && (int)$request->jumlah_bayar > 0) ? (int)$request->jumlah_bayar : $subtotal);
                    $cashAmount = $totalBayar;
                    $kembalianVal = max(0, $totalBayar - $subtotal);
                }

                PosPayment::create([
                    'order_id' => $order->id,
                    'cashier_id' => Auth::id(),
                    'metode_pembayaran' => $metodePembayaran,
                    'jumlah_bayar' => $totalBayar,
                    'cash_amount' => $cashAmount,
                    'qris_amount' => $qrisAmount,
                    'kembalian' => $kembalianVal,
                    'paid_at' => now(),
                    'status' => 'SUCCESS',
                ]);
            } elseif ($paymentStatus === 'DP') {
                $dpCash = $metodePembayaran === 'Cash' ? $dpAmount : 0;
                $dpQris = $metodePembayaran === 'QRIS' ? $dpAmount : 0;

                PosPayment::create([
                    'order_id' => $order->id,
                    'cashier_id' => Auth::id() ?: 1,
                    'metode_pembayaran' => $metodePembayaran,
                    'jumlah_bayar' => $dpAmount,
                    'cash_amount' => $dpCash,
                    'qris_amount' => $dpQris,
                    'kembalian' => 0,
                    'paid_at' => now(),
                    'status' => 'SUCCESS',
                    'catatan_koreksi' => 'Uang Muka (DP) Rp ' . number_format($dpAmount, 0, ',', '.') . ' via ' . $metodePembayaran,
                ]);
            }

            // Create Order Items (Batch 1: Pesanan Awal)
            foreach ($itemsData as $item) {
                $item['batch_no'] = 1;
                if ($isQuickOrder) {
                    $item['is_served'] = 1;
                }
                $order->items()->create($item);
            }

            if ($isQuickOrder) {
                $table->update(['status' => 'AVAILABLE']);
            } else {
                // Update Table Status -> OCCUPIED
                $table->update(['status' => 'OCCUPIED']);
            }

            $order->load(['table', 'cashier', 'items.food', 'payment']);

            DB::commit();

            $msg = $isQuickOrder
                ? 'Pesanan Kasir Cepat ' . $orderNumber . ' berhasil dibuat & lunas!'
                : 'Pesanan ' . $orderNumber . ' (No. Antrian ' . $table->nomor_meja . ') berhasil dikirim ke Dapur!';

            return back()->with('success', $msg)
                ->with('latestOrder', $order);
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Gagal membuat pesanan: ' . $e->getMessage());
        }
    }

    /**
     * Proses Pembayaran Kasir (Setelah customer selesai makan/pesan)
     */
    public function processPayment(Request $request)
    {
        $this->ensureColumnsExist();

        $request->validate([
            'order_id' => 'required|exists:pos_orders,id',
            'metode_pembayaran' => 'required|in:Cash,QRIS,SPLIT',
            'jumlah_bayar' => 'nullable|integer|min:0',
            'cash_amount' => 'nullable|integer|min:0',
            'qris_amount' => 'nullable|integer|min:0',
        ]);

        try {
            DB::beginTransaction();

            $order = PosOrder::where('id', $request->order_id)->lockForUpdate()->first();

            if (!$order) {
                DB::rollBack();
                return back()->with('error', 'Pesanan tidak ditemukan.');
            }

            if ($order->payment_status === 'PAID') {
                DB::rollBack();
                return back()->with('error', 'Pesanan ini sudah dibayar sebelumnya.');
            }

            $existingPayment = PosPayment::where('order_id', $order->id)->first();
            $alreadyPaid = $existingPayment ? (int)$existingPayment->jumlah_bayar : 0;
            $sisaTagihan = max(0, $order->total - $alreadyPaid);
            $targetBill = $alreadyPaid > 0 ? $sisaTagihan : $order->total;

            $metode = $request->metode_pembayaran;
            $cashAmount = (int) ($request->cash_amount ?? 0);
            $qrisAmount = (int) ($request->qris_amount ?? 0);

            if ($metode === 'SPLIT') {
                $totalBayar = $cashAmount + $qrisAmount;
            } elseif ($metode === 'QRIS') {
                $totalBayar = $qrisAmount > 0 ? $qrisAmount : ((int)$request->jumlah_bayar ?: $targetBill);
                $qrisAmount = $totalBayar;
            } else {
                $totalBayar = $cashAmount > 0 ? $cashAmount : ((int)$request->jumlah_bayar ?: $targetBill);
                $cashAmount = $totalBayar;
            }

            if ($totalBayar < $targetBill) {
                DB::rollBack();
                return back()->with('error', 'Jumlah pembayaran (Rp ' . number_format($totalBayar, 0, ',', '.') . ') kurang dari sisa tagihan (Rp ' . number_format($targetBill, 0, ',', '.') . ').');
            }

            $kembalian = max(0, $totalBayar - $targetBill);

            if ($existingPayment) {
                $initialMethod = $existingPayment->metode_pembayaran;
                $existingPayment->jumlah_bayar += $totalBayar;
                $existingPayment->cash_amount += $cashAmount;
                $existingPayment->qris_amount += $qrisAmount;
                $existingPayment->kembalian = $kembalian;
                if ($initialMethod !== $metode && $alreadyPaid > 0) {
                    $existingPayment->metode_pembayaran = 'SPLIT';
                }
                $existingPayment->catatan_koreksi = ($existingPayment->catatan_koreksi ? $existingPayment->catatan_koreksi . ' | ' : '') .
                    'Pelunasan Rp ' . number_format($totalBayar, 0, ',', '.') . ' via ' . $metode;
                $existingPayment->paid_at = now();
                $existingPayment->save();
            } else {
                PosPayment::create([
                    'order_id' => $order->id,
                    'cashier_id' => Auth::id() ?: 1,
                    'metode_pembayaran' => $metode,
                    'jumlah_bayar' => $totalBayar,
                    'cash_amount' => $cashAmount,
                    'qris_amount' => $qrisAmount,
                    'kembalian' => $kembalian,
                    'paid_at' => now(),
                    'status' => 'SUCCESS',
                ]);
            }

            // Update Order Status: PAYMENT = PAID, ORDER = COMPLETED
            $order->update([
                'metode_pembayaran' => $existingPayment ? $existingPayment->metode_pembayaran : $metode,
                'payment_status' => 'PAID',
                'order_status' => 'COMPLETED',
            ]);

            // Update Table Status -> AVAILABLE (meja langsung kosong & siap untuk customer berikutnya)
            $table = PosTable::find($order->table_id);
            if ($table && in_array($table->status, ['OCCUPIED', 'NEEDS_CLEANING'])) {
                $table->update(['status' => 'AVAILABLE']);
            }

            DB::commit();

            return back()->with('success', 'Pembayaran berhasil! Kembalian: Rp ' . number_format($kembalian, 0, ',', '.') . '. Meja ' . ($table ? $table->nomor_meja : '') . ' kini kosong & siap digunakan.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Gagal memproses pembayaran: ' . $e->getMessage());
        }
    }

    /**
     * Tambah Menu ke Pesanan Aktif (Meja sudah pesan dan mau nambah makanan/minuman)
     */
    public function addItemsToOrder(Request $request, $id)
    {
        $this->ensureColumnsExist();

        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.food_id' => 'required|exists:pos_foods,id',
            'items.*.jumlah' => 'required|integer|min:1',
            'items.*.catatan' => 'nullable|string|max:255',
            'payment_option' => 'nullable|string',
            'cash_amount' => 'nullable|integer|min:0',
            'qris_amount' => 'nullable|integer|min:0',
        ]);

        try {
            DB::beginTransaction();

            $order = PosOrder::where('id', $id)->lockForUpdate()->firstOrFail();

            if ($order->order_status === 'CANCELLED') {
                DB::rollBack();
                return back()->with('error', 'Pesanan yang sudah dibatalkan tidak dapat ditambah menu!');
            }

            $maxBatch = (int) ($order->items()->max('batch_no') ?: 1);
            $newBatchNo = $maxBatch + 1;

            $addedSubtotal = 0;
            $newAddedItems = [];

            foreach ($request->items as $item) {
                $food = PosFood::findOrFail($item['food_id']);

                if ($food->status !== 'Aktif') {
                    DB::rollBack();
                    return back()->with('error', 'Menu "' . $food->nama . '" sedang tidak aktif!');
                }

                $itemSubtotal = $food->harga * $item['jumlah'];
                $addedSubtotal += $itemSubtotal;

                $createdItem = $order->items()->create([
                    'food_id' => $food->id,
                    'jumlah' => $item['jumlah'],
                    'harga_satuan' => $food->harga,
                    'subtotal' => $itemSubtotal,
                    'catatan' => $item['catatan'] ?? null,
                    'is_served' => 0,
                    'status' => 'ACTIVE',
                    'batch_no' => $newBatchNo,
                ]);
                $createdItem->load('food');
                $newAddedItems[] = $createdItem;
            }

            $order->subtotal += $addedSubtotal;
            $order->total += $addedSubtotal;

            $paymentOption = $request->input('payment_option', 'LATER'); // 'LATER', 'Cash', 'QRIS', 'SPLIT'

            if (in_array($paymentOption, ['Cash', 'QRIS', 'SPLIT'])) {
                $payment = $order->payment;
                $addonCash = (int) ($request->input('cash_amount', 0));
                $addonQris = (int) ($request->input('qris_amount', 0));

                if ($paymentOption === 'Cash' && $addonCash === 0) {
                    $addonCash = $addedSubtotal;
                } elseif ($paymentOption === 'QRIS' && $addonQris === 0) {
                    $addonQris = $addedSubtotal;
                }

                if (!$payment) {
                    $payment = PosPayment::create([
                        'order_id' => $order->id,
                        'cashier_id' => Auth::id() ?: 1,
                        'metode_pembayaran' => $paymentOption,
                        'jumlah_bayar' => $addonCash + $addonQris,
                        'cash_amount' => $addonCash,
                        'qris_amount' => $addonQris,
                        'kembalian' => max(0, ($addonCash + $addonQris) - $addedSubtotal),
                        'paid_at' => now(),
                        'status' => 'SUCCESS',
                    ]);
                } else {
                    $payment->jumlah_bayar += ($addonCash + $addonQris);
                    $payment->cash_amount += $addonCash;
                    $payment->qris_amount += $addonQris;
                    if ($payment->metode_pembayaran !== $paymentOption) {
                        $payment->metode_pembayaran = 'SPLIT';
                        $order->metode_pembayaran = 'SPLIT';
                    }
                    $payment->save();
                }
                $order->payment_status = 'PAID';
            } else {
                // Jika ada pesanan tambahan yang belum dibayar, tandai UNPAID agar kasir ingat menagih
                $order->payment_status = 'UNPAID';
            }

            if ($order->order_status === 'COMPLETED' || $order->order_status === 'READY') {
                $order->order_status = 'PROCESSING';
            }
            if ($order->table && $order->table->status !== 'OCCUPIED') {
                $order->table->update(['status' => 'OCCUPIED']);
            }

            $order->save();
            $order->load(['table', 'cashier', 'items.food', 'payment']);

            DB::commit();

            return back()->with('success', 'Berhasil menambahkan pesanan tambahan (Batch #' . $newBatchNo . ') ke No. Antrian ' . ($order->table ? $order->table->nomor_meja : '') . '!')
                ->with('latestOrder', $order)
                ->with('newAddedItems', $newAddedItems)
                ->with('newBatchNo', $newBatchNo);
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Gagal menambah menu: ' . $e->getMessage());
        }
    }

    /**
     * Batal Item Tertentu dalam Pesanan (Cancel per menu)
     */
    public function cancelOrderItem(Request $request, $id)
    {
        $this->ensureColumnsExist();

        $request->validate([
            'alasan' => 'nullable|string|max:255',
        ]);

        try {
            DB::beginTransaction();

            $item = PosOrderItem::with('order.table', 'food')->where('id', $id)->lockForUpdate()->firstOrFail();
            $order = $item->order;

            if ($item->status === 'CANCELLED') {
                DB::rollBack();
                return back()->with('error', 'Item ini sudah dibatalkan sebelumnya.');
            }

            // Tandai item sebagai CANCELLED
            $item->update([
                'status' => 'CANCELLED',
                'batal_alasan' => $request->alasan ?: 'Dibatalkan oleh kasir/pelanggan',
            ]);

            // Kurangi subtotal & total order
            $order->subtotal = max(0, $order->subtotal - $item->subtotal);
            $order->total = max(0, $order->total - $item->subtotal);
            $order->save();

            // Cek apakah masih ada item aktif
            $activeCount = $order->items()->where('status', 'ACTIVE')->count();
            if ($activeCount === 0) {
                $order->update(['order_status' => 'CANCELLED']);
                if ($order->table) {
                    $order->table->update(['status' => 'AVAILABLE']);
                }
            }

            DB::commit();

            return back()->with('success', 'Menu ' . ($item->food ? $item->food->nama : '') . ' berhasil dibatalkan. Total tagihan diperbarui.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Gagal membatalkan item: ' . $e->getMessage());
        }
    }

    /**
     * Batal Seluruh Pesanan (Cancel pesanan)
     */
    public function cancelOrder(Request $request, $id)
    {
        try {
            DB::beginTransaction();

            $order = PosOrder::where('id', $id)->lockForUpdate()->firstOrFail();

            // Batalkan semua item
            $order->items()->update(['status' => 'CANCELLED', 'batal_alasan' => 'Pesanan dibatalkan']);

            // Jika ada pembayaran, tandai FAILED
            if ($order->payment) {
                $order->payment->update(['status' => 'FAILED']);
            }

            $order->update([
                'order_status' => 'CANCELLED',
            ]);

            // Free table
            $table = PosTable::find($order->table_id);
            if ($table) {
                $table->update(['status' => 'AVAILABLE']);
            }

            DB::commit();

            return back()->with('success', 'Pesanan ' . $order->nomor_pesanan . ' berhasil dibatalkan.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Gagal membatalkan pesanan: ' . $e->getMessage());
        }
    }

    /**
     * Ubah / Koreksi Total Harga Pesanan (Misal: Terlanjur Habis, Penyesuaian Harga, DP, dll)
     */
    public function updateOrderTotal(Request $request, $id)
    {
        $this->ensureColumnsExist();

        $request->validate([
            'total' => 'required|integer|min:0',
            'alasan' => 'nullable|string|max:255',
        ]);

        try {
            DB::beginTransaction();

            $order = PosOrder::where('id', $id)->lockForUpdate()->firstOrFail();
            $oldTotal = (int) $order->total;
            $newTotal = (int) $request->total;

            $order->total = $newTotal;
            if ($request->filled('alasan')) {
                $order->catatan = ($order->catatan ? $order->catatan . ' | ' : '') . 'Koreksi Total: Rp ' . number_format($oldTotal, 0, ',', '.') . ' -> Rp ' . number_format($newTotal, 0, ',', '.') . ' (' . $request->alasan . ')';
            }
            $order->save();

            DB::commit();

            return back()->with('success', 'Total pesanan ' . $order->nomor_pesanan . ' berhasil diubah menjadi Rp ' . number_format($newTotal, 0, ',', '.'));
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Gagal mengubah total pesanan: ' . $e->getMessage());
        }
    }

    /**
     * Fetch active tables & orders as JSON for polling
     */
    public function jsonState()
    {
        $tables = PosTable::with(['activeOrder.items.food', 'activeOrder.cashier', 'activeOrder.payment'])
            ->orderBy('nomor_meja', 'asc')
            ->get();

        $activeOrders = PosOrder::with(['table', 'cashier', 'items.food', 'payment'])
            ->whereIn('order_status', ['NEW', 'PROCESSING', 'READY'])
            ->latest()
            ->get();

        return response()->json([
            'tables' => $tables,
            'activeOrders' => $activeOrders,
        ]);
    }

    /**
     * Tampilan Monitor & Kelola Status Pesanan (Pengganti Layar Dapur untuk Kasir)
     */
    public function monitor()
    {
        $this->ensureColumnsExist();

        // Auto-recovery: bebaskan meja yang berstatus OCCUPIED tapi tidak memiliki pesanan aktif HARI INI
        try {
            $todayStart = now()->startOfDay();
            $occupiedTables = PosTable::where('status', 'OCCUPIED')->get();
            foreach ($occupiedTables as $tbl) {
                if ($tbl->nomor_meja === 'KASIR') {
                    $tbl->update(['status' => 'AVAILABLE']);
                    continue;
                }
                $hasActiveToday = PosOrder::where('table_id', $tbl->id)
                    ->whereIn('order_status', ['NEW', 'PROCESSING', 'READY'])
                    ->where('created_at', '>=', $todayStart)
                    ->exists();

                if (!$hasActiveToday) {
                    $tbl->update(['status' => 'AVAILABLE']);
                }
            }
        } catch (\Throwable $e) {}

        $tables = PosTable::with(['activeOrder.items.food', 'activeOrder.cashier', 'activeOrder.payment'])
            ->orderBy('nomor_meja', 'asc')
            ->get();

        $activeOrders = PosOrder::with(['table', 'cashier', 'items.food', 'payment'])
            ->where(function($q) {
                $q->whereIn('order_status', ['NEW', 'PROCESSING', 'READY'])
                  ->orWhere('payment_status', 'UNPAID')
                  ->orWhere(function($sub) {
                      $sub->where('order_status', 'COMPLETED')
                          ->whereDate('updated_at', now()->today());
                  });
            })
            ->where('order_status', '!=', 'CANCELLED')
            ->latest()
            ->take(60)
            ->get();

        return Inertia::render('POS/OrderMonitor', [
            'tables' => $tables,
            'activeOrders' => $activeOrders,
        ]);
    }

    /**
     * Selesaikan Pesanan dari Kasir
     */
    public function completeOrder(Request $request, $id)
    {
        try {
            DB::beginTransaction();

            $order = PosOrder::where('id', $id)->lockForUpdate()->firstOrFail();

            // Tandai semua item aktif menjadi sudah diantar
            $order->items()->where('status', 'ACTIVE')->update(['is_served' => 1]);

            $order->update([
                'order_status' => 'COMPLETED'
            ]);

            // Jika pesanan sudah lunas, langsung kosongkan nomor antrian
            if ($order->payment_status === 'PAID' && $order->table) {
                $order->table->update(['status' => 'AVAILABLE']);
            }

            DB::commit();

            return back()->with('success', 'Pesanan ' . $order->nomor_pesanan . ' (No. Antrian ' . ($order->table ? $order->table->nomor_meja : '') . ') berhasil diselesaikan!');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Gagal menyelesaikan pesanan: ' . $e->getMessage());
        }
    }

    /**
     * Bersihkan & Selesaikan Pesanan Menggantung dari Hari Kemarin
     */
    public function cleanupStaleOrders(Request $request)
    {
        $this->ensureColumnsExist();

        try {
            DB::beginTransaction();

            $todayStart = now()->startOfDay();

            // 1. Ambil semua pesanan dari hari kemarin yang belum diselesaikan
            $staleOrders = PosOrder::whereIn('order_status', ['NEW', 'PROCESSING', 'READY'])
                ->where('created_at', '<', $todayStart)
                ->get();

            $count = 0;
            foreach ($staleOrders as $staleOrder) {
                // Selesaikan semua item yang masih aktif
                $staleOrder->items()->where('status', 'ACTIVE')->update(['is_served' => 1]);

                // Update order status menjadi COMPLETED
                $staleOrder->update([
                    'order_status' => 'COMPLETED',
                    'catatan' => trim(($staleOrder->catatan ?? '') . ' [Auto-Selesai Arsip Kemarin]')
                ]);
                $count++;
            }

            // 2. Normalkan semua meja yang berstatus OCCUPIED jika tidak memiliki pesanan aktif hari ini
            $occupiedTables = PosTable::where('status', 'OCCUPIED')->get();
            foreach ($occupiedTables as $tbl) {
                if ($tbl->nomor_meja === 'KASIR') {
                    $tbl->update(['status' => 'AVAILABLE']);
                    continue;
                }
                $hasActiveToday = PosOrder::where('table_id', $tbl->id)
                    ->whereIn('order_status', ['NEW', 'PROCESSING', 'READY'])
                    ->where('created_at', '>=', $todayStart)
                    ->exists();

                if (!$hasActiveToday) {
                    $tbl->update(['status' => 'AVAILABLE']);
                }
            }

            DB::commit();

            return back()->with('success', "Berhasil membersihkan {$count} pesanan hari kemarin. Semua meja yang menggantung telah dikosongkan & siap digunakan!");
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Gagal membersihkan pesanan: ' . $e->getMessage());
        }
    }

    /**
     * Reset / Kosongkan Meja Antrian
     */
    public function resetTable(Request $request, $id)
    {
        try {
            $table = PosTable::findOrFail($id);
            $table->update(['status' => 'AVAILABLE']);

            return back()->with('success', 'Nomor Antrian ' . $table->nomor_meja . ' kini KOSONG & siap digunakan kembali.');
        } catch (\Exception $e) {
            return back()->with('error', 'Gagal mereset nomor antrian: ' . $e->getMessage());
        }
    }

    /**
     * Checklist / Toggle Status Menu Diantar dari Kasir
     */
    public function toggleOrderItemServed(Request $request, $id)
    {
        try {
            DB::beginTransaction();

            $item = PosOrderItem::findOrFail($id);
            $item->update(['is_served' => $item->is_served ? 0 : 1]);

            $order = $item->order;
            if ($order) {
                $activeItems = $order->items()->where('status', 'ACTIVE')->get();
                $allServed = $activeItems->count() > 0 && $activeItems->every(fn($i) => (bool)$i->is_served);

                if ($allServed && $order->order_status !== 'COMPLETED') {
                    $order->update(['order_status' => 'COMPLETED']);
                    if ($order->payment_status === 'PAID' && $order->table) {
                        $order->table->update(['status' => 'AVAILABLE']);
                    }
                }
            }

            DB::commit();

            return back()->with('success', 'Status menu ' . ($item->food ? $item->food->nama : '') . ' diperbarui.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Gagal memperbarui status menu: ' . $e->getMessage());
        }
    }
}

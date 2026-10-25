import React from 'react';

/**
 * Helper to format Date without seconds (DD/MM/YYYY, HH.MM)
 */
const formatDateNoSeconds = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dateFormatted = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' });
  const timeFormatted = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dateFormatted}, ${timeFormatted.replace(':', '.')}`;
};

/**
 * Single Receipt Content: Handles Customer Receipt or Kitchen Ticket
 * Edge-to-edge width & bold readable typography
 * KITCHEN TICKET: All CAPSLOCK & Extra Large Fonts
 */
function SingleReceiptContent({
  order,
  isKitchen,
  paperSize = '80mm',
  kitchenBatchFilter = 'all',
  onKitchenBatchFilterChange = null
}) {
  const rawPaymentMethod = order.payment?.metode_pembayaran || order.metode_pembayaran || 'Cash';
  const isCash = rawPaymentMethod.toLowerCase() === 'cash';
  const isQuickOrder = order.table?.nomor_meja === 'KASIR' || order.nomor_meja === 'KASIR';

  const orderTotal = Number(order.total || 0);
  const totalPaid = Number(order.payment?.jumlah_bayar || 0);
  const remainingDue = Math.max(0, orderTotal - totalPaid);

  // LOGIKA STATUS LUNAS:
  // Pesanan dianggap LUNAS SEPENUHNYA jika:
  // 1. payment_status eksplisit 'PAID'
  // 2. ATAU sisa tagihan sudah 0 (remainingDue === 0 dan orderTotal > 0, total bayar sudah menutup total pesanan)
  // 3. ATAU jika order.payment_status BUKAN 'UNPAID' dan BUKAN 'DP'
  const isFullyPaid = (order.payment_status || '').toUpperCase() === 'PAID' ||
                      (orderTotal > 0 && remainingDue === 0 && totalPaid >= orderTotal);

  // UANG MUKA (DP)
  const isDp = !isFullyPaid && ((order.payment_status || '').toUpperCase() === 'DP' || Number(order.dp_amount || 0) > 0);

  // LUNAS SEBAGIAN (HANYA jika BELUM LUNAS PENUH, BUKAN DP, tapi SUDAH ada uang masuk dan MASIH ada sisa tagihan)
  const isPartiallyPaid = !isFullyPaid && !isDp && totalPaid > 0 && remainingDue > 0;

  // BELUM DIBAYAR SAMA SEKALI
  const isCompletelyUnpaid = !isFullyPaid && !isDp && !isPartiallyPaid;

  /* =========================================================
   * 1. STRUK CUSTOMER (VERSI PERSIS 21 MENIT LALU)
   * ========================================================= */
  if (!isKitchen) {
    return (
      <div className="pos-receipt-printable w-full mx-auto font-mono text-black leading-tight px-0">
        {/* HEADER TOKO */}
        <div className="text-center mb-2 pb-2 border-b-2 border-dashed border-gray-600 space-y-1">
          <img
            src="/storage/logo/logoo.png"
            alt="Logo Palantea"
            className="w-24 h-auto mx-auto mb-1 object-contain"
          />
          <h2 className="font-black text-lg sm:text-xl uppercase tracking-wider text-black leading-tight">
            CENTRAL PALANTEA HIDROPONIK
          </h2>
          <p className="text-xs font-bold text-black">
            Agrowisata Center — Cafe • Space • Hydroponic
          </p>
          <p className="text-xs text-gray-800 leading-tight">
            Jl. Melayu, Babussalam, Mandau, Bengkalis, Riau
          </p>
        </div>

        {/* NOMOR MEJA & INFORMASI PESANAN */}
        <div className="space-y-1 mb-2 pb-1.5 border-b-2 border-dashed border-gray-600">
          {isQuickOrder ? (
            <div className="text-center my-1 py-1.5 px-1 border-y-2 border-black">
              <span className="font-black tracking-tight text-xl sm:text-2xl text-black uppercase block">
                PESANAN LANGSUNG DIAMBIL
              </span>
            </div>
          ) : (
            <div className="flex justify-between items-center my-1 py-1 px-1.5 border-y-2 border-black">
              <span className="font-black uppercase tracking-wider text-xs sm:text-sm text-black">
                NO. MEJA:
              </span>
              <span className="font-black tracking-tight text-2xl sm:text-4xl text-black">
                NO. {order.table?.nomor_meja || order.table_id || order.nomor_meja || '--'}
              </span>
            </div>
          )}

          <div className="flex justify-between text-xs sm:text-sm font-bold text-black pt-0.5">
            <span>Pelanggan:</span>
            <span className="uppercase font-black">{order.nama_pelanggan || 'Pelanggan'}</span>
          </div>

          <div className="flex justify-between text-xs text-black">
            <span>No Pesanan:</span>
            <span className="font-bold">{order.nomor_pesanan}</span>
          </div>

          {isPartiallyPaid ? (
            <div className="space-y-0.5">
              <div className="flex justify-between text-xs sm:text-sm text-black">
                <span>Status Tagihan:</span>
                <span className="font-black uppercase text-red-700 bg-red-100 px-1.5 py-0.5 rounded border border-red-300">
                  ⚠️ LUNAS SEBAGIAN (ADA TAMBAHAN)
                </span>
              </div>
              <div className="flex justify-between text-xs text-black">
                <span>Bayar Via (Awal):</span>
                <span className="font-bold uppercase">{rawPaymentMethod.toUpperCase()}</span>
              </div>
            </div>
          ) : isCompletelyUnpaid ? (
            <div className="space-y-0.5">
              <div className="flex justify-between text-xs sm:text-sm text-black">
                <span>Status Tagihan:</span>
                <span className="font-black uppercase text-red-700 bg-red-100 px-1.5 py-0.5 rounded border border-red-300">
                  ⚠️ BELUM DIBAYAR
                </span>
              </div>
            </div>
          ) : isDp ? (
            <div className="flex justify-between text-xs sm:text-sm text-black">
              <span>Status Pembayaran:</span>
              <span className="font-black uppercase text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                💰 UANG MUKA (DP)
              </span>
            </div>
          ) : (
            <div className="flex justify-between text-xs sm:text-sm text-black">
              <span>Bayar Via:</span>
              <span className="font-black uppercase">{rawPaymentMethod.toUpperCase()} (LUNAS)</span>
            </div>
          )}

          <div className="flex justify-between text-xs text-black">
            <span>Waktu:</span>
            <span className="font-semibold">{formatDateNoSeconds(order.created_at || Date.now())}</span>
          </div>

          <div className="flex justify-between text-xs text-black">
            <span>Kasir:</span>
            <span className="font-semibold">{order.cashier?.name || 'Kasir'}</span>
          </div>
        </div>

        {/* DAFTAR MENU (ITEMS) DENGAN PISAHAN BATCH AWAL & TAMBAHAN */}
        <div className="mb-2 pb-2 border-b-2 border-dashed border-gray-600 space-y-2">
          <div className="text-xs font-black uppercase tracking-wider border-b-2 border-black pb-1 flex justify-between">
            <span>MENU PESANAN</span>
            <span>HARGA</span>
          </div>

          {(() => {
            // FILTER UTAMA: Menu yang dibatalkan (CANCELLED) sama sekali TIDAK BOLEH tampil di struk cetak
            const activeItems = (order.items || []).filter(it => it.status !== 'CANCELLED');

            if (activeItems.length === 0) {
              return (
                <div className="py-2 text-center text-xs text-gray-500 font-bold italic">
                  (Tidak ada item pesanan aktif / pesanan dibatalkan)
                </div>
              );
            }

            // Group by batch_no dari item-item yang AKTIF saja
            const batches = {};
            activeItems.forEach(it => {
              const b = (it.batch_no && Number(it.batch_no) > 0) ? Number(it.batch_no) : 1;
              if (!batches[b]) batches[b] = [];
              batches[b].push(it);
            });

            const sortedBatchKeys = Object.keys(batches).map(Number).sort((a, b) => a - b);
            const hasMultipleBatches = sortedBatchKeys.length > 1;

            if (!hasMultipleBatches) {
              return (
                <div className="space-y-1.5 pt-0.5">
                  {activeItems.map((item, idx) => {
                    const itemSubtotal = Number(item.subtotal) || (Number(item.harga_satuan || 0) * Number(item.jumlah || 1)) || 0;
                    return (
                      <div key={idx} className="space-y-0.5 pb-1 border-b border-gray-200 last:border-b-0 text-xs sm:text-sm">
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-bold text-black text-sm sm:text-base leading-snug break-words flex-1">
                            <span className="text-base sm:text-lg font-black mr-1">{item.jumlah}x</span> {item.food?.nama || 'Menu'}
                          </span>
                          <span className="font-black text-black text-sm sm:text-base whitespace-nowrap shrink-0 text-right">
                            Rp {itemSubtotal.toLocaleString('id-ID')}
                          </span>
                        </div>
                        {item.jumlah > 1 && (
                          <div className="text-xs text-gray-700 pl-6">
                            @ Rp {Number(item.harga_satuan || 0).toLocaleString('id-ID')}
                          </div>
                        )}
                        {item.catatan && (
                          <div className="text-xs font-black italic text-black pl-6">
                            * Note: {item.catatan}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }

            return (
              <div className="space-y-3 pt-0.5">
                {sortedBatchKeys.map(bNo => {
                  const bItems = batches[bNo];
                  const bSubtotal = bItems.reduce((s, i) => {
                    const price = Number(i.subtotal) || (Number(i.harga_satuan || 0) * Number(i.jumlah || 1)) || 0;
                    return s + price;
                  }, 0);
                  const isFirstBatch = bNo === 1;
                  const batchIsPaid = isFullyPaid || (isFirstBatch && totalPaid >= bSubtotal);
                  const batchIsUnpaid = !batchIsPaid;

                  return (
                    <div key={bNo} className="space-y-1">
                      <div className={`px-1.5 py-0.5 border-y border-dashed border-black flex justify-between text-xs font-black uppercase text-black`}>
                        <span>
                          {isFirstBatch ? '▶ PESANAN AWAL' : `▶ PESANAN TAMBAHAN #${bNo - 1}`}
                          {isPartiallyPaid && (batchIsUnpaid ? ' (⚠️ BELUM BAYAR)' : ' (✓ SUDAH BAYAR)')}
                          {isCompletelyUnpaid && ' (⚠️ BELUM BAYAR)'}
                        </span>
                        <span>Rp {bSubtotal.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="space-y-1 pl-1">
                        {bItems.map((item, idx) => {
                          const itemSubtotal = Number(item.subtotal) || (Number(item.harga_satuan || 0) * Number(item.jumlah || 1)) || 0;
                          return (
                            <div key={idx} className="space-y-0.5 pb-1 border-b border-gray-200 last:border-b-0 text-xs sm:text-sm">
                              <div className="flex justify-between items-start gap-1">
                                <span className="font-bold text-black text-sm sm:text-base leading-snug break-words flex-1">
                                  <span className="text-base sm:text-lg font-black mr-1">{item.jumlah}x</span> {item.food?.nama || 'Menu'}
                                </span>
                                <span className="font-black text-black text-sm sm:text-base whitespace-nowrap shrink-0 text-right">
                                  Rp {itemSubtotal.toLocaleString('id-ID')}
                                </span>
                              </div>
                              {item.jumlah > 1 && (
                                <div className="text-xs text-gray-700 pl-6">
                                  @ Rp {Number(item.harga_satuan || 0).toLocaleString('id-ID')}
                                </div>
                              )}
                              {item.catatan && (
                                <div className="text-xs font-black italic text-black pl-6">
                                  * Note: {item.catatan}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* CATATAN PESANAN UMUM (Hilangkan latar abu-abu & sembunyikan catatan otomatis kasir cepat) */}
        {order.catatan &&
          !order.catatan.toLowerCase().includes('kasir cepat') &&
          !order.catatan.toLowerCase().includes('pesanan kasir') && (
          <div className="mb-2 p-1.5 rounded text-xs sm:text-sm border-2 border-dashed border-black">
            <span className="font-black block uppercase text-xs">Catatan Pesanan:</span>
            <span className="font-bold italic">{order.catatan}</span>
          </div>
        )}

        {/* TOTAL & RINCIAN PEMBAYARAN */}
        <div className="space-y-1.5 mb-3 pt-1 text-xs sm:text-sm">
          {Number(order.diskon || 0) > 0 && (
            <>
              <div className="flex justify-between font-bold">
                <span>Subtotal:</span>
                <span>Rp {Number(order.subtotal || order.total || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between font-bold text-red-600">
                <span>Diskon:</span>
                <span>- Rp {Number(order.diskon).toLocaleString('id-ID')}</span>
              </div>
            </>
          )}

          {/* TOTAL UTAMA */}
          <div className="flex justify-between font-black text-xl sm:text-2xl pt-1.5 pb-1.5 border-t-2 border-b-2 border-black text-black">
            <span>TOTAL:</span>
            <span>Rp {Number(order.total || 0).toLocaleString('id-ID')}</span>
          </div>

          {/* KASUS 1: STATUS PEMBAYARAN DP (UANG MUKA) */}
          {isDp ? (
            <div className="my-2 p-2 border-2 border-dashed border-black rounded text-center text-xs text-black font-black space-y-1">
              <p className="text-sm font-black uppercase text-black">💰 STRUK UANG MUKA (DP)</p>
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-black">
                <span>Uang Muka Diterima ({rawPaymentMethod.toUpperCase()}):</span>
                <span className="font-black text-black">Rp {Number(order.dp_amount || order.payment?.jumlah_bayar || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between font-black text-sm text-black pt-0.5 border-t border-black">
                <span>SISA TAGIHAN (BELUM LUNAS):</span>
                <span>Rp {remainingDue.toLocaleString('id-ID')}</span>
              </div>
              <p className="text-[10px] text-gray-800 italic pt-1">* Pelunasan sisa ditagih saat makanan diantar / selesai makan *</p>
            </div>
          ) : isFullyPaid ? (
            <div className="pt-1 text-xs sm:text-sm space-y-1">
              <div className="flex justify-between font-semibold">
                <span>Metode Pembayaran:</span>
                <span className="font-black uppercase">{rawPaymentMethod.toUpperCase()}</span>
              </div>

              {/* Jika Pesanan Pernah Menggunakan DP dan Sekarang Lunas */}
              {Number(order.dp_amount || 0) > 0 && (
                <div className="p-1.5 border border-black rounded text-xs space-y-0.5">
                  <div className="flex justify-between text-gray-800 font-bold">
                    <span>Uang Muka (DP) Sebelumnya:</span>
                    <span>Rp {Number(order.dp_amount).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-black font-black">
                    <span>Pelunasan Sisa:</span>
                    <span>Rp {Math.max(0, orderTotal - Number(order.dp_amount)).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              )}

              {rawPaymentMethod.toUpperCase() === 'SPLIT' ? (
                <div className="space-y-1 p-2 border border-dashed border-black rounded">
                  <div className="text-[11px] font-black uppercase text-black border-b border-black pb-0.5">
                    Rincian Pembayaran Kombinasi (SPLIT):
                  </div>
                  <div className="flex justify-between font-semibold text-xs">
                    <span>Bayar Cash (Uang Diterima):</span>
                    <span className="font-bold">Rp {Number(order.payment?.cash_amount ?? 0).toLocaleString('id-ID')}</span>
                  </div>
                  {Number(order.payment?.kembalian ?? 0) > 0 && (
                    <div className="flex justify-between text-gray-800 pl-3 text-xs">
                      <span>Kembalian Tunai:</span>
                      <span className="font-semibold text-black">- Rp {Number(order.payment.kembalian).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {Number(order.payment?.kembalian ?? 0) > 0 && (
                    <div className="flex justify-between font-black text-xs pl-3 border-b border-black pb-0.5 text-black">
                      <span>Nett Tunai Dipakai:</span>
                      <span>Rp {(Number(order.payment?.cash_amount ?? 0) - Number(order.payment.kembalian)).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-xs">
                    <span>Bayar QRIS:</span>
                    <span className="font-bold">Rp {Number(order.payment?.qris_amount ?? 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-black text-xs pt-1 border-t border-black text-black uppercase">
                    <span>Status Pembayaran:</span>
                    <span>✓ LUNAS (SELESAI)</span>
                  </div>
                </div>
              ) : isCash ? (
                <>
                  <div className="flex justify-between font-semibold">
                    <span>Uang Diterima:</span>
                    <span className="font-bold">Rp {Number(order.payment?.jumlah_bayar ?? orderTotal).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-black text-base pt-0.5 border-t border-dashed border-black">
                    <span>Kembalian:</span>
                    <span>Rp {Number(order.payment?.kembalian ?? 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-black text-xs pt-1 border-t border-black text-black uppercase">
                    <span>Status Pembayaran:</span>
                    <span>✓ LUNAS (SELESAI)</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between font-bold">
                    <span>Bayar QRIS:</span>
                    <span>Rp {Number(order.payment?.qris_amount || order.payment?.jumlah_bayar || orderTotal).toLocaleString('id-ID')}</span>
                  </div>
                  {Number(order.payment?.kembalian ?? 0) > 0 && (
                    <div className="flex justify-between font-black text-sm pt-0.5 border-t border-dashed border-black">
                      <span>Kembalian Tunai:</span>
                      <span>Rp {Number(order.payment.kembalian).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-xs pt-1 border-t border-black text-black uppercase">
                    <span>Status Pembayaran:</span>
                    <span>✓ LUNAS (SELESAI)</span>
                  </div>
                </>
              )}
              {order.payment?.catatan_koreksi && (
                <div className="mt-1 p-1 border border-black rounded text-[11px] font-bold text-black italic">
                  * Ket: {order.payment.catatan_koreksi}
                </div>
              )}
            </div>
          ) : (
            <div className="my-2 p-2 border-2 border-dashed border-black rounded text-xs text-black font-bold space-y-1">
              <p className="text-sm font-black uppercase text-center text-black">
                {isPartiallyPaid ? '⚠️ TAGIHAN KURANG (ADA TAMBAHAN)' : '⚠️ TAGIHAN BELUM LUNAS'}
              </p>
              {isPartiallyPaid ? (
                <>
                  <div className="flex justify-between text-xs text-black border-t border-dashed border-black pt-1">
                    <span>Sudah Dibayar Sebelumnya:</span>
                    <span className="font-bold text-black">
                      Rp {totalPaid.toLocaleString('id-ID')} ({rawPaymentMethod.toUpperCase()})
                    </span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-black border-t-2 border-black pt-1">
                    <span>SISA YANG BELUM DIBAYAR:</span>
                    <span>Rp {remainingDue.toLocaleString('id-ID')}</span>
                  </div>
                  <p className="text-[10px] text-center text-black italic pt-0.5">
                    * Harap tagih sisa menu tambahan saat makanan diantar / selesai makan *
                  </p>
                </>
              ) : (
                <>
                  <div className="flex justify-between font-black text-sm text-black border-t border-dashed border-black pt-1">
                    <span>TOTAL YANG HARUS DIBAYAR:</span>
                    <span>Rp {orderTotal.toLocaleString('id-ID')}</span>
                  </div>
                  <p className="text-[10px] text-center text-black italic pt-0.5">
                    * Pembayaran ditagih saat makanan diantar / selesai makan *
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* FOOTER STRUK */}
        <div className="text-center text-xs text-black pt-2 border-t-2 border-dashed border-black space-y-0.5">
          <p className="font-black text-black text-xs uppercase">Terima Kasih Atas Kunjungan Anda!</p>
          <p className="font-bold text-black">
            {isQuickOrder ? 'Silakan Ambil Pesanan di Kasir' : 'Mohon Ditunggu, Hidangan Segera Kami Antarkan'}
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
   * 2. TICKET KANTIN / DAPUR (FONT BESAR, ALL-CAPS, SELEKSI BATCH & PEMISAH JELAS)
   * ========================================================= */
  // Filter menu yang AKTIF saja agar item yang dibatalkan tidak terkirim atau dimasak di dapur
  const allItems = (order.items || []).filter(item => item.status !== 'CANCELLED');
  const batches = {};
  allItems.forEach(it => {
    const b = (it.batch_no && Number(it.batch_no) > 0) ? Number(it.batch_no) : 1;
    if (!batches[b]) batches[b] = [];
    batches[b].push(it);
  });
  const sortedBatchKeys = Object.keys(batches).map(Number).sort((a, b) => a - b);
  const maxBatch = sortedBatchKeys.length > 0 ? Math.max(...sortedBatchKeys) : 1;
  const hasMultipleBatches = sortedBatchKeys.length > 1;

  const latestBatchItems = (order.addon_items && order.addon_items.length > 0)
    ? order.addon_items.filter(item => item.status !== 'CANCELLED')
    : (batches[maxBatch] || []);

  const activeFilter = kitchenBatchFilter || (order.is_additional ? 'latest' : 'all');
  const isLatestFilter = activeFilter === 'latest';
  const isSpecificBatch = !['all', 'latest'].includes(activeFilter);
  const targetBatchNo = isSpecificBatch ? Number(activeFilter) : null;
  const isAddonTicket = isLatestFilter || (isSpecificBatch && targetBatchNo > 1);

  const itemsToCook = isLatestFilter
    ? latestBatchItems
    : isSpecificBatch
      ? (batches[targetBatchNo] || [])
      : allItems;

  return (
    <div>
      {/* FILTER BAR NON-PRINTABLE (HANYA MUNCUL DI LAYAR PREVIEW KASIR) */}
      {hasMultipleBatches && (
        <div className="no-print mb-3 p-2.5 bg-blue-50 border-2 border-blue-400 rounded-xl space-y-2 shadow-xs text-blue-950">
          <div className="flex justify-between items-center text-xs">
            <span className="font-extrabold flex items-center gap-1.5 text-blue-950">
              <span className="text-sm">🍳</span>
              <span>Pilihan Cetak Tiket Dapur:</span>
            </span>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-600 text-white">
              {isLatestFilter
                ? '⚡ Mode: Hanya Tambahan'
                : activeFilter === 'all'
                  ? '📋 Mode: Semua Berpemisah'
                  : `Mode: Batch ${activeFilter}`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onKitchenBatchFilterChange && onKitchenBatchFilterChange('latest')}
              className={`p-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center text-center gap-0.5 border ${
                isLatestFilter
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-300'
                  : 'bg-white text-blue-900 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <span className="flex items-center gap-1 text-xs">
                <span>⚡ Hanya Tambahan</span>
                <span className="text-[10px] opacity-80">({latestBatchItems.length} Item)</span>
              </span>
              <span className={`text-[10px] font-semibold ${isLatestFilter ? 'text-blue-100' : 'text-gray-500'}`}>
                Cetak menu baru saja
              </span>
            </button>

            <button
              type="button"
              onClick={() => onKitchenBatchFilterChange && onKitchenBatchFilterChange('all')}
              className={`p-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center text-center gap-0.5 border ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-300'
                  : 'bg-white text-blue-900 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <span className="flex items-center gap-1 text-xs">
                <span>📋 Semua Pesanan</span>
              </span>
              <span className={`text-[10px] font-semibold ${activeFilter === 'all' ? 'text-blue-100' : 'text-gray-500'}`}>
                Ada tanda pemisah awal & tambahan
              </span>
            </button>
          </div>

          {sortedBatchKeys.length > 2 && (
            <div className="flex items-center gap-1 pt-1 border-t border-blue-200">
              <span className="text-[10px] font-bold text-blue-800 shrink-0">Pilih Batch:</span>
              <div className="flex gap-1 overflow-x-auto">
                {sortedBatchKeys.map(bNo => (
                  <button
                    key={bNo}
                    type="button"
                    onClick={() => onKitchenBatchFilterChange && onKitchenBatchFilterChange(bNo.toString())}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap transition-all ${
                      activeFilter === bNo.toString()
                        ? 'bg-blue-900 text-white ring-1 ring-blue-500'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {bNo === 1 ? 'Batch 1 (Awal)' : `Batch ${bNo} (Tambahan #${bNo - 1})`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PRINTABLE THERMAL RECEIPT */}
      <div className="pos-receipt-printable w-full mx-auto font-mono text-black leading-tight px-0">
        {/* HEADER TICKET DAPUR */}
        <div className="text-center mb-2 pb-1.5 border-b-2 border-dashed border-gray-600">
          <h2 className="font-black text-2xl sm:text-3xl uppercase tracking-wider text-black leading-tight">
            {isAddonTicket ? '--- TICKET DAPUR (TAMBAHAN) ---' : '--- TICKET DAPUR ---'}
          </h2>
          {isAddonTicket ? (
            <div className="my-1 py-1 px-2 bg-black text-white font-black text-xs sm:text-sm uppercase rounded">
              ★ HANYA MASAK MENU TAMBAHAN INI ★
            </div>
          ) : hasMultipleBatches ? (
            <div className="my-1 py-0.5 px-2 border-2 border-black text-black font-black text-xs uppercase rounded">
              DAFTAR SEMUA PESANAN (AWAL & TAMBAHAN)
            </div>
          ) : (
            <p className="text-xs sm:text-sm font-black text-black uppercase mt-0.5">
              SEGERA SIAPKAN & MASAK
            </p>
          )}
        </div>

        {/* NOMOR MEJA & INFORMASI PESANAN */}
        <div className="space-y-1 mb-2 pb-1.5 border-b-2 border-dashed border-gray-600">
          {isQuickOrder ? (
            <div className="text-center my-1 py-1.5 px-1 border-y-2 border-black">
              <span className="font-black tracking-tight text-xl sm:text-2xl text-black uppercase block">
                PESANAN LANGSUNG DIAMBIL
              </span>
            </div>
          ) : (
            <div className="flex justify-between items-center my-1 py-1 px-1 border-y-2 border-black">
              <span className="font-bold text-xs sm:text-sm text-black uppercase tracking-wider">
                NO. MEJA:
              </span>
              <span className="font-black text-2xl sm:text-3xl text-black tracking-tight">
                NO. {order.table?.nomor_meja || order.table_id || order.nomor_meja || '--'}
              </span>
            </div>
          )}

          <div className="flex justify-between text-xs sm:text-sm font-bold text-black pt-0.5">
            <span>PELANGGAN:</span>
            <span className="uppercase font-black">{order.nama_pelanggan || 'Pelanggan'}</span>
          </div>

          <div className="flex justify-between text-xs text-black">
            <span>NO PESANAN:</span>
            <span className="font-bold">{order.nomor_pesanan}</span>
          </div>

          <div className="flex justify-between text-xs sm:text-sm py-0.5">
            <span className="font-black text-black uppercase">STATUS BAYAR:</span>
            <span className="font-black uppercase text-black">
              {isFullyPaid ? '✅ LUNAS' : isPartiallyPaid ? '⚠️ LUNAS SEBAGIAN' : '⚠️ BELUM LUNAS'}
            </span>
          </div>

          <div className="flex justify-between text-xs text-black">
            <span>WAKTU PESAN:</span>
            <span className="font-semibold">{formatDateNoSeconds(order.created_at || Date.now())}</span>
          </div>
        </div>

        {/* DAFTAR MENU (MASAK) */}
        <div className="mb-2 pb-2 border-b-2 border-dashed border-gray-600 space-y-2">
          {/* OPSI 1: JIKA HANYA TAMBAHAN / PILIH BATCH SPESIFIK */}
          {(isLatestFilter || isSpecificBatch) && (
            <div>
              <div className="text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 border-black pb-1 flex justify-between items-center">
                <span>DAFTAR MENU MASAK (TAMBAHAN)</span>
                <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded font-black">
                  BATCH #{isSpecificBatch ? targetBatchNo : maxBatch}
                </span>
              </div>
              <div className="space-y-2.5 pt-1">
                {itemsToCook.map((item, idx) => (
                  <div key={idx} className="pb-2 border-b border-gray-300 last:border-b-0 space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-black shrink-0 leading-none">
                        {item.jumlah}X
                      </span>
                      <span className="text-lg sm:text-xl font-black uppercase text-black leading-tight flex-1 break-words">
                        {item.food?.nama || item.nama || 'MENU'}
                      </span>
                    </div>
                    {item.catatan && (
                      <div className="text-xs sm:text-sm font-black uppercase text-black p-1.5 border border-black rounded">
                        * CATATAN: {item.catatan.toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OPSI 2: JIKA SEMUA PESANAN & MULTIPLE BATCHES (DENGAN TANDA PEMISAH JELAS SEPERTI STRUK CUSTOMER) */}
          {activeFilter === 'all' && hasMultipleBatches && (
            <div className="space-y-4">
              {sortedBatchKeys.map((bNo) => {
                const bItems = batches[bNo] || [];
                const isAddon = bNo > 1;

                return (
                  <div key={bNo} className="space-y-2 pt-2 border-t-4 border-black first:border-t-0 first:pt-0">
                    {/* BATCH HEADER PEMISAH (SUPER JELAS & TEGAS) */}
                    {isAddon ? (
                      <div className="p-1.5 bg-black text-white text-center rounded space-y-0.5">
                        <div className="font-black text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-1.5">
                          <span>⚡ PESANAN TAMBAHAN #{bNo - 1}</span>
                          <span className="text-[11px] bg-white text-black px-1.5 py-0.2 rounded font-black">BATCH {bNo}</span>
                        </div>
                        <div className="text-[10px] font-black tracking-widest text-amber-300 uppercase">
                          ★ MENU TAMBAHAN (MASAK INI) ★
                        </div>
                      </div>
                    ) : (
                      <div className="p-1.5 border-2 border-black text-black text-center rounded">
                        <div className="font-black text-sm sm:text-base uppercase tracking-wider">
                          ▶ PESANAN AWAL (BATCH 1)
                        </div>
                      </div>
                    )}

                    {/* DAFTAR MENU PADA BATCH INI */}
                    <div className="space-y-2.5 pt-1">
                      {bItems.map((item, idx) => (
                        <div key={idx} className="pb-2 border-b border-gray-300 last:border-b-0 space-y-1">
                          <div className="flex items-start gap-2">
                            <span className="text-2xl sm:text-3xl font-black text-black shrink-0 leading-none">
                              {item.jumlah}X
                            </span>
                            <span className="text-lg sm:text-xl font-black uppercase text-black leading-tight flex-1 break-words">
                              {item.food?.nama || item.nama || 'MENU'}
                            </span>
                          </div>
                          {item.catatan && (
                            <div className="text-xs sm:text-sm font-black uppercase text-black p-1.5 border border-black rounded">
                              * CATATAN: {item.catatan.toUpperCase()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* OPSI 3: SINGLE BATCH STANDAR */}
          {activeFilter === 'all' && !hasMultipleBatches && (
            <div>
              <div className="text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 border-black pb-1">
                DAFTAR MENU (MASAK)
              </div>
              <div className="space-y-2.5 pt-1">
                {allItems.map((item, idx) => (
                  <div key={idx} className="pb-2 border-b border-gray-300 last:border-b-0 space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-black shrink-0 leading-none">
                        {item.jumlah}X
                      </span>
                      <span className="text-lg sm:text-xl font-black uppercase text-black leading-tight flex-1 break-words">
                        {item.food?.nama || item.nama || 'MENU'}
                      </span>
                    </div>
                    {item.catatan && (
                      <div className="text-xs sm:text-sm font-black uppercase text-black p-1.5 border border-black rounded">
                        * CATATAN: {item.catatan.toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CATATAN PESANAN UMUM */}
        {order.catatan &&
          !order.catatan.toLowerCase().includes('kasir cepat') &&
          !order.catatan.toLowerCase().includes('pesanan kasir') && (
          <div className="mb-2 p-1.5 rounded text-xs sm:text-sm border-2 border-dashed border-black">
            <span className="font-black block uppercase text-xs">CATATAN PESANAN:</span>
            <span className="font-bold uppercase text-black">
              {order.catatan}
            </span>
          </div>
        )}

        {!isFullyPaid && (
          <div className="my-1.5 p-1.5 border-2 border-dashed border-black rounded text-center text-xs sm:text-sm font-black uppercase">
            {isPartiallyPaid ? '⚠️ ADA TAMBAHAN BELUM DIBAYAR - HARAP TAGIH KE MEJA' : '⚠️ BELUM DIBAYAR - HARAP TAGIH KE MEJA'}
          </div>
        )}

        {/* FOOTER TICKET DAPUR */}
        <div className="text-center text-xs text-black pt-1.5 border-t-2 border-dashed border-gray-600">
          <p className="font-black uppercase text-sm">*** SEGERA ANTAR SAAT MATANG ***</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Thermal Receipt Component for 58mm / 80mm printers
 * Supports 'customer', 'kitchen', or 'both' (prints 2 separate auto-cut sheets)
 */
export default function Receipt({
  order,
  type = 'customer',
  paperSize = '80mm',
  defaultKitchenFilter = null
}) {
  if (!order) return null;

  const allItems = order.items || [];
  const batches = {};
  allItems.forEach(it => {
    const b = (it.batch_no && Number(it.batch_no) > 0) ? Number(it.batch_no) : 1;
    if (!batches[b]) batches[b] = [];
    batches[b].push(it);
  });
  const sortedBatchKeys = Object.keys(batches).map(Number).sort((a, b) => a - b);
  const hasMultipleBatches = sortedBatchKeys.length > 1;

  const [kitchenBatchFilter, setKitchenBatchFilter] = React.useState(() => {
    if (defaultKitchenFilter) return defaultKitchenFilter;
    if (order.is_additional) return 'latest';
    return hasMultipleBatches ? 'all' : 'all';
  });

  React.useEffect(() => {
    if (defaultKitchenFilter) {
      setKitchenBatchFilter(defaultKitchenFilter);
    } else if (order.is_additional) {
      setKitchenBatchFilter('latest');
    } else if (hasMultipleBatches) {
      setKitchenBatchFilter('all');
    } else {
      setKitchenBatchFilter('all');
    }
  }, [order.id, order.is_additional, defaultKitchenFilter, hasMultipleBatches]);

  const showCustomer = type === 'customer' || type === 'both';
  const showKitchen = type === 'kitchen' || type === 'both';

  return (
    <div className="pos-receipt-container text-black font-mono bg-white p-2 border shadow-sm mx-auto my-1 leading-tight max-w-full">
      <style>
        {`
          @media print {
            @page {
              size: 80mm auto;
              margin: 0mm !important;
            }
            @page :left {
              margin: 0mm !important;
            }
            @page :right {
              margin: 0mm !important;
            }
            @page :first {
              margin: 0mm !important;
            }
            html, body {
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body * {
              visibility: hidden !important;
            }

            /* Sembunyikan semua tombol selector / filter saat dicetak di kertas */
            .no-print,
            .no-print * {
              display: none !important;
              visibility: hidden !important;
              height: 0 !important;
              max-height: 0 !important;
              overflow: hidden !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
            }

            /* Netralkan semua modal dialog pembungkus agar tidak membatasi lebar kertas 80mm */
            .fixed, [class*="fixed"] {
              position: static !important;
              padding: 0 !important;
              margin: 0 !important;
              background: transparent !important;
              width: 100% !important;
              max-width: 100% !important;
              min-width: 100% !important;
            }
            .max-w-md, [class*="max-w-"] {
              max-width: 100% !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
            }
            .overflow-hidden, .overflow-y-auto {
              overflow: visible !important;
            }

            .pos-receipt-container {
              position: static !important;
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
            }

            .pos-receipt-printable-wrap,
            .pos-receipt-printable-wrap * {
              visibility: visible !important;
            }
            .pos-receipt-printable-wrap {
              position: static !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
            }
            .pos-receipt-printable {
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 0mm 12mm 0mm !important;
              box-sizing: border-box !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              color: #000000 !important;
            }
            .receipt-first-page {
              page-break-after: always !important;
              break-after: page !important;
              margin-bottom: 8mm !important;
              padding-bottom: 8mm !important;
            }
            .receipt-second-page {
              page-break-before: always !important;
              break-before: page !important;
              margin-top: 4mm !important;
            }
            .receipt-separator-preview {
              display: none !important;
              visibility: hidden !important;
              height: 0 !important;
              overflow: hidden !important;
            }
          }
        `}
      </style>

      <div className="pos-receipt-printable-wrap w-full">
        {showCustomer && (
          <div className={type === 'both' ? 'receipt-first-page' : ''}>
            <SingleReceiptContent
              order={order}
              isKitchen={false}
              paperSize={paperSize}
            />
          </div>
        )}

        {type === 'both' && (
          <div className="receipt-separator-preview my-4 py-2 border-t-2 border-dashed border-gray-400 text-center text-xs text-gray-500 font-bold">
            ✂️ --- LEMBAR 2 (TICKET DAPUR - POTONG OTOMATIS) --- ✂️
          </div>
        )}

        {showKitchen && (
          <div className={type === 'both' ? 'receipt-second-page' : ''}>
            <SingleReceiptContent
              order={order}
              isKitchen={true}
              paperSize={paperSize}
              kitchenBatchFilter={kitchenBatchFilter}
              onKitchenBatchFilterChange={setKitchenBatchFilter}
            />
          </div>
        )}
      </div>
    </div>
  );
}

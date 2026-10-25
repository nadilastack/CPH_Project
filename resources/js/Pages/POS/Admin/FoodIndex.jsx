import React, { useState } from 'react';
import { Head, useForm, router, Link } from '@inertiajs/react';
import Sidebar from '@/Components/Bar/Sidebar';
import Swal from 'sweetalert2';
import {
  FiPlus, FiEdit, FiTrash2, FiSearch, FiCheck, FiX,
  FiCoffee, FiFolderPlus, FiImage, FiBookOpen, FiLayers, FiTag
} from 'react-icons/fi';
import CashierGuideModal from '../CashierGuideModal';

export default function FoodIndex({ foods = { data: [] }, categories = [], filters = {}, totalFoodsCount = 0 }) {
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [editingFood, setEditingFood] = useState(null);

  // Filter States
  const [search, setSearch] = useState(filters.search || '');
  const [selectedCategory, setSelectedCategory] = useState(filters.category || 'all');
  const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
  const [perPage, setPerPage] = useState(filters.per_page || 25);

  // Form for Food CRUD
  const { data: foodData, setData: setFoodData, post: postFood, processing: processingFood, errors: foodErrors, reset: resetFood } = useForm({
    category_id: '',
    nama: '',
    harga: '',
    deskripsi: '',
    status: 'Aktif',
    gambar: null,
  });

  // Form for Category
  const { data: catData, setData: setCatData, post: postCat, processing: processingCat, errors: catErrors, reset: resetCat } = useForm({
    nama_kategori: '',
    deskripsi: '',
  });

  const handleOpenAddFood = () => {
    setEditingFood(null);
    resetFood();
    if (categories.length > 0) {
      // Prioritaskan kategori yang sedang aktif difilter jika bukan 'all'
      const defaultCat = (selectedCategory !== 'all' && categories.some(c => c.id.toString() === selectedCategory))
        ? selectedCategory
        : categories[0].id.toString();
      setFoodData('category_id', defaultCat);
    }
    setShowFoodModal(true);
  };

  const handleOpenEditFood = (food) => {
    setEditingFood(food);
    setFoodData({
      category_id: food.category_id.toString(),
      nama: food.nama,
      harga: food.harga.toString(),
      deskripsi: food.deskripsi || '',
      status: food.status,
      gambar: null,
    });
    setShowFoodModal(true);
  };

  const handleSubmitFood = (e) => {
    e.preventDefault();

    if (editingFood) {
      router.post(route('admin.pos.foods.update', editingFood.id), {
        ...foodData,
        _method: 'POST',
      }, {
        onSuccess: () => {
          setShowFoodModal(false);
          resetFood();
          Swal.fire({ icon: 'success', title: 'Menu Makanan Diperbarui!', timer: 1500, showConfirmButton: false });
        }
      });
    } else {
      postFood(route('admin.pos.foods.store'), {
        onSuccess: () => {
          setShowFoodModal(false);
          resetFood();
          Swal.fire({ icon: 'success', title: 'Menu Makanan Berhasil Ditambahkan!', timer: 1500, showConfirmButton: false });
        }
      });
    }
  };

  const handleDeleteFood = (id, nama) => {
    Swal.fire({
      title: `Hapus Menu "${nama}"?`,
      text: 'Menu ini akan dihapus (soft delete) dari sistem POS.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    }).then((result) => {
      if (result.isConfirmed) {
        router.post(route('admin.pos.foods.delete', id), {}, {
          onSuccess: () => {
            Swal.fire({ icon: 'success', title: 'Menu Dihapus!', timer: 1500, showConfirmButton: false });
          }
        });
      }
    });
  };

  const handleToggleStatus = (food) => {
    router.post(route('admin.pos.foods.toggle-status', food.id), {}, {
      preserveScroll: true,
      onSuccess: () => {
        const nextStatus = food.status === 'Aktif' ? 'Tidak Aktif (Habis)' : 'Aktif (Tersedia)';
        Swal.fire({
          icon: 'success',
          title: `Status Diubah!`,
          text: `Menu "${food.nama}" sekarang ${nextStatus}.`,
          timer: 1400,
          showConfirmButton: false
        });
      }
    });
  };

  const handleSubmitCategory = (e) => {
    e.preventDefault();
    postCat(route('admin.pos.food-categories.store'), {
      onSuccess: () => {
        setShowCategoryModal(false);
        resetCat();
        Swal.fire({ icon: 'success', title: 'Kategori Berhasil Ditambahkan!', timer: 1500, showConfirmButton: false });
      }
    });
  };

  // Navigasi Filter Kategori (Persis seperti POS Kasir)
  const handleSelectCategory = (catId) => {
    setSelectedCategory(catId);
    router.get(route('admin.pos.foods.index'), {
      search: search || undefined,
      category: catId === 'all' ? undefined : catId,
      status: selectedStatus === 'all' ? undefined : selectedStatus,
      per_page: perPage,
    }, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  // Navigasi Filter Pencarian
  const handleSearch = (e) => {
    e.preventDefault();
    router.get(route('admin.pos.foods.index'), {
      search: search || undefined,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      status: selectedStatus === 'all' ? undefined : selectedStatus,
      per_page: perPage,
    }, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  const handleClearSearch = () => {
    setSearch('');
    router.get(route('admin.pos.foods.index'), {
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      status: selectedStatus === 'all' ? undefined : selectedStatus,
      per_page: perPage,
    }, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  // Navigasi Filter Status
  const handleSelectStatus = (statusVal) => {
    setSelectedStatus(statusVal);
    router.get(route('admin.pos.foods.index'), {
      search: search || undefined,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      status: statusVal === 'all' ? undefined : statusVal,
      per_page: perPage,
    }, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  // Navigasi Jumlah Baris Per Halaman
  const handleSelectPerPage = (limit) => {
    setPerPage(limit);
    router.get(route('admin.pos.foods.index'), {
      search: search || undefined,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      status: selectedStatus === 'all' ? undefined : selectedStatus,
      per_page: limit,
    }, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  return (
    <Sidebar header={
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
        <div>
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <FiCoffee className="text-green-600" /> Kelola Menu Makanan & Minuman POS
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Atur ketersediaan menu, harga satuan, foto menu, dan kategori hidangan kantin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Panduan Kasir In-App */}
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Buka Buku Panduan Operasional Menu & Kasir POS"
          >
            <FiBookOpen size={14} className="text-emerald-700" />
            <span>📖 Panduan Menu</span>
          </button>

          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 border border-gray-200"
          >
            <FiFolderPlus size={15} /> + Tambah Kategori
          </button>

          <button
            onClick={handleOpenAddFood}
            className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-black text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <FiPlus size={16} /> + Tambah Menu
          </button>
        </div>
      </div>
    }>
      <Head title="Kelola Menu Makanan POS - Central Palantea" />

      <div className="space-y-4">

        {/* ======================================================== */}
        {/* 1. FILTER PER KATEGORI (PERSIS SEPERTI DI POS KASIR)     */}
        {/* ======================================================== */}
        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-gray-200">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-black uppercase text-gray-600 tracking-wider flex items-center gap-1.5">
              <FiLayers className="text-green-600" /> Filter Menu Per Kategori (Kasir POS):
            </span>
            <span className="text-xs text-gray-400 font-medium hidden sm:inline">
              Klik kategori di bawah untuk menyaring daftar menu secara instan
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
            {/* Tombol Tab: Semua Menu */}
            <button
              type="button"
              onClick={() => handleSelectCategory('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                selectedCategory === 'all'
                  ? 'bg-green-600 text-white shadow-xs border border-green-600 font-black'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-gray-300'
              }`}
            >
              <span>🍽️ Semua Menu</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                selectedCategory === 'all' ? 'bg-green-800 text-white' : 'bg-gray-200 text-gray-800'
              }`}>
                {totalFoodsCount || foods.total || foods.data.length}
              </span>
            </button>

            {/* Tombol Tab: Kategori Dinamis dari Database (Minuman, Makanan, Snack, dll) */}
            {categories.map(cat => {
              const isActive = selectedCategory === cat.id.toString();
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id.toString())}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-green-600 text-white shadow-xs border border-green-600 font-black'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FiTag size={12} className={isActive ? 'text-white' : 'text-gray-400'} />
                  <span>{cat.nama_kategori}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-green-800 text-white' : 'bg-gray-200 text-gray-800'
                  }`}>
                    {cat.foods_count ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. SEARCH & CONTROLS BAR                                 */}
        {/* ======================================================== */}
        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-gray-200 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          {/* Input Pencarian */}
          <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-3 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Cari nama menu makanan / minuman..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                title="Hapus kata kunci pencarian"
              >
                <FiX size={15} />
              </button>
            )}
          </form>

          {/* Filter Status & Limit Baris */}
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 text-xs text-gray-600">
            {/* Filter Status Ketersediaan */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 text-[11px] font-bold">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => handleSelectStatus(e.target.value)}
                className="text-xs py-1.5 px-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:ring-green-500 font-semibold"
              >
                <option value="all">Semua Status</option>
                <option value="Aktif">🟢 Aktif (Tersedia)</option>
                <option value="Tidak Aktif">🔴 Tidak Aktif (Habis)</option>
              </select>
            </div>

            <span className="text-gray-300 hidden sm:inline">|</span>

            {/* Per-Page Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 text-[11px] font-bold">Tampilkan:</span>
              <select
                value={perPage}
                onChange={(e) => handleSelectPerPage(e.target.value)}
                className="text-xs py-1.5 px-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:ring-green-500 font-semibold"
              >
                <option value="15">15 menu</option>
                <option value="25">25 menu</option>
                <option value="50">50 menu</option>
                <option value="100">100 menu</option>
              </select>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. TABEL DAFTAR MENU MAKANAN                             */}
        {/* ======================================================== */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-700 uppercase font-bold border-b text-[10px] tracking-wider">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3 w-16">Gambar</th>
                  <th className="p-3">Nama Menu</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Harga Satuan</th>
                  <th className="p-3 text-center">Status (Klik Toggle)</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {foods.data.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-gray-400">
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-gray-500">Tidak ada menu makanan yang cocok.</p>
                        <p className="text-xs">Coba ganti kategori filter atau kata kunci pencarian Anda.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  foods.data.map((food, idx) => {
                    const itemNum = (foods.current_page ? (foods.current_page - 1) * (foods.per_page || 25) : 0) + idx + 1;
                    const isAvailable = food.status === 'Aktif';

                    return (
                      <tr key={food.id} className="hover:bg-green-50/50 transition-colors">
                        {/* 1. Nomor Urut */}
                        <td className="p-3 text-center font-bold text-gray-400">{itemNum}</td>

                        {/* 2. Gambar Foto Menu */}
                        <td className="p-3">
                          <div className="w-11 h-11 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center shrink-0 shadow-2xs">
                            {food.gambar ? (
                              <img
                                src={encodeURI(food.gambar.startsWith('/') || food.gambar.startsWith('http') ? food.gambar : `/storage/${food.gambar}`)}
                                alt={food.nama}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FiImage className="text-gray-400" size={18} />
                            )}
                          </div>
                        </td>

                        {/* 3. Nama Menu & Deskripsi */}
                        <td className="p-3 font-bold text-gray-900">
                          <span className="text-xs sm:text-sm block leading-snug">{food.nama}</span>
                          {food.deskripsi && (
                            <p className="text-[10px] text-gray-500 font-normal line-clamp-1 mt-0.5">
                              {food.deskripsi}
                            </p>
                          )}
                        </td>

                        {/* 4. Kategori */}
                        <td className="p-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            {food.category?.nama_kategori || 'Uncategorized'}
                          </span>
                        </td>

                        {/* 5. Harga Satuan */}
                        <td className="p-3 font-black text-green-700 text-xs sm:text-sm whitespace-nowrap">
                          Rp {Number(food.harga).toLocaleString('id-ID')}
                        </td>

                        {/* 6. Status Ketersediaan (1-Klik Cepat Toggle Aktif/Habis) */}
                        <td className="p-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(food)}
                            title={`Klik untuk ubah status menjadi ${isAvailable ? 'Tidak Aktif (Habis/Sold Out)' : 'Aktif (Dapat Dipesan)'}`}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border transition-all cursor-pointer ${
                              isAvailable
                                ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200 shadow-2xs'
                                : 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200 shadow-2xs'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-green-600' : 'bg-red-600'}`}></span>
                            <span>{food.status}</span>
                          </button>
                        </td>

                        {/* 7. Tombol Aksi (Edit & Hapus) */}
                        <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditFood(food)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors border border-blue-200"
                            title="Edit Menu Ini"
                          >
                            <FiEdit size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteFood(food.id, food.nama)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-200"
                            title="Hapus Menu Ini"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ======================================================== */}
          {/* 4. FOOTER PAGINATION                                     */}
          {/* ======================================================== */}
          {foods && foods.links && foods.links.length > 3 && (
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-gray-500 font-medium">
                Menampilkan <strong>{foods.from || 0}</strong> - <strong>{foods.to || 0}</strong> dari <strong>{foods.total || foods.data.length}</strong> menu
                {selectedCategory !== 'all' && (
                  <span className="ml-1 text-green-700 font-bold">
                    (Kategori: {categories.find(c => c.id.toString() === selectedCategory)?.nama_kategori || selectedCategory})
                  </span>
                )}
              </span>

              <div className="flex gap-1 flex-wrap justify-center">
                {foods.links.map((link, idx) => (
                  <Link
                    key={idx}
                    href={link.url || '#'}
                    preserveScroll
                    preserveState
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                      link.active
                        ? 'bg-green-600 text-white shadow-xs'
                        : link.url
                        ? 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                        : 'text-gray-300 pointer-events-none'
                    }`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ======================================================== */}
      {/* MODAL FOOD FORM (TAMBAH / EDIT MENU)                     */}
      {/* ======================================================== */}
      {showFoodModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-gray-800 flex items-center gap-2">
                <FiCoffee className="text-green-600" />
                {editingFood ? 'Edit Menu Makanan POS' : 'Tambah Menu Makanan Baru'}
              </h3>
              <button onClick={() => setShowFoodModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitFood} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Kategori Menu:</label>
                <select
                  value={foodData.category_id}
                  onChange={(e) => setFoodData('category_id', e.target.value)}
                  className="w-full text-xs p-2 border rounded-lg focus:ring-green-500"
                  required
                >
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.nama_kategori}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Nama Menu:</label>
                <input
                  type="text"
                  value={foodData.nama}
                  onChange={(e) => setFoodData('nama', e.target.value)}
                  className="w-full text-xs p-2 border rounded-lg focus:ring-green-500"
                  placeholder="Contoh: Nasi Goreng Spesial"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Harga Satuan (Rp):</label>
                <input
                  type="number"
                  value={foodData.harga}
                  onChange={(e) => setFoodData('harga', e.target.value)}
                  className="w-full text-xs p-2 border rounded-lg focus:ring-green-500"
                  placeholder="Contoh: 18000"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Deskripsi Ringkas:</label>
                <textarea
                  value={foodData.deskripsi}
                  onChange={(e) => setFoodData('deskripsi', e.target.value)}
                  className="w-full text-xs p-2 border rounded-lg focus:ring-green-500"
                  rows={2}
                  placeholder="Keterangan bahan/rasa..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Status Ketersediaan:</label>
                <select
                  value={foodData.status}
                  onChange={(e) => setFoodData('status', e.target.value)}
                  className="w-full text-xs p-2 border rounded-lg focus:ring-green-500 font-semibold"
                >
                  <option value="Aktif">🟢 Aktif (Dapat Dipesan)</option>
                  <option value="Tidak Aktif">🔴 Tidak Aktif (Habis/Sold Out)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Foto Menu (PNG / JPG berbingkai):</label>
                <input
                  type="file"
                  onChange={(e) => setFoodData('gambar', e.target.files[0])}
                  className="w-full text-xs p-1.5 border rounded-lg"
                  accept="image/*"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={processingFood}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {processingFood ? 'Menyimpan...' : 'Simpan Menu'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFoodModal(false)}
                  className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL CATEGORY FORM                                      */}
      {/* ======================================================== */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-gray-800 flex items-center gap-2">
                <FiFolderPlus className="text-green-600" /> Tambah Kategori Baru
              </h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitCategory} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Nama Kategori:</label>
                <input
                  type="text"
                  value={catData.nama_kategori}
                  onChange={(e) => setCatData('nama_kategori', e.target.value)}
                  className="w-full text-xs p-2 border rounded-lg focus:ring-green-500"
                  placeholder="Contoh: Coffee, Minuman, Snack, Makanan"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Deskripsi (Opsional):</label>
                <textarea
                  value={catData.deskripsi}
                  onChange={(e) => setCatData('deskripsi', e.target.value)}
                  className="w-full text-xs p-2 border rounded-lg focus:ring-green-500"
                  rows={2}
                  placeholder="Keterangan singkat kategori..."
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={processingCat}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {processingCat ? 'Menyimpan...' : 'Simpan Kategori'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL PANDUAN KASIR & MENU IN-APP                        */}
      {/* ======================================================== */}
      <CashierGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        initialTab="menu"
      />
    </Sidebar>
  );
}

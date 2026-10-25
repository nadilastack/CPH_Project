<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Models\PosFood;
use App\Models\PosFoodCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class AdminFoodController extends Controller
{
    /**
     * Tampilkan Halaman Kelola Menu Makanan Admin
     */
    public function index(Request $request)
    {
        // Auto-seed Pempek Palantea jika belum ada di database
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

        $query = PosFood::with('category')->orderBy('nama', 'asc');

        if ($request->filled('search')) {
            $query->where('nama', 'like', '%' . $request->search . '%');
        }

        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category_id', $request->category);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $perPage = (int) $request->input('per_page', 25);
        if ($perPage <= 0 || $perPage > 200) $perPage = 25;

        $foods = $query->paginate($perPage)->withQueryString();
        $categories = PosFoodCategory::withCount('foods')->orderBy('nama_kategori', 'asc')->get();
        $totalFoodsCount = PosFood::count();

        return Inertia::render('POS/Admin/FoodIndex', [
            'foods' => $foods,
            'categories' => $categories,
            'totalFoodsCount' => $totalFoodsCount,
            'filters' => [
                'search' => $request->search ?? '',
                'category' => $request->category ?? 'all',
                'status' => $request->status ?? 'all',
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Simpan Food Baru
     */
    public function store(Request $request)
    {
        $request->validate([
            'category_id' => 'required|exists:pos_food_categories,id',
            'nama' => 'required|string|max:255',
            'harga' => 'required|integer|min:0',
            'deskripsi' => 'nullable|string|max:1000',
            'status' => 'required|in:Aktif,Tidak Aktif',
            'gambar' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $gambarPath = null;
        if ($request->hasFile('gambar')) {
            $gambarPath = $request->file('gambar')->store('pos_foods', 'public');
        }

        PosFood::create([
            'category_id' => $request->category_id,
            'nama' => $request->nama,
            'harga' => $request->harga,
            'deskripsi' => $request->deskripsi,
            'status' => $request->status,
            'gambar' => $gambarPath ? '/storage/' . $gambarPath : null,
        ]);

        return back()->with('success', 'Menu makanan baru berhasil ditambahkan!');
    }

    /**
     * Update Food
     */
    public function update(Request $request, $id)
    {
        $food = PosFood::findOrFail($id);

        $request->validate([
            'category_id' => 'required|exists:pos_food_categories,id',
            'nama' => 'required|string|max:255',
            'harga' => 'required|integer|min:0',
            'deskripsi' => 'nullable|string|max:1000',
            'status' => 'required|in:Aktif,Tidak Aktif',
            'gambar' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $data = [
            'category_id' => $request->category_id,
            'nama' => $request->nama,
            'harga' => $request->harga,
            'deskripsi' => $request->deskripsi,
            'status' => $request->status,
        ];

        if ($request->hasFile('gambar')) {
            if ($food->gambar && str_contains($food->gambar, '/storage/')) {
                $oldPath = str_replace('/storage/', '', $food->gambar);
                Storage::disk('public')->delete($oldPath);
            }
            $gambarPath = $request->file('gambar')->store('pos_foods', 'public');
            $data['gambar'] = '/storage/' . $gambarPath;
        }

        $food->update($data);

        return back()->with('success', 'Menu makanan berhasil diperbarui!');
    }

    /**
     * Toggle Cepat Status Food (Aktif / Tidak Aktif / Habis)
     */
    public function toggleStatus($id)
    {
        $food = PosFood::findOrFail($id);
        $food->status = ($food->status === 'Aktif') ? 'Tidak Aktif' : 'Aktif';
        $food->save();

        $statusText = $food->status === 'Aktif' ? 'Aktif (Dapat Dipesan)' : 'Tidak Aktif (Habis/Sold Out)';
        return back()->with('success', 'Status menu "' . $food->nama . '" diubah menjadi ' . $statusText . '!');
    }

    /**
     * Soft Delete Food
     */
    public function destroy($id)
    {
        $food = PosFood::findOrFail($id);
        $food->delete();

        return back()->with('success', 'Menu makanan berhasil dihapus (soft delete).');
    }

    /**
     * Tambah Kategori Makanan Baru
     */
    public function storeCategory(Request $request)
    {
        $request->validate([
            'nama_kategori' => 'required|string|max:255|unique:pos_food_categories,nama_kategori',
            'deskripsi' => 'nullable|string|max:500',
        ]);

        PosFoodCategory::create([
            'nama_kategori' => $request->nama_kategori,
            'deskripsi' => $request->deskripsi,
            'status' => 'Aktif',
        ]);

        return back()->with('success', 'Kategori makanan baru berhasil ditambahkan!');
    }
}

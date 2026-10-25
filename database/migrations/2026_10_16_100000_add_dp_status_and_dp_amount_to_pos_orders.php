<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('pos_orders')) {
            try {
                DB::statement("ALTER TABLE pos_orders MODIFY COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID'");
            } catch (\Exception $e) {
                // Abaikan jika database bukan MySQL murni
            }

            Schema::table('pos_orders', function (Blueprint $table) {
                if (!Schema::hasColumn('pos_orders', 'dp_amount')) {
                    $table->integer('dp_amount')->default(0)->after('total');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('pos_orders')) {
            Schema::table('pos_orders', function (Blueprint $table) {
                if (Schema::hasColumn('pos_orders', 'dp_amount')) {
                    $table->dropColumn('dp_amount');
                }
            });
        }
    }
};

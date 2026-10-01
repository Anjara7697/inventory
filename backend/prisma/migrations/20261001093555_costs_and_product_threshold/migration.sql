-- AlterTable
ALTER TABLE "materials" ADD COLUMN     "unit_cost" DECIMAL(20,8) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "product_stocks" ADD COLUMN     "minimum_quantity" DECIMAL(20,8) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "purchase_order_lines" ADD COLUMN     "unit_price" DECIMAL(20,8);

ALTER TABLE "materials" ADD CONSTRAINT "materials_unit_cost_check" CHECK ("unit_cost" >= 0);
ALTER TABLE "product_stocks" ADD CONSTRAINT "product_stocks_minimum_quantity_check" CHECK ("minimum_quantity" >= 0);
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_unit_price_check" CHECK ("unit_price" IS NULL OR "unit_price" >= 0);

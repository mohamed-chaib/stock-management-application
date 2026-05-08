import { getDB } from '../database/db'
import { InventoryService } from './InventoryService'
import { StockHistoryService } from './StockHistoryService'
import crypto from 'node:crypto'

export class ProductService {

  /**
   * Get all products ordered by creation date.
   */
  static getAll() {
    const db = getDB()
    return db.prepare('SELECT * FROM Products ORDER BY created_at DESC').all()
  }

  /**
   * Create a new product with input validation.
   * If initial stock is provided, also creates a Stock_Entry batch.
   */
  static create(product: any) {
    const db = getDB()

    if (!product.name_en || !product.name_ar) {
      throw new Error('Product name (EN and AR) is required')
    }
    if (product.selling_price !== undefined && product.selling_price < 0) {
      throw new Error('Selling price cannot be negative')
    }
    if (product.purchase_price !== undefined && product.purchase_price < 0) {
      throw new Error('Purchase price cannot be negative')
    }

    const id = crypto.randomUUID()

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO Products (id, barcode, name_en, name_ar, category, purchase_price, selling_price, stock_quantity, min_stock_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        product.barcode || id.slice(0, 8),
        product.name_en,
        product.name_ar,
        product.category || '',
        product.purchase_price || 0,
        product.selling_price || 0,
        product.stock_quantity || 0,
        product.min_stock_level || 5
      )

      // If initial stock is provided, create a stock batch
      if (product.stock_quantity && product.stock_quantity > 0) {
        const batchResult = db.prepare(`
          INSERT INTO Stock_Entries (product_id, quantity, purchase_price, remaining_quantity)
          VALUES (?, ?, ?, ?)
        `).run(id, product.stock_quantity, product.purchase_price || 0, product.stock_quantity)

        // Log initial stock to audit trail
        StockHistoryService.log({
          productId: id,
          type: 'PURCHASE',
          quantity: product.stock_quantity,
          unitPrice: product.purchase_price || 0,
          referenceId: Number(batchResult.lastInsertRowid),
          referenceType: 'initial_stock',
          note: `Initial stock: ${product.stock_quantity} units @ ${product.purchase_price || 0} DA`
        }, db)
      }

      return { success: true, id }
    })

    return transaction()
  }

  /**
   * Update product details. 
   * IMPORTANT: stock_quantity is NOT updated here — stock changes only via inventory batches.
   */
  static update(product: any) {
    const db = getDB()

    if (!product.id) throw new Error('Product ID is required')
    if (!product.name_en || !product.name_ar) throw new Error('Product name is required')
    if (product.selling_price !== undefined && product.selling_price < 0) {
      throw new Error('Selling price cannot be negative')
    }

    // Update product info but NOT stock_quantity (managed by batches)
    db.prepare(`
      UPDATE Products
      SET barcode = ?, name_en = ?, name_ar = ?, category = ?,
          purchase_price = ?, selling_price = ?, min_stock_level = ?
      WHERE id = ?
    `).run(
      product.barcode,
      product.name_en,
      product.name_ar,
      product.category,
      product.purchase_price,
      product.selling_price,
      product.min_stock_level,
      product.id
    )

    return { success: true }
  }

  /**
   * Delete a product. Blocks if the product has active stock or is referenced in sales.
   */
  static delete(id: string) {
    const db = getDB()

    // Check for active stock
    const activeStock = db.prepare(
      'SELECT COALESCE(SUM(remaining_quantity), 0) as total FROM Stock_Entries WHERE product_id = ?'
    ).get(id) as { total: number }

    if (activeStock.total > 0) {
      throw new Error(`Cannot delete product with ${activeStock.total} units still in stock. Remove stock first.`)
    }

    // Check for sale references
    const saleRefs = db.prepare(
      'SELECT COUNT(*) as count FROM Sale_Items WHERE product_id = ?'
    ).get(id) as { count: number }

    if (saleRefs.count > 0) {
      throw new Error(`Cannot delete product referenced in ${saleRefs.count} sale(s). It has sales history.`)
    }

    db.prepare('DELETE FROM Stock_Entries WHERE product_id = ?').run(id)
    db.prepare('DELETE FROM Products WHERE id = ?').run(id)

    return { success: true }
  }

  /**
   * Get available stock for a product (computed from batches).
   */
  static getStock(productId: string): number {
    return InventoryService.getAvailableStock(productId)
  }
}

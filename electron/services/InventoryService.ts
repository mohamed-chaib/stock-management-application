import Database from 'better-sqlite3'
import { getDB } from '../database/db'
import { StockHistoryService } from './StockHistoryService'

export interface StockEntry {
  id: number
  product_id: string
  quantity: number
  purchase_price: number
  remaining_quantity: number
  created_at: string
}

export interface BatchConsumption {
  stock_entry_id: number
  quantity_used: number
  purchase_price: number
  profit: number
}

export class InventoryService {

  /**
   * Add a new stock batch for a product. Updates the cached stock_quantity on Products.
   */
  static addBatch(productId: string, quantity: number, purchasePrice: number) {
    const db = getDB()

    if (!productId) throw new Error('Product ID is required')
    if (quantity <= 0) throw new Error('Quantity must be greater than 0')
    if (purchasePrice < 0) throw new Error('Purchase price cannot be negative')

    const product = db.prepare('SELECT id FROM Products WHERE id = ?').get(productId)
    if (!product) throw new Error('Product not found')

    const transaction = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO Stock_Entries (product_id, quantity, purchase_price, remaining_quantity)
        VALUES (?, ?, ?, ?)
      `).run(productId, quantity, purchasePrice, quantity)

      // Log to audit trail
      StockHistoryService.log({
        productId,
        type: 'PURCHASE',
        quantity: quantity,  // positive = stock IN
        unitPrice: purchasePrice,
        referenceId: Number(result.lastInsertRowid),
        referenceType: 'batch',
        note: `Purchased ${quantity} units @ ${purchasePrice} DA`
      }, db)

      // Sync the cached stock_quantity on Products
      this.syncProductStock(db, productId)
    })
    transaction()
  }

  /**
   * FIFO deduction: consumes batches oldest-first, returns detailed consumption records.
   * Must be called INSIDE an existing transaction.
   */
  static deductFIFO(db: Database.Database, productId: string, quantity: number, sellingPrice: number): BatchConsumption[] {
    const batches = db.prepare(`
      SELECT * FROM Stock_Entries
      WHERE product_id = ? AND remaining_quantity > 0
      ORDER BY created_at ASC
    `).all(productId) as StockEntry[]

    const updateBatch = db.prepare('UPDATE Stock_Entries SET remaining_quantity = ? WHERE id = ?')
    const consumptions: BatchConsumption[] = []
    let remaining = quantity

    for (const batch of batches) {
      if (remaining <= 0) break

      const consume = Math.min(batch.remaining_quantity, remaining)
      updateBatch.run(batch.remaining_quantity - consume, batch.id)

      const profit = (sellingPrice - batch.purchase_price) * consume
      consumptions.push({
        stock_entry_id: batch.id,
        quantity_used: consume,
        purchase_price: batch.purchase_price,
        profit
      })

      // Log each batch consumption to audit trail
      StockHistoryService.log({
        productId,
        type: 'SALE',
        quantity: -consume,  // negative = stock OUT
        unitPrice: batch.purchase_price,
        referenceId: batch.id,
        referenceType: 'sale_batch',
        note: `Sold ${consume} units from batch #${batch.id} (cost: ${batch.purchase_price} DA, sold at: ${sellingPrice} DA)`
      }, db)

      remaining -= consume
    }

    if (remaining > 0) {
      throw new Error(`Insufficient stock for product ${productId}. Short by ${remaining} units.`)
    }

    return consumptions
  }

  /**
   * Get total available stock from batches (source of truth).
   */
  static getAvailableStock(productId: string): number {
    const db = getDB()
    const result = db.prepare(
      'SELECT COALESCE(SUM(remaining_quantity), 0) as total FROM Stock_Entries WHERE product_id = ?'
    ).get(productId) as { total: number }
    return result.total
  }

  /**
   * Validate that all items in a cart can be fulfilled by available stock.
   */
  static validateStockAvailability(items: Array<{ product: { id: string; name_en: string }; quantity: number }>): void {
    for (const item of items) {
      const available = this.getAvailableStock(item.product.id)
      if (item.quantity > available) {
        throw new Error(
          `Not enough stock for "${item.product.name_en}". Available: ${available}, Requested: ${item.quantity}`
        )
      }
    }
  }

  /**
   * Sync cached stock_quantity on Products table from Stock_Entries.
   * Must be called after any batch modification.
   */
  static syncProductStock(db: Database.Database, productId: string): void {
    const result = db.prepare(
      'SELECT COALESCE(SUM(remaining_quantity), 0) as total FROM Stock_Entries WHERE product_id = ?'
    ).get(productId) as { total: number }

    db.prepare('UPDATE Products SET stock_quantity = ? WHERE id = ?').run(result.total, productId)
  }

  /**
   * Get all batches for a product (for inspection/debugging).
   */
  static getBatches(productId: string): StockEntry[] {
    const db = getDB()
    return db.prepare(
      'SELECT * FROM Stock_Entries WHERE product_id = ? ORDER BY created_at ASC'
    ).all(productId) as StockEntry[]
  }
}

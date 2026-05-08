import Database from 'better-sqlite3'
import { getDB } from '../database/db'

export type StockMovementType = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN'

export interface StockHistoryEntry {
  id: number
  product_id: string
  type: StockMovementType
  quantity: number
  unit_price: number
  total_price: number
  reference_id: string | null
  reference_type: string | null
  note: string | null
  created_at: string
}

export interface LogStockMovementParams {
  productId: string
  type: StockMovementType
  quantity: number       // positive for IN, negative for OUT
  unitPrice: number
  referenceId?: string | number
  referenceType?: string // 'batch', 'sale', 'manual'
  note?: string
}

export class StockHistoryService {

  /**
   * Log a stock movement. Can be called inside or outside a transaction.
   * If a db instance is passed, uses it (for transactional usage).
   */
  static log(params: LogStockMovementParams, dbInstance?: Database.Database): void {
    const db = dbInstance || getDB()
    const totalPrice = Math.abs(params.quantity) * params.unitPrice

    db.prepare(`
      INSERT INTO Stock_History (product_id, type, quantity, unit_price, total_price, reference_id, reference_type, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      params.productId,
      params.type,
      params.quantity,
      params.unitPrice,
      totalPrice,
      params.referenceId != null ? String(params.referenceId) : null,
      params.referenceType || null,
      params.note || null
    )
  }

  /**
   * Get full stock history for a product, ordered newest first.
   */
  static getByProduct(productId: string): StockHistoryEntry[] {
    const db = getDB()
    return db.prepare(`
      SELECT SH.*, P.name_en as product_name
      FROM Stock_History SH
      JOIN Products P ON SH.product_id = P.id
      WHERE SH.product_id = ?
      ORDER BY SH.created_at DESC
    `).all(productId) as any[]
  }

  /**
   * Get all stock history, optionally filtered by type and/or date range.
   */
  static getAll(filters: { type?: StockMovementType; startDate?: string; endDate?: string; productId?: string } = {}): StockHistoryEntry[] {
    const db = getDB()
    const conditions: string[] = []
    const params: any[] = []

    if (filters.type) {
      conditions.push('SH.type = ?')
      params.push(filters.type)
    }
    if (filters.productId) {
      conditions.push('SH.product_id = ?')
      params.push(filters.productId)
    }
    if (filters.startDate) {
      conditions.push('SH.created_at >= ?')
      params.push(filters.startDate)
    }
    if (filters.endDate) {
      conditions.push('SH.created_at <= ?')
      params.push(filters.endDate + ' 23:59:59')
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    return db.prepare(`
      SELECT SH.*, P.name_en as product_name
      FROM Stock_History SH
      JOIN Products P ON SH.product_id = P.id
      ${where}
      ORDER BY SH.created_at DESC
    `).all(...params) as any[]
  }
}

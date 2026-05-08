import { getDB } from '../database/db'
import { InventoryService } from './InventoryService'

interface CreateSaleParams {
  items: Array<{ product: { id: string; name_en: string; selling_price: number }; quantity: number }>
  userId: string
  clientId?: string
  paidAmount?: number
  paymentMethod?: string
  discount?: number
  tax?: number
}

export class SaleService {

  /**
   * Generate a sequential invoice number like INV-000001.
   */
  private static getNextInvoiceNumber(db: ReturnType<typeof getDB>): string {
    const setting = db.prepare("SELECT value FROM Settings WHERE key = 'last_invoice_number'").get() as { value: string } | undefined
    const lastNum = setting ? parseInt(setting.value, 10) : 0
    const nextNum = lastNum + 1
    db.prepare("INSERT OR REPLACE INTO Settings (key, value) VALUES ('last_invoice_number', ?)").run(String(nextNum))
    return `INV-${String(nextNum).padStart(6, '0')}`
  }

  /**
   * Create a sale with full FIFO deduction, payment recording, and client balance updates.
   * Everything runs inside a single transaction for data consistency.
   */
  static createSale(params: CreateSaleParams) {
    const db = getDB()
    const {
      items,
      userId,
      clientId = 'default',
      paidAmount,
      paymentMethod = 'cash',
      discount = 0,
      tax = 0
    } = params

    if (!items || items.length === 0) throw new Error('Cart is empty')

    // Pre-validate stock availability BEFORE entering the transaction
    InventoryService.validateStockAvailability(items)

    const transaction = db.transaction(() => {
      // Compute totals server-side from authoritative prices
      const totalAmount = items.reduce((sum, item) => sum + (item.product.selling_price * item.quantity), 0)
      const finalTotal = totalAmount - discount + tax
      const actualPaid = paidAmount !== undefined && paidAmount >= 0 ? paidAmount : finalTotal
      
      if (actualPaid < 0) throw new Error('Paid amount cannot be negative')
      if (actualPaid > finalTotal) throw new Error('Paid amount cannot exceed total')

      const status = actualPaid >= finalTotal ? 'paid' : (actualPaid > 0 ? 'partial' : 'unpaid')
      const invoiceNumber = this.getNextInvoiceNumber(db)

      const saleResult = db.prepare(`
        INSERT INTO Sales (invoice_number, user_id, client_id, total_amount, paid_amount, discount, tax, payment_method, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(invoiceNumber, userId, clientId, finalTotal, actualPaid, discount, tax, paymentMethod, status)

      const saleId = saleResult.lastInsertRowid

      const insertItem = db.prepare(`
        INSERT INTO Sale_Items (sale_id, product_id, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `)

      const insertBatchLog = db.prepare(`
        INSERT INTO Sale_Item_Batches (sale_item_id, stock_entry_id, quantity_used, profit)
        VALUES (?, ?, ?, ?)
      `)

      for (const item of items) {
        const subtotal = item.product.selling_price * item.quantity
        const saleItemRes = insertItem.run(saleId, item.product.id, item.quantity, item.product.selling_price, subtotal)
        const saleItemId = saleItemRes.lastInsertRowid

        // FIFO deduction
        const consumptions = InventoryService.deductFIFO(db, item.product.id, item.quantity, item.product.selling_price)
        for (const c of consumptions) {
          insertBatchLog.run(saleItemId, c.stock_entry_id, c.quantity_used, c.profit)
        }

        // Sync cached stock on Products table
        InventoryService.syncProductStock(db, item.product.id)
      }

      // Record initial payment
      if (actualPaid > 0) {
        db.prepare(`
          INSERT INTO Payments (sale_id, client_id, amount, payment_method)
          VALUES (?, ?, ?, ?)
        `).run(saleId, clientId, actualPaid, paymentMethod)
      }

      // Update client balances
      db.prepare(`
        UPDATE Clients
        SET total_purchases = total_purchases + ?, total_paid = total_paid + ?
        WHERE id = ?
      `).run(finalTotal, actualPaid, clientId)

      return { success: true, invoiceNumber, saleId }
    })

    return transaction()
  }

  /**
   * Add a follow-up payment to an existing sale.
   */
  static addPayment(saleId: number, amount: number, paymentMethod: string = 'cash') {
    const db = getDB()

    if (amount <= 0) throw new Error('Payment amount must be greater than 0')

    const transaction = db.transaction(() => {
      const sale = db.prepare('SELECT * FROM Sales WHERE id = ?').get(saleId) as any
      if (!sale) throw new Error('Sale not found')

      const remaining = sale.total_amount - sale.paid_amount
      if (amount > remaining + 0.01) {
        throw new Error(`Payment of ${amount} exceeds remaining balance of ${remaining.toFixed(2)}`)
      }

      db.prepare(`
        INSERT INTO Payments (sale_id, client_id, amount, payment_method)
        VALUES (?, ?, ?, ?)
      `).run(saleId, sale.client_id, amount, paymentMethod)

      const newPaid = sale.paid_amount + amount
      const newStatus = newPaid >= sale.total_amount ? 'paid' : 'partial'

      db.prepare('UPDATE Sales SET paid_amount = ?, status = ? WHERE id = ?')
        .run(newPaid, newStatus, saleId)

      db.prepare('UPDATE Clients SET total_paid = total_paid + ? WHERE id = ?')
        .run(amount, sale.client_id)

      return { success: true }
    })

    return transaction()
  }

  /**
   * Get all sales with client name, ordered by most recent.
   */
  static listSales() {
    const db = getDB()
    return db.prepare(`
      SELECT S.*, C.name as client_name
      FROM Sales S
      LEFT JOIN Clients C ON S.client_id = C.id
      ORDER BY S.created_at DESC
    `).all()
  }

  /**
   * Get detailed items for a specific sale.
   */
  static getSaleDetails(saleId: number) {
    const db = getDB()
    return db.prepare(`
      SELECT SI.*, P.name_en, P.name_ar, P.barcode
      FROM Sale_Items SI
      JOIN Products P ON SI.product_id = P.id
      WHERE SI.sale_id = ?
    `).all(saleId)
  }

  /**
   * Get payment history for a specific sale.
   */
  static getSalePayments(saleId: number) {
    const db = getDB()
    return db.prepare('SELECT * FROM Payments WHERE sale_id = ? ORDER BY created_at ASC').all(saleId)
  }
}

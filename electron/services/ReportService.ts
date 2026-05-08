import { getDB } from '../database/db'

interface ReportFilters {
  startDate?: string
  endDate?: string
  productId?: string
  clientId?: string
}

export class ReportService {

  /**
   * Build a SQL WHERE clause and parameter array from date filters.
   */
  private static buildDateCondition(filters: ReportFilters, dateColumn: string = 'created_at') {
    const conditions: string[] = []
    const params: any[] = []

    if (filters.startDate) {
      conditions.push(`${dateColumn} >= ?`)
      params.push(filters.startDate)
    }
    if (filters.endDate) {
      conditions.push(`${dateColumn} <= ?`)
      params.push(filters.endDate + ' 23:59:59')
    }

    return { clause: conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '', params }
  }

  /**
   * Get a full financial summary: expenses, revenue, collected cash, and net profit.
   */
  static getFinancialSummary(filters: ReportFilters = {}) {
    const db = getDB()

    // --- Total Expenses (inputs) ---
    const expDate = this.buildDateCondition(filters)
    let expQuery = `SELECT COALESCE(SUM(quantity * purchase_price), 0) as total FROM Stock_Entries`
    let expConditions = expDate.clause ? [expDate.clause.replace('WHERE ', '')] : []
    let expParams = [...expDate.params]

    if (filters.productId) {
      expConditions.push('product_id = ?')
      expParams.push(filters.productId)
    }
    if (expConditions.length > 0) {
      expQuery += ' WHERE ' + expConditions.join(' AND ')
    }
    const expenses = db.prepare(expQuery).get(...expParams) as any

    // --- Total Revenue & Collected (outputs) ---
    let revQuery: string
    let revParams: any[]

    if (filters.productId) {
      // When filtering by product, sum from Sale_Items
      const saleDate = this.buildDateCondition(filters, 'S.created_at')
      let conditions = saleDate.clause ? [saleDate.clause.replace('WHERE ', '')] : []
      revParams = [...saleDate.params]
      conditions.push('SI.product_id = ?')
      revParams.push(filters.productId)

      revQuery = `
        SELECT COALESCE(SUM(SI.subtotal), 0) as total_revenue, 0 as total_collected
        FROM Sale_Items SI JOIN Sales S ON SI.sale_id = S.id
        WHERE ${conditions.join(' AND ')}
      `
    } else {
      const saleDate = this.buildDateCondition(filters)
      let conditions = saleDate.clause ? [saleDate.clause.replace('WHERE ', '')] : []
      revParams = [...saleDate.params]

      if (filters.clientId) {
        conditions.push('client_id = ?')
        revParams.push(filters.clientId)
      }

      revQuery = `SELECT COALESCE(SUM(total_amount), 0) as total_revenue, COALESCE(SUM(paid_amount), 0) as total_collected FROM Sales`
      if (conditions.length > 0) {
        revQuery += ' WHERE ' + conditions.join(' AND ')
      }
    }
    const revenue = db.prepare(revQuery).get(...revParams) as any

    // --- Net Profit from FIFO batches ---
    const profDate = this.buildDateCondition(filters, 'S.created_at')
    let profConditions = profDate.clause ? [profDate.clause.replace('WHERE ', '')] : []
    let profParams = [...profDate.params]

    if (filters.productId) {
      profConditions.push('SI.product_id = ?')
      profParams.push(filters.productId)
    }
    if (filters.clientId) {
      profConditions.push('S.client_id = ?')
      profParams.push(filters.clientId)
    }

    let profQuery = `
      SELECT COALESCE(SUM(SIB.profit), 0) as net_profit
      FROM Sale_Item_Batches SIB
      JOIN Sale_Items SI ON SIB.sale_item_id = SI.id
      JOIN Sales S ON SI.sale_id = S.id
    `
    if (profConditions.length > 0) {
      profQuery += ' WHERE ' + profConditions.join(' AND ')
    }
    const profit = db.prepare(profQuery).get(...profParams) as any

    return {
      totalExpenses: expenses?.total || 0,
      totalRevenue: revenue?.total_revenue || 0,
      totalCollected: revenue?.total_collected || 0,
      netProfit: profit?.net_profit || 0
    }
  }

  /**
   * Dashboard metrics: today's sales, products sold, low stock count.
   */
  static getDashboardMetrics() {
    const db = getDB()
    const today = new Date().toISOString().split('T')[0]

    const salesToday = db.prepare(
      'SELECT COALESCE(SUM(total_amount), 0) as total FROM Sales WHERE date(created_at) = ?'
    ).get(today) as any

    const productsSoldToday = db.prepare(`
      SELECT COALESCE(SUM(SI.quantity), 0) as total
      FROM Sale_Items SI
      JOIN Sales S ON SI.sale_id = S.id
      WHERE date(S.created_at) = ?
    `).get(today) as any

    const lowStock = db.prepare(
      'SELECT COUNT(*) as count FROM Products WHERE stock_quantity <= min_stock_level'
    ).get() as any

    return {
      todaySales: salesToday?.total || 0,
      productsSold: productsSoldToday?.total || 0,
      lowStock: lowStock?.count || 0
    }
  }
}

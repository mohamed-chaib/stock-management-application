import { getDB } from '../database/db'

interface ReportFilters {
  startDate?: string
  endDate?: string
  productId?: string
  clientId?: string
}

interface InputDetail {
  stock_entry_id: number
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total: number
  created_at: string
}

interface OutputDetail {
  sale_id: number
  invoice_number: string
  product_id: string
  product_name: string
  quantity: number
  selling_price: number
  total: number
  created_at: string
}

interface COGSDetail {
  sale_id: number
  invoice_number: string
  sale_item_id: number
  product_id: string
  product_name: string
  batch_id: number
  batch_purchase_price: number
  quantity_used: number
  cost: number
  selling_price: number
  revenue: number
  profit: number
}

interface ProfitPerSale {
  sale_id: number
  invoice_number: string
  total_revenue: number
  total_cogs: number
  gross_profit: number
  created_at: string
}

export interface DetailedFinancialReport {
  total_inputs: number
  total_outputs: number
  total_cogs: number
  net_profit: number
  details: {
    inputs: InputDetail[]
    outputs: OutputDetail[]
    cogs_breakdown: COGSDetail[]
    profit_per_sale: ProfitPerSale[]
  }
}

export class FinancialReportService {

  private static buildWhere(conditions: string[]): string {
    return conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''
  }

  /**
   * Generate a fully transparent financial report.
   * Every number is traceable back to its source records.
   */
  static getDetailedReport(filters: ReportFilters = {}): DetailedFinancialReport {
    const db = getDB()

    // === 1. INPUTS (Purchases) — from Stock_Entries ===
    const inputConditions: string[] = []
    const inputParams: any[] = []

    if (filters.startDate) { inputConditions.push('SE.created_at >= ?'); inputParams.push(filters.startDate) }
    if (filters.endDate) { inputConditions.push('SE.created_at <= ?'); inputParams.push(filters.endDate + ' 23:59:59') }
    if (filters.productId) { inputConditions.push('SE.product_id = ?'); inputParams.push(filters.productId) }

    const inputs = db.prepare(`
      SELECT
        SE.id as stock_entry_id,
        SE.product_id,
        P.name_en as product_name,
        P.name_ar as product_name_ar,
        SE.quantity,
        SE.purchase_price as unit_price,
        (SE.quantity * SE.purchase_price) as total,
        SE.created_at
      FROM Stock_Entries SE
      JOIN Products P ON SE.product_id = P.id
      ${this.buildWhere(inputConditions)}
      ORDER BY SE.created_at ASC
    `).all(...inputParams) as InputDetail[]

    const total_inputs = inputs.reduce((sum, i) => sum + i.total, 0)

    // === 2. OUTPUTS (Revenue) — from Sales + Sale_Items ===
    const outputConditions: string[] = []
    const outputParams: any[] = []

    if (filters.startDate) { outputConditions.push('S.created_at >= ?'); outputParams.push(filters.startDate) }
    if (filters.endDate) { outputConditions.push('S.created_at <= ?'); outputParams.push(filters.endDate + ' 23:59:59') }
    if (filters.productId) { outputConditions.push('SI.product_id = ?'); outputParams.push(filters.productId) }
    if (filters.clientId) { outputConditions.push('S.client_id = ?'); outputParams.push(filters.clientId) }

    const outputs = db.prepare(`
      SELECT
        S.id as sale_id,
        S.invoice_number,
        SI.product_id,
        P.name_en as product_name,
        P.name_ar as product_name_ar,
        SI.quantity,
        SI.unit_price as selling_price,
        SI.subtotal as total,
        S.created_at
      FROM Sale_Items SI
      JOIN Sales S ON SI.sale_id = S.id
      JOIN Products P ON SI.product_id = P.id
      ${this.buildWhere(outputConditions)}
      ORDER BY S.created_at ASC
    `).all(...outputParams) as OutputDetail[]

    const total_outputs = outputs.reduce((sum, o) => sum + o.total, 0)

    // === 3. COGS Breakdown — from Sale_Item_Batches (FIFO consumed batches) ===
    const cogsConditions: string[] = []
    const cogsParams: any[] = []

    if (filters.startDate) { cogsConditions.push('S.created_at >= ?'); cogsParams.push(filters.startDate) }
    if (filters.endDate) { cogsConditions.push('S.created_at <= ?'); cogsParams.push(filters.endDate + ' 23:59:59') }
    if (filters.productId) { cogsConditions.push('SI.product_id = ?'); cogsParams.push(filters.productId) }
    if (filters.clientId) { cogsConditions.push('S.client_id = ?'); cogsParams.push(filters.clientId) }

    const cogs_breakdown = db.prepare(`
      SELECT
        S.id as sale_id,
        S.invoice_number,
        SIB.sale_item_id,
        SI.product_id,
        P.name_en as product_name,
        P.name_ar as product_name_ar,
        SIB.stock_entry_id as batch_id,
        SE.purchase_price as batch_purchase_price,
        SIB.quantity_used,
        (SIB.quantity_used * SE.purchase_price) as cost,
        SI.unit_price as selling_price,
        (SIB.quantity_used * SI.unit_price) as revenue,
        SIB.profit
      FROM Sale_Item_Batches SIB
      JOIN Sale_Items SI ON SIB.sale_item_id = SI.id
      JOIN Sales S ON SI.sale_id = S.id
      JOIN Products P ON SI.product_id = P.id
      JOIN Stock_Entries SE ON SIB.stock_entry_id = SE.id
      ${this.buildWhere(cogsConditions)}
      ORDER BY S.created_at ASC, SIB.id ASC
    `).all(...cogsParams) as COGSDetail[]

    const total_cogs = cogs_breakdown.reduce((sum, c) => sum + c.cost, 0)
    const net_profit = cogs_breakdown.reduce((sum, c) => sum + c.profit, 0)

    // === 4. Profit Per Sale — aggregate COGS breakdown by sale ===
    const profitConditions: string[] = []
    const profitParams: any[] = []

    if (filters.startDate) { profitConditions.push('S.created_at >= ?'); profitParams.push(filters.startDate) }
    if (filters.endDate) { profitConditions.push('S.created_at <= ?'); profitParams.push(filters.endDate + ' 23:59:59') }
    if (filters.productId) { profitConditions.push('SI.product_id = ?'); profitParams.push(filters.productId) }
    if (filters.clientId) { profitConditions.push('S.client_id = ?'); profitParams.push(filters.clientId) }

    const profit_per_sale = db.prepare(`
      SELECT
        S.id as sale_id,
        S.invoice_number,
        SUM(SIB.quantity_used * SI.unit_price) as total_revenue,
        SUM(SIB.quantity_used * SE.purchase_price) as total_cogs,
        SUM(SIB.profit) as gross_profit,
        S.created_at
      FROM Sale_Item_Batches SIB
      JOIN Sale_Items SI ON SIB.sale_item_id = SI.id
      JOIN Sales S ON SI.sale_id = S.id
      JOIN Stock_Entries SE ON SIB.stock_entry_id = SE.id
      ${this.buildWhere(profitConditions)}
      GROUP BY S.id
      ORDER BY S.created_at ASC
    `).all(...profitParams) as ProfitPerSale[]

    return {
      total_inputs,
      total_outputs,
      total_cogs,
      net_profit,
      details: {
        inputs,
        outputs,
        cogs_breakdown,
        profit_per_sale
      }
    }
  }
}

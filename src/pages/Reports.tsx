import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, DollarSign, ChevronDown, ChevronUp, Package, Receipt, Layers } from 'lucide-react';

interface FinancialSummary {
  totalExpenses: number;
  totalRevenue: number;
  totalCollected: number;
  netProfit: number;
}

interface DetailedReport {
  total_inputs: number;
  total_outputs: number;
  total_cogs: number;
  net_profit: number;
  details: {
    inputs: any[];
    outputs: any[];
    cogs_breakdown: any[];
    profit_per_sale: any[];
  };
}

export default function Reports() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [summary, setSummary] = useState<FinancialSummary>({
    totalExpenses: 0, totalRevenue: 0, totalCollected: 0, netProfit: 0
  });
  const [detailed, setDetailed] = useState<DetailedReport | null>(null);
  const [dateRange, setDateRange] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  const [activeTab, setActiveTab] = useState<'summary' | 'inputs' | 'outputs' | 'cogs' | 'profit'>('summary');
  const [expandedSale, setExpandedSale] = useState<number | null>(null);

  const getFilters = () => {
    let filters: any = {};
    if (dateRange === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filters.startDate = today;
      filters.endDate = today;
    } else if (dateRange === 'month') {
      const date = new Date();
      filters.startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
      filters.endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
    } else if (dateRange === 'custom') {
      if (customStart) filters.startDate = customStart;
      if (customEnd) filters.endDate = customEnd;
    }
    return filters;
  };

  const fetchData = async () => {
    const filters = getFilters();
    const [summaryData, detailedData] = await Promise.all([
      (window as any).ipcRenderer.invoke('reports:getFinancialSummary', filters),
      (window as any).ipcRenderer.invoke('reports:getDetailedFinancial', filters),
    ]);
    setSummary(summaryData);
    setDetailed(detailedData);
  };

  useEffect(() => { fetchData(); }, [dateRange, customStart, customEnd]);

  const tabs = [
    { id: 'summary' as const, label: t('summary'), icon: <DollarSign className="w-4 h-4" /> },
    { id: 'inputs' as const, label: t('inputs_purchases'), icon: <TrendingDown className="w-4 h-4" /> },
    { id: 'outputs' as const, label: t('outputs_sales'), icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'cogs' as const, label: t('cogs_breakdown'), icon: <Layers className="w-4 h-4" /> },
    { id: 'profit' as const, label: t('profit_per_sale'), icon: <Receipt className="w-4 h-4" /> },
  ];

  const getProductName = (item: any) => {
    return isRTL && item.product_name_ar ? item.product_name_ar : item.product_name;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header + Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t('reports')}</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">{t('reports_subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <select value={dateRange} onChange={e => setDateRange(e.target.value)}
            className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 font-bold text-sm text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
            <option value="all">{t('all_time')}</option>
            <option value="today">{t('today')}</option>
            <option value="month">{t('this_month')}</option>
            <option value="custom">{t('custom_range')}</option>
          </select>
          {dateRange === 'custom' && (
            <div className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-transparent border-none px-2 py-2 font-semibold text-sm text-slate-700 dark:text-slate-300 focus:outline-none" />
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-transparent border-none px-2 py-2 font-semibold text-sm text-slate-700 dark:text-slate-300 focus:outline-none" />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} text-slate-100 dark:text-slate-800/50 group-hover:scale-110 transition-transform`}><TrendingDown size={64} strokeWidth={1} /></div>
          <div className="text-xs font-bold tracking-wider text-slate-500 mb-2 uppercase relative z-10">{t('total_inputs')}</div>
          <div className="text-3xl font-black text-rose-500 tracking-tight relative z-10">{summary.totalExpenses.toFixed(2)} DA</div>
          <div className="text-xs text-slate-400 mt-1 relative z-10">{t('inventory_purchases')}</div>
        </div>
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} text-slate-100 dark:text-slate-800/50 group-hover:scale-110 transition-transform`}><TrendingUp size={64} strokeWidth={1} /></div>
          <div className="text-xs font-bold tracking-wider text-slate-500 mb-2 uppercase relative z-10">{t('total_outputs')}</div>
          <div className="text-3xl font-black text-blue-500 tracking-tight relative z-10">{summary.totalRevenue.toFixed(2)} DA</div>
          <div className="text-xs text-slate-400 mt-1 relative z-10">{t('sales_revenue')}</div>
        </div>
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} text-slate-100 dark:text-slate-800/50 group-hover:scale-110 transition-transform`}><Package size={64} strokeWidth={1} /></div>
          <div className="text-xs font-bold tracking-wider text-slate-500 mb-2 uppercase relative z-10">{t('cogs')}</div>
          <div className="text-3xl font-black text-amber-500 tracking-tight relative z-10">{detailed?.total_cogs?.toFixed(2) || '0.00'} DA</div>
          <div className="text-xs text-slate-400 mt-1 relative z-10">{t('cost_of_goods_sold')}</div>
        </div>
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-700 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden hover:-translate-y-0.5 transition-transform">
          <div className={`absolute -top-2 ${isRTL ? '-left-2' : '-right-2'} opacity-10 text-7xl pointer-events-none`}>💰</div>
          <div className="text-xs font-bold tracking-wider text-blue-100 mb-2 uppercase relative z-10">{t('net_profit')}</div>
          <div className="text-3xl font-black text-white tracking-tight relative z-10">{summary.netProfit.toFixed(2)} DA</div>
          <div className="text-xs text-blue-200 mt-1 relative z-10">{t('revenue_minus_cogs')}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-950 text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Summary */}
        {activeTab === 'summary' && (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t('financial_overview')}</h2>
            <p className="text-slate-500 max-w-md mx-auto mb-8">{t('overview_desc')}</p>
            <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto text-start">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">{t('formula')}</div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('profit_formula')}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">{t('method')}</div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('fifo_batch_costing')}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">{t('total_purchases_count')}</div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{detailed?.details.inputs.length || 0} {t('batches')}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">{t('total_sales_count')}</div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{detailed?.details.profit_per_sale.length || 0} {t('invoices')}</div>
              </div>
            </div>
          </div>
        )}

        {/* Inputs (Purchases) */}
        {activeTab === 'inputs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">{t('batch_no')}</th>
                  <th className="px-6 py-4">{t('product')}</th>
                  <th className="px-6 py-4 text-end">{t('qty')}</th>
                  <th className="px-6 py-4 text-end">{t('unit_price_col')}</th>
                  <th className="px-6 py-4 text-end">{t('total_cost')}</th>
                  <th className="px-6 py-4">{t('date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {detailed?.details.inputs.map((inp: any) => (
                  <tr key={inp.stock_entry_id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-blue-500">B-{inp.stock_entry_id}</td>
                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">{getProductName(inp)}</td>
                    <td className="px-6 py-4 text-end font-bold">{inp.quantity}</td>
                    <td className="px-6 py-4 text-end">{inp.unit_price.toFixed(2)} DA</td>
                    <td className="px-6 py-4 text-end font-bold text-rose-500">{inp.total.toFixed(2)} DA</td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{new Date(inp.created_at).toLocaleDateString(isRTL ? 'ar-DZ' : 'en-GB')}</td>
                  </tr>
                ))}
                {(!detailed?.details.inputs.length) && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">{t('no_purchases_period')}</td></tr>
                )}
              </tbody>
              {detailed && detailed.details.inputs.length > 0 && (
                <tfoot className="bg-slate-50 dark:bg-slate-900/50 border-t-2 border-slate-300 dark:border-slate-700">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 font-black text-slate-700 dark:text-white uppercase text-xs tracking-wider">{t('total_inputs')}</td>
                    <td className="px-6 py-4 text-end font-black text-rose-500 text-lg">{detailed.total_inputs.toFixed(2)} DA</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* Outputs (Sales) */}
        {activeTab === 'outputs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">{t('invoice')}</th>
                  <th className="px-6 py-4">{t('product')}</th>
                  <th className="px-6 py-4 text-end">{t('qty')}</th>
                  <th className="px-6 py-4 text-end">{t('sell_price')}</th>
                  <th className="px-6 py-4 text-end">{t('revenue')}</th>
                  <th className="px-6 py-4">{t('date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {detailed?.details.outputs.map((out: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-blue-500">{out.invoice_number}</td>
                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">{getProductName(out)}</td>
                    <td className="px-6 py-4 text-end font-bold">{out.quantity}</td>
                    <td className="px-6 py-4 text-end">{out.selling_price.toFixed(2)} DA</td>
                    <td className="px-6 py-4 text-end font-bold text-blue-500">{out.total.toFixed(2)} DA</td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{new Date(out.created_at).toLocaleDateString(isRTL ? 'ar-DZ' : 'en-GB')}</td>
                  </tr>
                ))}
                {(!detailed?.details.outputs.length) && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">{t('no_sales_period')}</td></tr>
                )}
              </tbody>
              {detailed && detailed.details.outputs.length > 0 && (
                <tfoot className="bg-slate-50 dark:bg-slate-900/50 border-t-2 border-slate-300 dark:border-slate-700">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 font-black text-slate-700 dark:text-white uppercase text-xs tracking-wider">{t('total_outputs')}</td>
                    <td className="px-6 py-4 text-end font-black text-blue-500 text-lg">{detailed.total_outputs.toFixed(2)} DA</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* COGS Breakdown */}
        {activeTab === 'cogs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">{t('invoice')}</th>
                  <th className="px-6 py-4">{t('product')}</th>
                  <th className="px-6 py-4">{t('batch_source')}</th>
                  <th className="px-6 py-4 text-end">{t('qty_used')}</th>
                  <th className="px-6 py-4 text-end">{t('cost_per_unit')}</th>
                  <th className="px-6 py-4 text-end">{t('total_cost')}</th>
                  <th className="px-6 py-4 text-end">{t('sell_price')}</th>
                  <th className="px-6 py-4 text-end">{t('profit')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {detailed?.details.cogs_breakdown.map((c: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-blue-500">{c.invoice_number}</td>
                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">{getProductName(c)}</td>
                    <td className="px-6 py-4 font-mono text-xs"><span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md font-bold">B-{c.batch_id}</span></td>
                    <td className="px-6 py-4 text-end font-bold">{c.quantity_used}</td>
                    <td className="px-6 py-4 text-end text-rose-500">{c.batch_purchase_price.toFixed(2)} DA</td>
                    <td className="px-6 py-4 text-end font-bold text-rose-500">{c.cost.toFixed(2)} DA</td>
                    <td className="px-6 py-4 text-end text-blue-500">{c.selling_price.toFixed(2)} DA</td>
                    <td className="px-6 py-4 text-end font-bold text-emerald-500">{c.profit.toFixed(2)} DA</td>
                  </tr>
                ))}
                {(!detailed?.details.cogs_breakdown.length) && (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">{t('no_cogs_period')}</td></tr>
                )}
              </tbody>
              {detailed && detailed.details.cogs_breakdown.length > 0 && (
                <tfoot className="bg-slate-50 dark:bg-slate-900/50 border-t-2 border-slate-300 dark:border-slate-700">
                  <tr>
                    <td colSpan={5} className="px-6 py-4 font-black text-slate-700 dark:text-white uppercase text-xs tracking-wider">{t('totals')}</td>
                    <td className="px-6 py-4 text-end font-black text-rose-500">{detailed.total_cogs.toFixed(2)} DA</td>
                    <td></td>
                    <td className="px-6 py-4 text-end font-black text-emerald-500">{detailed.net_profit.toFixed(2)} DA</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* Profit per Sale */}
        {activeTab === 'profit' && (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">{t('invoice')}</th>
                  <th className="px-6 py-4 text-end">{t('revenue')}</th>
                  <th className="px-6 py-4 text-end">{t('cogs')}</th>
                  <th className="px-6 py-4 text-end">{t('gross_profit')}</th>
                  <th className="px-6 py-4 text-end">{t('margin')}</th>
                  <th className="px-6 py-4">{t('date')}</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {detailed?.details.profit_per_sale.map((sale: any) => {
                  const margin = sale.total_revenue > 0 ? ((sale.gross_profit / sale.total_revenue) * 100).toFixed(1) : '0.0';
                  const isExpanded = expandedSale === sale.sale_id;
                  const saleCogs = detailed.details.cogs_breakdown.filter((c: any) => c.sale_id === sale.sale_id);
                  return (
                    <>
                      <tr key={sale.sale_id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer" onClick={() => setExpandedSale(isExpanded ? null : sale.sale_id)}>
                        <td className="px-6 py-4 font-mono text-xs text-blue-500 font-bold">{sale.invoice_number}</td>
                        <td className="px-6 py-4 text-end font-bold text-blue-500">{sale.total_revenue.toFixed(2)} DA</td>
                        <td className="px-6 py-4 text-end text-rose-500">{sale.total_cogs.toFixed(2)} DA</td>
                        <td className="px-6 py-4 text-end font-bold text-emerald-500">{sale.gross_profit.toFixed(2)} DA</td>
                        <td className="px-6 py-4 text-end">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${parseFloat(margin) >= 20 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>{margin}%</span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs">{new Date(sale.created_at).toLocaleDateString(isRTL ? 'ar-DZ' : 'en-GB')}</td>
                        <td className="px-6 py-4 text-slate-400">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</td>
                      </tr>
                      {isExpanded && saleCogs.length > 0 && (
                        <tr key={`${sale.sale_id}-detail`}>
                          <td colSpan={7} className="px-6 py-0 bg-slate-50/80 dark:bg-slate-900/30">
                            <div className={`py-4 ${isRTL ? 'pr-8 border-r-2' : 'pl-8 border-l-2'} border-blue-300 dark:border-blue-800 mb-2`}>
                              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t('fifo_detail')}</div>
                              <div className="space-y-2">
                                {saleCogs.map((c: any, ci: number) => (
                                  <div key={ci} className="flex items-center gap-4 text-xs flex-wrap">
                                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded font-bold">{t('batch_no')}{c.batch_id}</span>
                                    <span className="font-bold text-slate-600 dark:text-slate-300">{getProductName(c)}</span>
                                    <span className="text-slate-500">{c.quantity_used} × {c.batch_purchase_price.toFixed(2)} DA = <span className="font-bold text-rose-500">{c.cost.toFixed(2)} DA</span></span>
                                    <span className="text-slate-400">→</span>
                                    <span className="text-slate-500">@ {c.selling_price.toFixed(2)} DA = <span className="font-bold text-emerald-500">{c.profit.toFixed(2)} DA {t('profit')}</span></span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {(!detailed?.details.profit_per_sale.length) && (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">{t('no_sales_period')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

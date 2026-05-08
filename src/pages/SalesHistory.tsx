import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Receipt, Search, X, Printer, CheckCircle, Clock } from 'lucide-react';
import PrintableInvoice from '../components/PrintableInvoice';

export default function SalesHistory() {
  const { t, i18n } = useTranslation();
  const [sales, setSales] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [saleDetails, setSaleDetails] = useState<any[]>([]);
  const [salePayments, setSalePayments] = useState<any[]>([]);
  
  const [newPayment, setNewPayment] = useState<number>(0);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    const res = await (window as any).ipcRenderer.invoke('sales:get');
    setSales(res || []);
  };

  const loadSaleDetails = async (sale: any) => {
    setSelectedSale(sale);
    const details = await (window as any).ipcRenderer.invoke('sales:getDetails', sale.id);
    const payments = await (window as any).ipcRenderer.invoke('sales:getPayments', sale.id);
    setSaleDetails(details || []);
    setSalePayments(payments || []);
    setNewPayment(0);
  };

  const handleAddPayment = async () => {
    if (!selectedSale || newPayment <= 0) return;
    const remaining = selectedSale.total_amount - selectedSale.paid_amount;
    if (newPayment > remaining) {
      alert("Payment cannot exceed the remaining balance.");
      return;
    }
    
    const res = await (window as any).ipcRenderer.invoke('sales:addPayment', {
      saleId: selectedSale.id,
      amount: newPayment,
      paymentMethod: 'cash'
    });
    
    if (res.success) {
      await fetchSales();
      const updatedSales = await (window as any).ipcRenderer.invoke('sales:get');
      const updatedSale = updatedSales.find((s: any) => s.id === selectedSale.id);
      loadSaleDetails(updatedSale);
    } else {
      alert(`Failed to record payment: ${res.error}`);
    }
  };

  const handlePrint = () => {
    if (!selectedSale) return;
    const originalTitle = document.title;
    document.title = selectedSale.invoice_number;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  const filteredSales = sales.filter(sale => 
    sale.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    (sale.client_name && sale.client_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px]">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3 font-bold text-2xl text-slate-800 dark:text-white">
          <Receipt className="w-8 h-8 text-blue-500" />
          {t('sales_history')}
        </div>
        <div className="relative w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder={t('search_invoice')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-blue-500 transition-colors text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-0">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 border-b border-slate-200 dark:border-slate-800 text-sm text-slate-500 uppercase tracking-widest font-semibold">
            <tr>
              <th className="px-6 py-4">{t('invoice_no')}</th>
              <th className="px-6 py-4">{t('client_name')}</th>
              <th className="px-6 py-4">{t('date_time')}</th>
              <th className="px-6 py-4">{t('total')}</th>
              <th className="px-6 py-4">{t('amount_paid')}</th>
              <th className="px-6 py-4 text-center">{t('status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-slate-400">
                  <Receipt className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  {t('no_sales')}
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr 
                  key={sale.id} 
                  onClick={() => loadSaleDetails(sale)}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-5 font-mono text-blue-600 dark:text-blue-400 font-bold">
                    {sale.invoice_number}
                  </td>
                  <td className="px-6 py-5 font-bold text-slate-700 dark:text-slate-200">
                    {sale.client_name}
                  </td>
                  <td className="px-6 py-5 text-slate-500">
                    {new Date(sale.created_at).toLocaleString('en-GB')}
                  </td>
                  <td className="px-6 py-5 font-black text-slate-900 dark:text-white">
                    {sale.total_amount?.toFixed(2)} DA
                  </td>
                  <td className="px-6 py-5 font-bold text-emerald-600 dark:text-emerald-400">
                    {sale.paid_amount?.toFixed(2)} DA
                  </td>
                  <td className="px-6 py-5 text-center">
                    {sale.status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold uppercase"><CheckCircle className="w-3 h-3"/> {t('paid')}</span>
                    ) : sale.status === 'partial' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-bold uppercase"><Clock className="w-3 h-3"/> {t('partial')}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-full text-xs font-bold uppercase"><X className="w-3 h-3"/> {t('unpaid')}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <Receipt className="text-blue-500 w-6 h-6" />
                  {t('invoice_details')}
                </h2>
                <div className="text-sm font-mono text-slate-500 mt-1">{selectedSale.invoice_number} &bull; {selectedSale.client_name}</div>
              </div>
              <button onClick={() => setSelectedSale(null)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex gap-6 overflow-hidden flex-1">
               {/* Left Column: Items */}
               <div className="flex-1 flex flex-col overflow-y-auto mb-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-1">
                 <table className="w-full text-left text-sm">
                   <thead className="text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                     <tr>
                       <th className="p-4">{t('product')}</th>
                       <th className="p-4 bg-transparent text-center">{t('qty')}</th>
                       <th className="p-4 text-right">{t('subtotal')}</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                     {saleDetails.map(item => (
                       <tr key={item.id}>
                          <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                            {i18n.language === 'ar' ? item.name_ar : item.name_en}
                          </td>
                          <td className="p-4 text-center font-bold">{item.quantity}</td>
                          <td className="p-4 text-right font-bold text-blue-600 dark:text-blue-400">{item.subtotal.toFixed(2)} DA</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>

               {/* Right Column: Calculations & Payments */}
               <div className="w-72 flex flex-col gap-4">
                 {/* Summary Card */}
                 <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2 text-sm">
                    <div className="flex justify-between text-slate-500">
                      <span>{t('total')}:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{selectedSale.total_amount.toFixed(2)} DA</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>{t('amount_paid')}:</span>
                      <span className="font-bold">{selectedSale.paid_amount.toFixed(2)} DA</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 font-black text-rose-500">
                      <span>{t('balance_due')}:</span>
                      <span>{Math.max(0, selectedSale.total_amount - selectedSale.paid_amount).toFixed(2)} DA</span>
                    </div>
                 </div>

                 {/* Payment History List */}
                 {salePayments.length > 0 && (
                   <div className="flex-1 overflow-y-auto pr-2">
                     <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Payment History</h4>
                     <div className="flex flex-col gap-2 relative border-l-2 border-slate-200 dark:border-slate-800 ml-2 pl-4 py-2">
                       {salePayments.map((p: any) => (
                         <div key={p.id} className="text-sm">
                           <div className="font-bold text-emerald-600 dark:text-emerald-400">+{p.amount.toFixed(2)} DA</div>
                           <div className="text-xs text-slate-400 font-mono">{new Date(p.created_at).toLocaleDateString()}</div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* Add Payment Form */}
                 {selectedSale.status !== 'paid' && (
                   <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
                     <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t('add_payment')}</label>
                     <div className="flex gap-2">
                       <input 
                         type="number"
                         min="0"
                         max={selectedSale.total_amount - selectedSale.paid_amount}
                         step="0.01"
                         value={newPayment === 0 ? '' : newPayment}
                         onChange={e => setNewPayment(parseFloat(e.target.value) || 0)}
                         className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-blue-500 font-bold"
                       />
                       <button onClick={handleAddPayment} className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-xl font-bold transition-colors">
                         {t('save')}
                       </button>
                     </div>
                   </div>
                 )}
               </div>
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button onClick={() => setSelectedSale(null)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                 {t('close')}
              </button>
              <button onClick={handlePrint} className="px-6 py-3 font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl shadow-lg transition-colors flex items-center gap-2">
                 <Printer className="w-5 h-5" />
                 {t('print')}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSale && <PrintableInvoice sale={selectedSale} saleDetails={saleDetails} payments={salePayments} />}
    </div>
  );
}

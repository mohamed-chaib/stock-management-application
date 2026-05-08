import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

interface Metrics {
  todaySales: number;
  productsSold: number;
  lowStock: number;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<Metrics>({ todaySales: 0, productsSold: 0, lowStock: 0 });

  useEffect(() => {
    (window as any).ipcRenderer.invoke('dashboard:metrics').then(setMetrics);
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">{t('dashboard')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none text-9xl">💰</div>
          <div className="text-sm font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-3 uppercase">{t('today_sales')}</div>
          <div className="text-5xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
            {metrics.todaySales.toFixed(2)} DA
          </div>
        </div>
        <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none text-9xl">📦</div>
          <div className="text-sm font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-3 uppercase">{t('products_sold')}</div>
          <div className="text-5xl font-black text-slate-800 dark:text-white tracking-tight">
            {metrics.productsSold}
          </div>
        </div>
        <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none text-9xl">⚠️</div>
          <div className="text-sm font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-3 uppercase">{t('low_stock')}</div>
          <div className="text-5xl font-black text-rose-500 tracking-tight">
            {metrics.lowStock}
          </div>
        </div>
      </div>
    </div>
  )
}

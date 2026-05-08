import { useState, useEffect, ReactNode } from 'react'
import { Link, Route, HashRouter as Router, Routes, Navigate } from 'react-router-dom'
import { Monitor, Store, Settings, LogOut, KeyRound, ShoppingCart, Receipt, Users, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from './store'

import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import AppSettings from './pages/Settings'
import POS from './pages/POS'
import Login from './pages/Login'
import SalesHistory from './pages/SalesHistory'
import Clients from './pages/Clients'
import Reports from './pages/Reports'

function LicensePrompt({ onVerified }: { onVerified: () => void }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [machineId, setMachineId] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (window as any).ipcRenderer.invoke('get-machine-id').then(setMachineId);
  }, []);

  const handleActivate = async () => {
    if (!key.trim()) { setError('Please paste your activation key.'); return; }
    setLoading(true);
    setError('');
    const res = await (window as any).ipcRenderer.invoke('activate-license', key);
    setLoading(false);
    if (res.success) { onVerified(); } else { setError(res.message); }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
      <div className="bg-slate-800 p-10 rounded-3xl shadow-2xl max-w-md w-full border border-slate-700">
        <div className="flex justify-center mb-6 text-blue-500">
          <KeyRound className="w-16 h-16" />
        </div>
        <h1 className="text-3xl font-extrabold text-center mb-2">Activation Required</h1>
        <p className="text-xs text-slate-500 text-center mb-6">Send your Machine ID to the vendor to receive your license key.</p>

        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Machine ID</label>
          <div className="flex gap-2">
            <code className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs font-mono text-slate-300 select-all truncate">{machineId}</code>
            <button onClick={handleCopyId} className={`px-4 py-3 rounded-xl font-bold text-xs transition-all ${copied ? 'bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
        </div>

        {error && <div className="bg-red-900/50 border border-red-500/50 text-red-300 p-4 rounded-xl mb-6 text-xs font-medium whitespace-pre-line">{error}</div>}

        <textarea value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste your activation key here..."
          className="w-full h-28 bg-slate-950 border border-slate-700 rounded-2xl p-4 text-xs font-mono mb-6 focus:outline-none focus:border-blue-500 transition-colors resize-none placeholder:text-slate-600" />

        <button onClick={handleActivate} disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-wait text-white py-4 rounded-2xl font-bold transition-all shadow-lg hover:shadow-blue-500/25">
          {loading ? 'Verifying...' : 'Activate License'}
        </button>
      </div>
    </div>
  );
}

// --- Layout Component ---
function Layout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation()
  const currentUser = useStore((state) => state.currentUser)
  const setCurrentUser = useStore((state) => state.setCurrentUser)

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" dir={i18n.dir()}>
      <aside className="w-72 border-e border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shrink-0 flex flex-col">
        <div className="flex items-center justify-center gap-3 mb-12 font-bold text-2xl text-blue-600 dark:text-blue-400 mt-4 tracking-tight">
          <Store className="w-8 h-8" />
          <span>{t('app_title')}</span>
        </div>
        
        <nav className="flex-1 space-y-3">
          <Link to="/" className="flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-semibold">
            <Monitor className="w-5 h-5" />
            {t('dashboard')}
          </Link>
          <Link to="/pos" className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white transition-all font-bold shadow-lg shadow-blue-500/25">
            <ShoppingCart className="w-5 h-5" />
            {t('pos')}
          </Link>
          <Link to="/products" className="flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-semibold">
            <Store className="w-5 h-5" />
            {t('products')}
          </Link>
          <Link to="/clients" className="flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-semibold">
            <Users className="w-5 h-5" />
            {t('clients')}
          </Link>
          <Link to="/sales" className="flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-semibold">
            <Receipt className="w-5 h-5" />
            {t('sales_history')}
          </Link>
          <Link to="/reports" className="flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-semibold">
            <TrendingUp className="w-5 h-5" />
            {t('reports')}
          </Link>
          <Link to="/settings" className="flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-semibold">
            <Settings className="w-5 h-5" />
            {t('settings')}
          </Link>
        </nav>
        
        <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="mb-4 px-5 font-medium text-sm text-slate-500 dark:text-slate-400">
            {currentUser?.username} ({currentUser?.role})
          </div>
          <button 
            onClick={() => setCurrentUser(null)} 
            className="flex items-center justify-center gap-3 w-full px-5 py-4 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all font-bold"
          >
            <LogOut className="w-5 h-5" />
            {t('logout')}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-24 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shrink-0 flex items-center px-10 justify-between sticky top-0 z-10 w-full">
          <div className="font-bold text-xl text-slate-800 dark:text-slate-200">
             {/* Dynamic based on context, but static for now */}
          </div>
          <div className="flex gap-4 items-center">
            <button 
              onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')} 
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors"
            >
              {i18n.language === 'en' ? 'عربي' : 'EN'}
            </button>
            <div className="text-sm px-5 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 font-bold flex items-center gap-2 shadow-sm">
              {t('license_valid')} <span className="text-emerald-500">✔</span>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-10 bg-slate-50 dark:bg-slate-900 scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  )
}

export default function App() {
  const [licensed, setLicensed] = useState<boolean | null>(null);
  const currentUser = useStore((state) => state.currentUser)

  useEffect(() => {
    (window as any).ipcRenderer.invoke('validate-license').then((res: any) => {
      setLicensed(res.valid === true);
    });
  }, []);

  if (licensed === null) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-white font-bold text-lg tracking-widest animate-pulse flex-col gap-4">
      <Store className="w-12 h-12 text-blue-500 animate-bounce" />
      STARTING SYSTEM...
    </div>;
  }

  if (!licensed) {
    return <LicensePrompt onVerified={() => setLicensed(true)} />;
  }

  if (!currentUser) {
    return <Login />
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/products" element={<Products />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/sales" element={<SalesHistory />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<AppSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  )
}

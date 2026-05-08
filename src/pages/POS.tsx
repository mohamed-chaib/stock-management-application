import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, Product } from '../store';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Users, X, Check, AlertTriangle } from 'lucide-react';

export default function POS() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const searchRef = useRef<HTMLInputElement>(null);
  const paidRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('default');
  const [showCheckout, setShowCheckout] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [saleSuccess, setSaleSuccess] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const currentUser = useStore(s => s.currentUser);
  const cart = useStore(s => s.cart);
  const addToCart = useStore(s => s.addToCart);
  const removeFromCart = useStore(s => s.removeFromCart);
  const updateCartQuantity = useStore(s => s.updateCartQuantity);
  const clearCart = useStore(s => s.clearCart);
  const cartTotal = useStore(s => s.cartTotal);

  const total = cartTotal();
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const change = paidAmount > total ? paidAmount - total : 0;
  const balance = Math.max(0, total - paidAmount);

  useEffect(() => {
    fetchProducts();
    fetchClients();
    searchRef.current?.focus();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') { (e.target as HTMLElement).blur(); setSearch(''); }
        return;
      }
      if (e.key === 'F1') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F2' && cart.length > 0) { e.preventDefault(); setPaidAmount(total); setShowCheckout(true); setTimeout(() => paidRef.current?.focus(), 100); }
      if (e.key === 'F4') { e.preventDefault(); clearCart(); }
      if (e.key === 'Escape') { setShowCheckout(false); setSaleSuccess(null); setSearch(''); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart, total]);

  const fetchProducts = () => { (window as any).ipcRenderer.invoke('products:get').then((r: Product[]) => setProducts(r || [])); };
  const fetchClients = () => { (window as any).ipcRenderer.invoke('clients:get').then((r: any) => setClients(r || [])); };

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p => p.name_en.toLowerCase().includes(q) || p.name_ar.includes(search) || p.barcode.includes(search));
  }, [products, search]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredProducts.length === 1) {
      const p = filteredProducts[0];
      if (p.stock_quantity > 0) {
        addToCart(p);
        showToast(isRTL ? p.name_ar : p.name_en);
        setSearch('');
      }
    }
  };

  const showToast = (name: string) => {
    setToast(name);
    setTimeout(() => setToast(null), 1500);
  };

  const handleAddProduct = (product: Product) => {
    if (product.stock_quantity <= 0) return;
    addToCart(product);
    showToast(isRTL ? product.name_ar : product.name_en);
  };

  const handleQuickAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName) return;
    const res = await (window as any).ipcRenderer.invoke('clients:create', { name: newClientName });
    if (res.success) { await fetchClients(); setSelectedClientId(res.id); setShowNewClient(false); setNewClientName(''); }
  };

  const handleProcessSale = async () => {
    if (cart.length === 0) return;
    const res = await (window as any).ipcRenderer.invoke('sales:create', {
      items: cart, userId: currentUser?.id, clientId: selectedClientId, paidAmount, paymentMethod: 'cash'
    });
    if (res.success) {
      setSaleSuccess(res.invoiceNumber);
      clearCart();
      setShowCheckout(false);
      setPaidAmount(0);
      setSelectedClientId('default');
      fetchProducts();
    } else {
      alert(`Error: ${res.error}`);
    }
  };

  const getProductName = useCallback((p: Product) => isRTL ? p.name_ar : p.name_en, [isRTL]);

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ════════ LEFT: PRODUCT GRID ════════ */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-0">
        {/* Search */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 ${isRTL ? 'right-4' : 'left-4'}`} />
            <input ref={searchRef} type="text" placeholder={t('pos_search_placeholder')}
              value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchKeyDown}
              className={`w-full bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl py-4 ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:border-blue-500 transition-colors font-semibold text-lg`} />
            <kbd className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-4' : 'right-4'} text-xs bg-slate-200 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-lg font-mono`}>F1</kbd>
          </div>
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
              <Search className="w-12 h-12 opacity-30" />
              <p className="font-medium">{t('pos_no_results')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {filteredProducts.map(product => {
                const inCart = cart.find(i => i.product.id === product.id);
                const isLow = product.stock_quantity > 0 && product.stock_quantity <= product.min_stock_level;
                const isOut = product.stock_quantity <= 0;
                return (
                  <button key={product.id} onClick={() => handleAddProduct(product)} disabled={isOut}
                    className={`relative p-4 rounded-2xl border-2 text-start flex flex-col transition-all active:scale-[0.97] ${
                      isOut ? 'border-rose-200 dark:border-rose-900/50 opacity-40 cursor-not-allowed bg-rose-50/50 dark:bg-rose-950/30'
                      : inCart ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-md shadow-blue-500/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:shadow-lg bg-white dark:bg-slate-900'
                    }`}>
                    {/* Cart badge */}
                    {inCart && (
                      <div className={`absolute -top-2 ${isRTL ? '-left-2' : '-right-2'} w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-black shadow-lg`}>
                        {inCart.quantity}
                      </div>
                    )}
                    {/* Low stock badge */}
                    {isLow && !isOut && (
                      <div className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'}`}>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      </div>
                    )}
                    <div className="text-sm font-bold mb-1 truncate w-full text-slate-800 dark:text-slate-200">{getProductName(product)}</div>
                    <div className="text-xs text-slate-400 mb-3 font-medium">{product.category}</div>
                    <div className="mt-auto w-full flex justify-between items-end">
                      <div className="text-xl font-black text-blue-600 dark:text-blue-400">{product.selling_price.toFixed(2)}<span className="text-xs font-bold ml-1 text-blue-400">DA</span></div>
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                        isOut ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' : isLow ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>{product.stock_quantity}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Keyboard hints bar */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/50 flex gap-4 text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-900/30">
          <span><kbd className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px] mr-1">F1</kbd>{t('pos_shortcut_search')}</span>
          <span><kbd className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px] mr-1">F2</kbd>{t('pos_shortcut_checkout')}</span>
          <span><kbd className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px] mr-1">F4</kbd>{t('pos_shortcut_clear')}</span>
          <span><kbd className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px] mr-1">Esc</kbd>{t('cancel')}</span>
        </div>
      </div>

      {/* ════════ RIGHT: CART PANEL ════════ */}
      <div className="w-full lg:w-[420px] bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden shrink-0">
        {/* Cart header + client */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 font-bold text-xl"><ShoppingCart className="w-6 h-6 text-blue-500" />{t('cart')}</div>
            {cartCount > 0 && <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{cartCount} {t('pos_items')}</span>}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Users className={`absolute top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 ${isRTL ? 'right-3' : 'left-3'}`} />
              <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}
                className={`w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} focus:outline-none focus:border-blue-500 text-sm font-bold appearance-none`}>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button onClick={() => setShowNewClient(true)} className="p-2.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 gap-3">
              <ShoppingCart className="w-20 h-20" strokeWidth={1} />
              <p className="font-medium text-slate-400">{t('empty_cart')}</p>
            </div>
          ) : cart.map(item => (
            <div key={item.product.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl group hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate text-slate-800 dark:text-slate-200">{getProductName(item.product)}</div>
                <div className="text-xs text-slate-400 mt-0.5">{item.product.selling_price.toFixed(2)} DA × {item.quantity}</div>
              </div>
              {/* Quantity controls */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-0.5">
                <button onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-black">{item.quantity}</span>
                <button onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                  disabled={item.quantity >= item.product.stock_quantity}
                  className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-end w-20">
                <div className="font-black text-sm text-blue-600 dark:text-blue-400">{(item.product.selling_price * item.quantity).toFixed(2)}</div>
                <div className="text-[10px] text-slate-400">DA</div>
              </div>
              <button onClick={() => removeFromCart(item.product.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Bottom: total + actions */}
        <div className="border-t-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-5">
          <div className="flex justify-between items-center mb-5">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t('total')}</span>
            <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{total.toFixed(2)} <span className="text-lg text-slate-400">DA</span></span>
          </div>
          <div className="flex gap-3">
            <button onClick={clearCart} disabled={cart.length === 0}
              className="p-4 rounded-2xl border-2 border-rose-200 dark:border-rose-900 text-rose-500 font-bold hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all disabled:opacity-30 active:scale-95">
              <Trash2 className="w-5 h-5" />
            </button>
            <button onClick={() => { setPaidAmount(total); setShowCheckout(true); setTimeout(() => paidRef.current?.focus(), 100); }}
              disabled={cart.length === 0}
              className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-blue-500/25 disabled:opacity-40 disabled:shadow-none active:scale-[0.98]">
              <CreditCard className="w-6 h-6" />
              {t('pos_complete_sale')}
              <kbd className="bg-white/20 px-2 py-0.5 rounded text-xs font-mono">F2</kbd>
            </button>
          </div>
        </div>
      </div>

      {/* ════════ TOAST ════════ */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2 z-50 animate-bounce">
          <Check className="w-4 h-4" /> {toast} — {t('pos_added_to_cart')}
        </div>
      )}

      {/* ════════ CHECKOUT MODAL ════════ */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black flex items-center gap-3"><CreditCard className="w-7 h-7 text-blue-500" />{t('pos_payment')}</h3>
              <button onClick={() => setShowCheckout(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 rounded-2xl mb-6 border border-blue-100 dark:border-blue-900/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-slate-500">{t('total')}</span>
                <span className="text-3xl font-black text-slate-900 dark:text-white">{total.toFixed(2)} DA</span>
              </div>
            </div>
            {/* Paid amount */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('amount_paid')}</label>
              <div className="flex gap-2">
                <input ref={paidRef} type="number" min="0" step="0.01" value={paidAmount === 0 ? '' : paidAmount}
                  onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
                  onKeyDown={e => { if (e.key === 'Enter') handleProcessSale(); }}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500 font-black text-xl text-end" />
                <button onClick={() => setPaidAmount(total)} className="px-4 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors whitespace-nowrap">
                  {t('pos_pay_full')}
                </button>
              </div>
            </div>
            {/* Change / Balance */}
            <div className="flex gap-3 mb-6">
              {change > 0 && (
                <div className="flex-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                  <div className="text-xs font-bold text-emerald-500 uppercase mb-1">{t('pos_change')}</div>
                  <div className="text-2xl font-black text-emerald-600">{change.toFixed(2)} DA</div>
                </div>
              )}
              {balance > 0 && (
                <div className="flex-1 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl p-4">
                  <div className="text-xs font-bold text-rose-500 uppercase mb-1">{t('balance_due')}</div>
                  <div className="text-2xl font-black text-rose-600">{balance.toFixed(2)} DA</div>
                </div>
              )}
            </div>
            <button onClick={handleProcessSale} disabled={paidAmount < 0}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-400 disabled:to-slate-400 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <Check className="w-6 h-6" /> {t('pos_confirm_sale')}
              <kbd className="bg-white/20 px-2 py-0.5 rounded text-xs font-mono ml-2">Enter</kbd>
            </button>
          </div>
        </div>
      )}

      {/* ════════ SUCCESS MODAL ════════ */}
      {saleSuccess && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 rounded-3xl p-10 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{t('pos_sale_success')}</h3>
            <p className="text-slate-500 font-medium mb-6">{t('pos_invoice_created')}: <span className="font-mono font-black text-blue-600">{saleSuccess}</span></p>
            <button onClick={() => { setSaleSuccess(null); searchRef.current?.focus(); }}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]">
              {t('pos_new_sale')}
            </button>
          </div>
        </div>
      )}

      {/* ════════ NEW CLIENT MODAL ════════ */}
      {showNewClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{t('new_client')}</h3>
              <button onClick={() => setShowNewClient(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleQuickAddClient}>
              <input type="text" autoFocus required placeholder={t('client_name')} value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:border-blue-500 font-bold" />
              <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20">{t('save')}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

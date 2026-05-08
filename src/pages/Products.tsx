import { useState, useEffect, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Product } from '../store';
import { Plus, Edit2, Trash2, Package, X } from 'lucide-react';

export default function Products() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Add Stock Modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockProductId, setStockProductId] = useState('');
  const [stockProductName, setStockProductName] = useState('');
  const [batchQty, setBatchQty] = useState<number>(0);
  const [batchPrice, setBatchPrice] = useState<number>(0);

  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    barcode: '', name_en: '', name_ar: '', category: '', 
    purchase_price: 0, selling_price: 0, stock_quantity: 0, min_stock_level: 5
  });

  const loadProducts = async () => {
    setLoading(true);
    const res = await (window as any).ipcRenderer.invoke('products:get');
    setProducts(res || []);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({ barcode: '', name_en: '', name_ar: '', category: '', purchase_price: 0, selling_price: 0, stock_quantity: 0, min_stock_level: 5 });
    }
    setShowModal(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      const res = await (window as any).ipcRenderer.invoke('products:update', formData);
      if (res.success === false) {
        alert(res.error);
        return;
      }
    } else {
      const res = await (window as any).ipcRenderer.invoke('products:create', formData);
      if (res.success === false) {
        alert(res.error);
        return;
      }
    }
    setShowModal(false);
    loadProducts();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      const res = await (window as any).ipcRenderer.invoke('products:delete', id);
      if (res.success === false) {
        alert(res.error);
        return;
      }
      loadProducts();
    }
  };

  const handleOpenStockModal = (product: Product) => {
    setStockProductId(product.id);
    setStockProductName(product.name_en);
    setBatchQty(0);
    setBatchPrice(product.purchase_price || 0);
    setShowStockModal(true);
  };

  const handleAddStock = async (e: FormEvent) => {
    e.preventDefault();
    if (batchQty <= 0) { alert('Quantity must be greater than 0'); return; }
    if (batchPrice < 0) { alert('Price cannot be negative'); return; }

    const res = await (window as any).ipcRenderer.invoke('inventory:addBatch', {
      productId: stockProductId,
      quantity: batchQty,
      purchasePrice: batchPrice
    });

    if (res.success) {
      setShowStockModal(false);
      loadProducts();
    } else {
      alert(res.error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">{t('products')}</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/25"
        >
          <Plus className="w-5 h-5" />
          {t('add_product')}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="p-4 px-6">{t('barcode')}</th>
                <th className="p-4 px-6">{t('name_en')}</th>
                <th className="p-4 px-6">{t('category')}</th>
                <th className="p-4 px-6">{t('selling_price')}</th>
                <th className="p-4 px-6">{t('stock_quantity')}</th>
                <th className="p-4 px-6 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">{t('no_products')}</td></tr>
              ) : products.map(product => (
                <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="p-4 px-6 font-mono text-xs">{product.barcode}</td>
                  <td className="p-4 px-6 font-bold">{product.name_en}</td>
                  <td className="p-4 px-6">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">{product.category}</span>
                  </td>
                  <td className="p-4 px-6 font-medium text-emerald-600 dark:text-emerald-400">{product.selling_price.toFixed(2)} DA</td>
                  <td className="p-4 px-6">
                    <span className={`font-bold ${product.stock_quantity <= product.min_stock_level ? 'text-rose-500' : ''}`}>
                      {product.stock_quantity}
                    </span>
                  </td>
                  <td className="p-4 px-6 text-right flex justify-end gap-2">
                    <button onClick={() => handleOpenStockModal(product)} className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors" title="Add Stock">
                      <Package className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleOpenModal(product)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">{editingProduct ? t('edit_product') : t('add_product')}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('barcode')}</label>
                  <input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('category')}</label>
                  <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('name_en')}</label>
                  <input type="text" value={formData.name_en} onChange={e => setFormData({...formData, name_en: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('name_ar')}</label>
                  <input type="text" value={formData.name_ar} onChange={e => setFormData({...formData, name_ar: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('purchase_price')}</label>
                  <input type="number" step="0.01" value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value ? parseFloat(e.target.value) : 0})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('selling_price')}</label>
                  <input type="number" step="0.01" value={formData.selling_price} onChange={e => setFormData({...formData, selling_price: e.target.value ? parseFloat(e.target.value) : 0})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3" required />
                </div>
                {/* Only show stock quantity for NEW products */}
                {!editingProduct && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('stock_quantity')}</label>
                    <input type="number" value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value ? parseInt(e.target.value) : 0})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3" required />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">{t('min_stock_level')}</label>
                  <input type="number" value={formData.min_stock_level} onChange={e => setFormData({...formData, min_stock_level: e.target.value ? parseInt(e.target.value) : 0})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3" required />
                </div>
              </div>
              {editingProduct && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300 font-medium">
                  💡 To add stock, close this dialog and use the <Package className="w-4 h-4 inline" /> button in the actions column.
                </div>
              )}
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  {t('cancel')}
                </button>
                <button type="submit" className="px-6 py-3 font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg transition-colors">
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stock Batch Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <Package className="text-emerald-500 w-6 h-6" />
                {t('add_stock_batch')}
              </h2>
              <button onClick={() => setShowStockModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-6 font-medium">{t('adding_inventory_for')}: <span className="font-bold text-slate-700 dark:text-white">{stockProductName}</span></p>
            <form onSubmit={handleAddStock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('quantity')}</label>
                <input type="number" min="1" value={batchQty === 0 ? '' : batchQty} onChange={e => setBatchQty(parseInt(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 font-bold" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('purchase_price_per_unit')}</label>
                <input type="number" step="0.01" min="0" value={batchPrice} onChange={e => setBatchPrice(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 font-bold" required />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowStockModal(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  {t('cancel')}
                </button>
                <button type="submit" className="px-6 py-3 font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg transition-colors">
                  {t('add_batch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

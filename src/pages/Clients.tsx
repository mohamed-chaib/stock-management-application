import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, Edit, Trash2, Search, X } from 'lucide-react';

export default function Clients() {
  const { t } = useTranslation();
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const res = await (window as any).ipcRenderer.invoke('clients:get');
    setClients(res || []);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      await (window as any).ipcRenderer.invoke('clients:update', { ...formData, id: editingClient.id });
    } else {
      await (window as any).ipcRenderer.invoke('clients:create', formData);
    }
    setShowModal(false);
    setFormData({ name: '', phone: '', email: '' });
    setEditingClient(null);
    fetchClients();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this client?')) {
      await (window as any).ipcRenderer.invoke('clients:delete', id);
      fetchClients();
    }
  };

  const openEdit = (client: any) => {
    setEditingClient(client);
    setFormData({ name: client.name, phone: client.phone, email: client.email });
    setShowModal(true);
  };

  const filtered = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3 font-bold text-2xl text-slate-800 dark:text-white">
          <Users className="w-8 h-8 text-blue-500" />
          {t('clients')}
        </div>
        <div className="flex gap-4">
          <div className="relative w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder={t('search_invoice')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>
          <button 
            onClick={() => { setEditingClient(null); setFormData({ name: '', phone: '', email: '' }); setShowModal(true); }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-5 h-5" />
            {t('new_client')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-0">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 border-b border-slate-200 dark:border-slate-800 text-sm text-slate-500 uppercase tracking-widest font-semibold">
            <tr>
              <th className="px-6 py-4">{t('client_name')}</th>
              <th className="px-6 py-4">{t('phone')}</th>
              <th className="px-6 py-4">{t('total_purchases')}</th>
              <th className="px-6 py-4">{t('total_paid')}</th>
              <th className="px-6 py-4">{t('outstanding_debt')}</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-slate-400">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  {t('no_clients')}
                </td>
              </tr>
            ) : (
              filtered.map((client) => {
                const debt = client.total_purchases - client.total_paid;
                return (
                  <tr key={client.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group">
                    <td className="px-6 py-5 font-bold text-slate-800 dark:text-white">
                      {client.name}
                    </td>
                    <td className="px-6 py-5 text-slate-500 font-mono">
                      {client.phone || '-'}
                    </td>
                    <td className="px-6 py-5 text-slate-600 dark:text-slate-300 font-semibold">
                      {client.total_purchases.toFixed(2)} DA
                    </td>
                    <td className="px-6 py-5 text-emerald-600 dark:text-emerald-400 font-semibold">
                      {client.total_paid.toFixed(2)} DA
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${debt > 0 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                        {debt.toFixed(2)} DA
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(client)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors">
                          <Edit className="w-5 h-5" />
                        </button>
                        {client.id !== 'default' && (
                          <button onClick={() => handleDelete(client.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                {editingClient ? <Edit className="text-blue-500 w-6 h-6" /> : <Plus className="text-blue-500 w-6 h-6" />}
                {editingClient ? t('new_client') : t('new_client')}
              </h2>
              <button type="button" onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">{t('client_name')} *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">{t('phone')}</label>
                <input 
                  type="text" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">{t('email')}</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-6 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-4 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-8 py-4 font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-500/25 transition-all">
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

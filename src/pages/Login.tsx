import { useState, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Store } from 'lucide-react';
import { useStore, User } from '../store';

export default function Login() {
  const { t, i18n } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setCurrentUser = useStore((state) => state.setCurrentUser);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Call IPC to try login
    const user: User | null = await (window as any).ipcRenderer.invoke('auth:login', { username, password });
    
    if (user) {
      setCurrentUser(user);
    } else {
      setError(t('login_error'));
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white" dir={i18n.dir()}>
      <div className="bg-slate-800 p-10 rounded-3xl shadow-2xl max-w-sm w-full border border-slate-700">
        <div className="flex justify-center mb-8 text-blue-500">
          <Store className="w-16 h-16" />
        </div>
        <h1 className="text-3xl font-extrabold text-center mb-8">{t('login')}</h1>

        {error && (
          <div className="bg-red-900/50 border border-red-500/50 text-red-300 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">{t('username')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">{t('password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/25 mt-4"
          >
            {t('login_button')}
          </button>
        </form>
      </div>
    </div>
  );
}

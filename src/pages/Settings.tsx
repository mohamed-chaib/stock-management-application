import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, KeyRound, Monitor, Calendar, Shield, User, Copy, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

interface LicenseInfo {
  valid: boolean;
  reason?: string;
  key?: string;
  clientName?: string;
  type?: 'perpetual' | 'yearly' | 'trial';
  machineId?: string;
  expiresAt?: string;
  daysRemaining?: number;
  activatedAt?: string;
}

export default function AppSettings() {
  const { t, i18n } = useTranslation();
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [machineId, setMachineId] = useState('');
  const [copied, setCopied] = useState('');
  const [appVersion] = useState('1.0.0');

  useEffect(() => {
    loadLicenseInfo();
  }, []);

  const loadLicenseInfo = async () => {
    const [info, mid] = await Promise.all([
      (window as any).ipcRenderer.invoke('license:getInfo'),
      (window as any).ipcRenderer.invoke('get-machine-id'),
    ]);
    setLicense(info);
    setMachineId(mid);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'perpetual': return { label: 'Perpetual', labelAr: 'دائم', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' };
      case 'yearly': return { label: 'Yearly', labelAr: 'سنوي', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' };
      case 'trial': return { label: 'Trial (30 days)', labelAr: 'تجريبي (30 يوم)', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' };
      default: return { label: 'Unknown', labelAr: 'غير معروف', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-900' };
    }
  };

  const isRTL = i18n.language === 'ar';
  const typeInfo = getTypeLabel(license?.type);

  return (
    <div className="max-w-4xl mx-auto space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
          <Settings className="w-10 h-10 text-blue-500" />
          {t('settings')}
        </h1>
        <p className="text-slate-500 font-medium">v{appVersion}</p>
      </div>

      {/* License Status Card */}
      <div className={`rounded-3xl border-2 p-8 shadow-sm ${
        license?.valid 
          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20' 
          : 'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20'
      }`}>
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              license?.valid ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-rose-100 dark:bg-rose-900/50'
            }`}>
              {license?.valid 
                ? <Shield className="w-7 h-7 text-emerald-600 dark:text-emerald-400" /> 
                : <AlertTriangle className="w-7 h-7 text-rose-600 dark:text-rose-400" />
              }
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {license?.valid 
                  ? (isRTL ? 'الترخيص مفعّل' : 'License Active') 
                  : (isRTL ? 'الترخيص غير صالح' : 'License Invalid')
                }
              </h2>
              {!license?.valid && (
                <p className="text-sm text-rose-500 font-medium mt-1">{license?.reason}</p>
              )}
            </div>
          </div>
          {license?.valid && (
            <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider ${typeInfo.bg} ${typeInfo.color}`}>
              {isRTL ? typeInfo.labelAr : typeInfo.label}
            </span>
          )}
        </div>

        {license?.valid && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* License Key */}
            <div className="bg-white dark:bg-slate-950 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                <KeyRound className="w-3.5 h-3.5" />
                {isRTL ? 'مفتاح الترخيص' : 'License Key'}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{license.key}</span>
                <button onClick={() => copyToClipboard(license.key || '', 'key')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  {copied === 'key' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </div>

            {/* Client Name */}
            <div className="bg-white dark:bg-slate-950 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                <User className="w-3.5 h-3.5" />
                {isRTL ? 'اسم العميل' : 'Client Name'}
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{license.clientName}</span>
            </div>

            {/* Activation Date */}
            {license.activatedAt && (
              <div className="bg-white dark:bg-slate-950 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {isRTL ? 'تاريخ التفعيل' : 'Activated On'}
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {new Date(license.activatedAt).toLocaleDateString(isRTL ? 'ar-DZ' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            )}

            {/* Expiry / Days Remaining */}
            {license.expiresAt ? (
              <div className="bg-white dark:bg-slate-950 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  {isRTL ? 'تاريخ الانتهاء' : 'Expires On'}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {new Date(license.expiresAt).toLocaleDateString(isRTL ? 'ar-DZ' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                  {license.daysRemaining !== undefined && (
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                      license.daysRemaining > 30 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : license.daysRemaining > 7 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                    }`}>
                      {license.daysRemaining} {isRTL ? 'يوم' : 'days'}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-950 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  {isRTL ? 'الصلاحية' : 'Validity'}
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  ∞ {isRTL ? 'لا تنتهي (دائم)' : 'Never expires (Perpetual)'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Machine Info */}
      <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Monitor className="w-5 h-5 text-blue-500" />
          {isRTL ? 'معلومات الجهاز' : 'Machine Information'}
        </h3>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {isRTL ? 'معرّف الجهاز (البصمة)' : 'Hardware Fingerprint'}
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-slate-600 dark:text-slate-400 break-all select-all">{machineId}</code>
            <button onClick={() => copyToClipboard(machineId, 'machine')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0">
              {copied === 'machine' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Language Switcher */}
      <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          {isRTL ? 'اللغة' : 'Language'}
        </h3>
        <div className="flex gap-3">
          <button onClick={() => i18n.changeLanguage('en')}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${i18n.language === 'en' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
            English
          </button>
          <button onClick={() => i18n.changeLanguage('ar')}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${i18n.language === 'ar' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
            العربية
          </button>
        </div>
      </div>
    </div>
  );
}

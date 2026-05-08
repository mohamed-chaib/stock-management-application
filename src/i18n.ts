import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enJSON from './locales/en.json';
import arJSON from './locales/ar.json';

// Ensure the HTML dir attribute matches the initial language
const initLang: string = 'en';
document.documentElement.dir = initLang === 'ar' ? 'rtl' : 'ltr';
document.documentElement.lang = initLang;

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: enJSON,
      ar: arJSON
    },
    lng: initLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

export default i18n;

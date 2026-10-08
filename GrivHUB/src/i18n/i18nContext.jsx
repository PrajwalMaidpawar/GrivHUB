import React, { createContext, useContext, useState } from 'react';
import { translations } from './translations.js';

const I18nContext = createContext(undefined);

export const I18nProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('grievancehub_lang');
      return (saved === 'hi' || saved === 'mr' || saved === 'en') ? saved : 'en';
    } catch (e) {
      return 'en';
    }
  });

  const setLanguage = (lang) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('grievancehub_lang', lang);
    } catch (e) {
      console.warn('Failed to save language to storage:', e);
    }
  };

  const t = (key, replacements) => {
    const currentLangDict = translations[language] || translations.en;
    let text = currentLangDict[key] || translations.en[key] || String(key);
    
    if (replacements) {
      Object.entries(replacements).forEach(([k, val]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(val));
      });
    }
    
    return text;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

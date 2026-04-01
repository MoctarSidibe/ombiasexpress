import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, resolveKey } from '../i18n/translations';

const STORAGE_KEY = 'appLanguage';
const DEFAULT_LANG = 'fr';

// ── Context ───────────────────────────────────────────────────────────────────

const LanguageContext = createContext({
    language:      DEFAULT_LANG,
    setLanguage:   () => {},
    t:             (key, fallback) => fallback || key,
    isReady:       false,
});

// ── Provider ──────────────────────────────────────────────────────────────────

export const LanguageProvider = ({ children }) => {
    const [language, setLangState] = useState(DEFAULT_LANG);
    const [isReady,  setIsReady]   = useState(false);

    // Load persisted language on mount
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then(saved => {
            if (saved === 'fr' || saved === 'en') setLangState(saved);
            setIsReady(true);
        }).catch(() => setIsReady(true));
    }, []);

    // Persist + update state
    const setLanguage = useCallback((lang) => {
        if (lang !== 'fr' && lang !== 'en') return;
        setLangState(lang);
        AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
    }, []);

    // Translation function: t('profile.menu.logout') → string in current language
    // Falls back to the other language, then the key itself
    const t = useCallback((key, fallback) => {
        const dict = translations[language];
        const result = resolveKey(dict, key);
        if (result !== undefined && typeof result === 'string') return result;
        // fallback to other language
        const otherLang = language === 'fr' ? 'en' : 'fr';
        const other = resolveKey(translations[otherLang], key);
        if (other !== undefined && typeof other === 'string') return other;
        return fallback !== undefined ? fallback : key;
    }, [language]);

    // Array variant: ta('onboarding.slides.rides.features') → string[]
    const ta = useCallback((key) => {
        const dict = translations[language];
        const result = resolveKey(dict, key);
        if (Array.isArray(result)) return result;
        const otherLang = language === 'fr' ? 'en' : 'fr';
        const other = resolveKey(translations[otherLang], key);
        if (Array.isArray(other)) return other;
        return [];
    }, [language]);

    // Object variant: to('hub.services_list.rider') → { label, sub }
    const to = useCallback((key) => {
        const dict = translations[language];
        const result = resolveKey(dict, key);
        if (result && typeof result === 'object' && !Array.isArray(result)) return result;
        const otherLang = language === 'fr' ? 'en' : 'fr';
        const other = resolveKey(translations[otherLang], key);
        if (other && typeof other === 'object' && !Array.isArray(other)) return other;
        return {};
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, ta, to, isReady }}>
            {children}
        </LanguageContext.Provider>
    );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useLanguage = () => useContext(LanguageContext);

export default LanguageContext;

import { useTranslation as useI18nTranslation } from 'react-i18next'
import { useCallback } from 'react'

export function useTranslation() {
  const { t, i18n } = useI18nTranslation()

  const changeLanguage = useCallback((language: string) => {
    i18n.changeLanguage(language)
  }, [i18n])

  const getCurrentLanguage = useCallback(() => {
    return i18n.language
  }, [i18n])

  const isLanguageLoaded = useCallback((language: string) => {
    return i18n.hasResourceBundle(language, 'translation')
  }, [i18n])

  return {
    t,
    i18n,
    changeLanguage,
    getCurrentLanguage,
    isLanguageLoaded,
    currentLanguage: i18n.language,
    isReady: i18n.isInitialized
  }
} 
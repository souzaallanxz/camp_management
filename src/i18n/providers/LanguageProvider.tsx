import React, { createContext, useContext, useEffect, useState } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { getCurrentUserProfile } from '@/features/auth/auth-service'

interface LanguageContextType {
  currentLanguage: string
  changeLanguage: (language: string) => Promise<void>
  isLoading: boolean
  availableLanguages: Array<{ code: string; name: string }>
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const availableLanguages = [
  { code: 'pt', name: 'Português' },
  { code: 'en', name: 'English' }
]

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { changeLanguage, currentLanguage, isReady } = useTranslation()
  const [isLoading, setIsLoading] = useState(true)

  // Function to load user language preference
  const loadUserLanguage = async () => {
    try {
      const profile = await getCurrentUserProfile()
      if (profile?.user?.language) {
        changeLanguage(profile.user.language)
      } else {
        // Fallback to browser language or default
        const browserLang = navigator.language.split('-')[0]
        const defaultLang = availableLanguages.find(lang => lang.code === browserLang)?.code || 'pt'
        changeLanguage(defaultLang)
      }
    } catch {
      // Fallback to Portuguese
      changeLanguage('pt')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isReady) {
      loadUserLanguage()
    }
  }, [isReady, changeLanguage])

  // Listen for storage changes (when user updates profile)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'i18nextLng') {
        // Language was changed, reload user preference
        loadUserLanguage()
      }
    }

    // Also listen for custom language change events
    const handleLanguageChange = () => {
      loadUserLanguage()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('languageChanged', handleLanguageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('languageChanged', handleLanguageChange)
    }
  }, [])

  const handleLanguageChange = async (language: string) => {
    try {
      setIsLoading(true)
      
      // Change language in i18next
      changeLanguage(language)
      
      // Just change the language in i18next, don't update profile here
      // Profile updates should be handled by the profile form
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language } }))
      
    } catch {
      // Still change the language even if profile update fails
      changeLanguage(language)
    } finally {
      setIsLoading(false)
    }
  }

  const value: LanguageContextType = {
    currentLanguage,
    changeLanguage: handleLanguageChange,
    isLoading,
    availableLanguages
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
} 
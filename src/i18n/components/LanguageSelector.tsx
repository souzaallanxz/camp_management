import React from 'react'
import { useTranslation } from '../hooks/useTranslation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'

interface LanguageSelectorProps {
  variant?: 'select' | 'button'
  className?: string
  onLanguageChange?: (language: string) => void
  currentLanguage?: string
}

const availableLanguages = [
  { code: 'pt', name: 'Português' },
  { code: 'en', name: 'English' }
]

export function LanguageSelector({ 
  variant = 'select', 
  className,
  onLanguageChange,
  currentLanguage = 'pt'
}: LanguageSelectorProps) {
  const { t } = useTranslation()

  const handleLanguageChange = async (language: string) => {
    if (onLanguageChange) {
      onLanguageChange(language)
    }
  }

  if (variant === 'button') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {availableLanguages.map((lang) => (
          <Button
            key={lang.code}
            variant={currentLanguage === lang.code ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleLanguageChange(lang.code)}
            className="flex items-center gap-2"
          >
            <Globe className="h-4 w-4" />
            {lang.name}
          </Button>
        ))}
      </div>
    )
  }

  return (
    <Select
      value={currentLanguage}
      onValueChange={handleLanguageChange}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={t('settings.language')} />
      </SelectTrigger>
      <SelectContent>
        {availableLanguages.map((language) => (
          <SelectItem key={language.code} value={language.code}>
            {language.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
} 
import React from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { LanguageSelector } from '../components/LanguageSelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function TranslationExample() {
  const { t, currentLanguage } = useTranslation()

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.title')}</CardTitle>
          <CardDescription>
            {t('profile.personalInfo')} - {t('common.currentLanguage')}: {currentLanguage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">{t('profile.language')}</h3>
            <LanguageSelector variant="button" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{t('common.examples')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">{t('navigation.dashboard')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.overview')} - {t('dashboard.stats')}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">{t('navigation.campers')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('campers.title')} - {t('campers.addCamper')}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">{t('navigation.camps')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('camps.title')} - {t('camps.addCamp')}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">{t('navigation.registrations')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('registrations.title')} - {t('registrations.addRegistration')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{t('common.actions')}</h3>
            <div className="flex gap-2 flex-wrap">
              <Button variant="default">{t('common.save')}</Button>
              <Button variant="outline">{t('common.cancel')}</Button>
              <Button variant="outline">{t('common.edit')}</Button>
              <Button variant="destructive">{t('common.delete')}</Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{t('common.status')}</h3>
            <div className="flex gap-2 flex-wrap">
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                {t('camps.active')}
              </span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                {t('registrations.pending')}
              </span>
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                {t('registrations.cancelled')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 
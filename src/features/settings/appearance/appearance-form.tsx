import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { useState } from 'react'
import { useTranslation } from '@/i18n'

const themes = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' },
] as const

export function AppearanceForm() {
  const { t } = useTranslation()
  const [isSaving, setIsSaving] = useState(false)

  const appearanceFormSchema = z.object({
    theme: z.enum(['light', 'dark', 'system'], {
      required_error: t('validation.required'),
    }),
  })

  type AppearanceFormValues = z.infer<typeof appearanceFormSchema>

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      theme: 'system',
    },
  })

  async function onSubmit() {
    setIsSaving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: t('common.success'),
        description: t('settings.settingsSaved'),
        duration: 3000,
      })
    } catch {
      toast({
        title: t('common.error'),
        description: t('settings.errorSavingSettings'),
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="theme"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.theme')}</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={isSaving}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('settings.theme')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {themes.map((theme) => (
                    <SelectItem key={theme.value} value={theme.value}>
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />



        <Button type="submit" disabled={isSaving}>
          {isSaving ? t('common.loading') : t('settings.saveSettings')}
        </Button>
      </form>
    </Form>
  )
}

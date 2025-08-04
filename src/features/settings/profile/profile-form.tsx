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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { useState, useEffect } from 'react'
import { getCurrentUserProfile, updateCurrentUserProfile } from '@/features/auth/auth-service'
import { useTranslation } from '@/i18n'
import { useLanguage } from '@/i18n'

const languages = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'English' },
] as const

export function ProfileForm() {
  const { t } = useTranslation()
  const { changeLanguage } = useLanguage()
  
  const profileFormSchema = z.object({
    firstName: z.string().min(1, {
      message: t('profile.firstNameRequired'),
    }),
    lastName: z.string().min(1, {
      message: t('profile.lastNameRequired'),
    }),
    email: z.string().email({
      message: t('profile.invalidEmail'),
    }),
    language: z.enum(['pt', 'en'], {
      required_error: t('profile.languageRequired'),
    }),
  })

  type ProfileFormValues = z.infer<typeof profileFormSchema>

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      language: 'pt',
    },
  })

  useEffect(() => {
    async function loadUserData() {
      try {
        const profileData = await getCurrentUserProfile()
        
        if (profileData && profileData.user) {
          const user = profileData.user
          
          // Parse the full name into first and last name
          const fullName = user.name || ''
          let firstName = ''
          let lastName = ''
          
          if (fullName.trim()) {
            const nameParts = fullName.trim().split(' ')
            firstName = nameParts[0] || ''
            lastName = nameParts.slice(1).join(' ') || ''
          }
          
          form.reset({
            firstName,
            lastName,
            email: user.email || '',
            language: user.language || 'pt',
          })
        }
      } catch {
        toast({
          title: t('common.error'),
          description: t('errors.general'),
          variant: 'destructive',
          duration: 3000,
        })
      } finally {
        setIsLoading(false)
      }
    }

    // Only load data if form is empty (initial load)
    const currentValues = form.getValues()
    if (!currentValues.firstName && !currentValues.email) {
      loadUserData()
    } else {
      setIsLoading(false)
    }
  }, [form]) // Removed 't' from dependencies to prevent re-loading when language changes

  async function onSubmit(data: ProfileFormValues) {
    setIsSaving(true)
    try {
      await updateCurrentUserProfile({
        firstName: data.firstName,
        lastName: data.lastName,
        language: data.language
      })

      // Update the language in the app immediately
      await changeLanguage(data.language)

      // Update form values to reflect the saved data
      form.setValue('firstName', data.firstName)
      form.setValue('lastName', data.lastName)
      form.setValue('language', data.language)

      toast({
        title: t('profile.changesSaved'),
        description: t('profile.changesSaved'),
        duration: 3000,
      })
    } catch {
      toast({
        title: t('common.error'),
        description: t('profile.errorSaving'),
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
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('profile.firstName')}</FormLabel>
              <FormControl>
                <Input 
                  placeholder={t('profile.firstName')}
                  {...field} 
                  disabled={isLoading || isSaving} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('profile.lastName')}</FormLabel>
              <FormControl>
                <Input 
                  placeholder={t('profile.lastName')}
                  {...field} 
                  disabled={isLoading || isSaving} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('profile.email')}</FormLabel>
              <FormControl>
                <Input {...field} disabled type="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('profile.language')}</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={isLoading || isSaving}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('profile.language')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {languages.map((language) => (
                    <SelectItem key={language.value} value={language.value}>
                      {language.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading || isSaving}>
          {isSaving ? t('profile.saving') : t('profile.saveChanges')}
        </Button>
      </form>
    </Form>
  )
}

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

const languages = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'English' },
] as const

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: 'O nome deve ter pelo menos 2 caracteres.',
  }),
  email: z.string().email({
    message: 'Email inválido.',
  }),
  language: z.enum(['pt', 'en'], {
    required_error: 'Por favor selecione um idioma.',
  }),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export function ProfileForm() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
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
          form.reset({
            name: user.name || '',
            email: user.email || '',
            language: 'pt', // Default language since it's not stored in the DB yet
          })
        }
      } catch (error: Error | unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        toast({
          title: 'Erro',
          description: `Não foi possível carregar os dados do usuário: ${errorMessage}`,
          variant: 'destructive',
          duration: 3000,
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [form])

  async function onSubmit(data: ProfileFormValues) {
    setIsSaving(true)
    try {
      await updateCurrentUserProfile({
        name: data.name,
        language: data.language
      })

      toast({
        title: 'Perfil atualizado',
        description: 'As suas informações foram atualizadas com sucesso.',
        duration: 3000,
      })
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast({
        title: 'Erro',
        description: `Ocorreu um erro ao atualizar o perfil: ${errorMessage}`,
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input 
                  placeholder="O seu nome" 
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
              <FormLabel>Email</FormLabel>
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
              <FormLabel>Idioma</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={isLoading || isSaving}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um idioma" />
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
          {isSaving ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </form>
    </Form>
  )
}

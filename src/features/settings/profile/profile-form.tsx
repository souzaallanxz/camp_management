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
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: 'O nome deve ter pelo menos 2 caracteres.',
  }),
  email: z.string().email({
    message: 'Email inválido.',
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
    },
  })

  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          form.reset({
            name: user.user_metadata?.name || '',
            email: user.email || '',
          })
        }
      } catch {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados do usuário.',
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
      const { error: updateError } = await supabase.auth.updateUser({
        data: { name: data.name }
      })

      if (updateError) throw updateError

      toast({
        title: 'Perfil atualizado',
        description: 'As suas informações foram atualizadas com sucesso.',
        duration: 3000,
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao atualizar o perfil.',
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

        <Button type="submit" disabled={isLoading || isSaving}>
          {isSaving ? 'A guardar...' : 'Atualizar perfil'}
        </Button>
      </form>
    </Form>
  )
}

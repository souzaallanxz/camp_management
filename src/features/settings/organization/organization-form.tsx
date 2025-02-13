"use client";

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useCurrentTeam } from '@/features/teams/hooks/use-current-team'
import { teamService } from '@/features/teams/services/team-service'
import { supabaseStorage } from '@/lib/supabase-storage'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'O nome deve ter pelo menos 2 caracteres.',
  }),
  logo_url: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function OrganizationForm() {
  const { data: team, mutate } = useCurrentTeam()
  const [isUploading, setIsUploading] = useState(false)
  const [updateKey, setUpdateKey] = useState(0)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: team?.name || '',
      logo_url: team?.logo_url || '',
    },
  })

  async function onSubmit(data: FormValues) {
    if (!team) {
      toast.error('Organização não encontrada', {
        description: 'Por favor, tente novamente.',
      })
      return
    }

    try {
      await teamService.updateTeam(team.id, data)
      await mutate()
      setUpdateKey(prev => prev + 1)
      toast.success('Configurações atualizadas', {
        description: 'As alterações foram salvas com sucesso.',
      })
    } catch (error) {
      toast.error('Falha ao atualizar configurações', {
        description: error instanceof Error ? error.message : 'Por favor, tente novamente.',
      })
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const publicUrl = await supabaseStorage.uploadFile(file)
      
      if (team) {
        await teamService.updateTeam(team.id, { logo_url: publicUrl })
        form.setValue('logo_url', publicUrl)
        await mutate()
        setUpdateKey(prev => prev + 1)
        toast.success('Logo atualizado com sucesso', {
          description: 'O logo da sua organização foi atualizado.',
        })
      }
    } catch (error) {
      toast.error('Falha ao atualizar o logo', {
        description: error instanceof Error ? error.message : 'Por favor, tente novamente.',
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Add effect to update form when team data changes
  useEffect(() => {
    if (team) {
      form.reset({
        name: team.name,
        logo_url: team.logo_url || '',
      })
    }
  }, [team, form])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="logo_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo da Organização</FormLabel>
              <FormControl>
                <div className="flex flex-col gap-4">
                  <Avatar className="h-24 w-24" key={`avatar-${updateKey}-${field.value}`}>
                    <AvatarImage src={field.value || ''} alt={team?.name} />
                    <AvatarFallback>{team?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </div>
              </FormControl>
              <FormDescription>
                Faça upload de uma imagem para representar sua organização.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Organização</FormLabel>
              <FormControl>
                <Input placeholder="Acme Inc." {...field} />
              </FormControl>
              <FormDescription>
                Este é o nome que será exibido em todos os lugares.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isUploading}>Salvar alterações</Button>
      </form>
    </Form>
  )
} 
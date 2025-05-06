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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useQuery } from '@tanstack/react-query'
import { settingsService } from '@/features/settings/services/settings-service'

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'O nome deve ter pelo menos 2 caracteres.',
  }),
  logo_url: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function OrganizationForm() {
  const { data: currentTeam, mutate: mutateCurrentTeam } = useCurrentTeam()
  
  // Add a query to get organization settings
  const { 
    data: organizationData, 
    isLoading,
    isError,
    refetch 
  } = useQuery({
    queryKey: ['organizationSettings'],
    queryFn: () => settingsService.getOrganization(),
    retry: 1,
    refetchOnWindowFocus: false,
  })
  
  const team = organizationData || currentTeam
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
      await teamService.updateTeam(team.id, {
        name: data.name,
        logo_url: data.logo_url,
      })

      toast.success('Organização atualizada com sucesso')
      mutateCurrentTeam()
      refetch()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Erro ao atualizar organização: ${errorMessage}`)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      // Convert file to base64
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = async () => {
        const base64String = reader.result as string

        // Update team logo_url with base64 string
        if (team) {
          await teamService.updateTeam(team.id, {
            logo_url: base64String,
          })
          form.setValue('logo_url', base64String)
          setUpdateKey(prev => prev + 1)
          toast.success('Logo atualizada com sucesso')
          mutateCurrentTeam()
          refetch()
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Erro ao fazer upload da imagem: ${errorMessage}`)
    } finally {
      setIsUploading(false)
    }
  }

  useEffect(() => {
    if (team) {
      form.reset({
        name: team.name,
        logo_url: team.logo_url || '',
      })
    }
  }, [team, form])

  if (isLoading) {
    return <div>Carregando...</div>
  }

  if (isError) {
    return <div>Erro ao carregar configurações da organização</div>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="logo_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo</FormLabel>
              <FormControl>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={field.value} key={updateKey} />
                    <AvatarFallback>
                      {team?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
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
                Faça upload de uma imagem para usar como logo da sua organização.
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
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Nome da organização" {...field} />
              </FormControl>
              <FormDescription>
                Este é o nome público da sua organização.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Salvar alterações</Button>
      </form>
    </Form>
  )
} 
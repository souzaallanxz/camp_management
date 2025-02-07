"use client";

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTeamData } from '@/features/teams/hooks/use-team-data'
import { teamService } from '@/features/teams/services/team-service'
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
import { toast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Building2 } from 'lucide-react'
import { supabaseStorage } from '@/lib/supabase-storage'

interface Team {
  id: string
  name: string
  logo_url?: string | null
}

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'O nome da organização deve ter pelo menos 2 caracteres.',
  }),
  logo_url: z.string().nullable(),
})

type FormValues = z.infer<typeof formSchema>

export default function OrganizationForm() {
  const { teams, mutate } = useTeamData()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const currentTeam = teams[0] as Team

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: currentTeam?.name || '',
      logo_url: currentTeam?.logo_url || null,
    },
  })

  // Update form when team data changes
  useEffect(() => {
    if (currentTeam) {
      form.reset({
        name: currentTeam.name,
        logo_url: currentTeam.logo_url || null,
      })
    }
  }, [currentTeam, form])

  async function onSubmit(data: FormValues) {
    if (!currentTeam?.id) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nenhuma organização encontrada.',
      })
      return
    }

    try {
      setIsLoading(true)

      if (selectedFile) {
        try {
          // Upload the new image
          const newLogoUrl = await supabaseStorage.uploadFile(selectedFile)
          data.logo_url = newLogoUrl

          // If there was a previous logo, delete it
          if (currentTeam.logo_url) {
            const oldLogoPath = currentTeam.logo_url.split('/').pop()
            if (oldLogoPath) {
              await supabaseStorage.deleteFile(oldLogoPath)
            }
          }
        } catch {
          toast({
            variant: 'destructive',
            title: 'Erro no Upload',
            description: 'Não foi possível fazer o upload da imagem.',
          })
          return
        }
      }

      await teamService.updateTeam(currentTeam.id, data)
      await mutate() // Recarrega os dados do time
      setSelectedFile(null)
      
      toast({
        title: 'Sucesso',
        description: 'Organização atualizada com sucesso.',
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao atualizar organização.',
      })
    } finally {
      setIsLoading(false)
    }
  }

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
                <div className="flex flex-col gap-6">
                  <Avatar className="h-24 w-24 rounded-lg">
                    <AvatarImage 
                      src={selectedFile ? URL.createObjectURL(selectedFile) : field.value || undefined} 
                      alt="Logo" 
                      className="object-cover" 
                    />
                    <AvatarFallback className="rounded-lg bg-muted">
                      <Building2 className="h-12 w-12" />
                    </AvatarFallback>
                  </Avatar>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full cursor-pointer file:cursor-pointer"
                  />
                  <FormDescription>
                    Faça upload do logo da sua organização. Recomendamos uma imagem quadrada de pelo menos 128x128px.
                  </FormDescription>
                </div>
              </FormControl>
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
                <Input placeholder="Digite o nome da organização" {...field} />
              </FormControl>
              <FormDescription>
                Este é o nome que será exibido para todos os membros da sua organização.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'A guardar...' : 'Guardar'}
        </Button>
      </form>
    </Form>
  )
} 
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

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'O nome da organização deve ter pelo menos 2 caracteres.',
  }),
})

type FormValues = z.infer<typeof formSchema>

export default function OrganizationSettings() {
  const { teams, mutate } = useTeamData()
  const [isLoading, setIsLoading] = useState(false)
  const currentTeam = teams[0] // Assuming we're working with the first team for now

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: currentTeam?.name || '',
    },
  })

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
      await teamService.updateTeam(currentTeam.id, { name: data.name })
      await mutate()
      toast({
        title: 'Sucesso',
        description: 'Nome da organização atualizado com sucesso.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar o nome da organização.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Reset form when team data changes
  useEffect(() => {
    if (currentTeam?.name) {
      form.reset({ name: currentTeam.name })
    }
  }, [currentTeam?.name, form])

  if (!currentTeam) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Organização</h3>
          <p className="text-sm text-muted-foreground">
            Nenhuma organização encontrada.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Organização</h3>
        <p className="text-sm text-muted-foreground">
          Gerir as definições da sua organização.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Organização</FormLabel>
                <FormControl>
                  <Input placeholder="Nome da organização" {...field} />
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
    </div>
  )
} 
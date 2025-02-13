"use client";

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

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

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'O nome deve ter pelo menos 2 caracteres.',
  }),
})

type FormValues = z.infer<typeof formSchema>

export function OrganizationForm() {
  const { data: team, mutate } = useCurrentTeam()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: team?.name || '',
    },
  })

  async function onSubmit(data: FormValues) {
    if (!team) {
      toast('No team found. Please try again.', {
        description: 'Please try again.',
      })
      return
    }

    try {
      await teamService.updateTeam(team.id, data)
      await mutate()
      toast('Organization settings updated.', {
        description: 'Your changes have been saved.',
      })
    } catch (error) {
      toast('Failed to update organization settings.', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
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
        <Button type="submit">Salvar alterações</Button>
      </form>
    </Form>
  )
} 
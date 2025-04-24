import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { createFileRoute } from '@tanstack/react-router'

import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { CamperCombobox } from '@/features/campers/components/camper-combobox'
import { snackBarService } from '@/features/snack-bar/services/snack-bar-service'
import { snackBarTransactionSchema } from '@/features/snack-bar/data/schema'
import type { SnackBarTransaction } from '@/features/snack-bar/data/schema'
import { TransactionsTable } from '@/features/snack-bar/components/transactions-table'
import { TransactionsCharts } from '@/features/snack-bar/components/transactions-charts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { IconCoinEuro, IconCashOff } from '@tabler/icons-react'
import { useTeamPermissions } from '@/features/teams/hooks/use-team-permissions'
import { TierUpgradeDialog } from '@/features/teams/components/tier-upgrade-dialog'

export default function SnackBarPage() {
  const navigate = useNavigate()
  const permissions = useTeamPermissions()
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [selectedCamperId, setSelectedCamperId] = useState<string>('')
  const queryClient = useQueryClient()

  const form = useForm<SnackBarTransaction>({
    resolver: zodResolver(snackBarTransactionSchema),
    defaultValues: {
      amount: 0,
      camper_id: '',
    },
  })

  const { data: currentCamp, isLoading } = useQuery({
    queryKey: ['current-camp'],
    queryFn: () => snackBarService.getCurrentCamp(),
  })

  const { data: balance = 0 } = useQuery({
    queryKey: ['camper-balance', selectedCamperId],
    queryFn: () => snackBarService.getCamperBalance(selectedCamperId),
    enabled: !!selectedCamperId,
  })

  const { data: transactions = [] } = useQuery({
    queryKey: ['camper-transactions', selectedCamperId],
    queryFn: () => snackBarService.getCamperTransactions(selectedCamperId),
    enabled: !!selectedCamperId,
  })

  const { data: allTransactions = [] } = useQuery({
    queryKey: ['all-transactions'],
    queryFn: () => snackBarService.getAllTransactions(),
    refetchInterval: 5000, // Refetch every 5 seconds
  })

  const mutation = useMutation({
    mutationFn: async (transaction: SnackBarTransaction) => {
      await snackBarService.deductBalance(transaction)
    },
    onSuccess: () => {
      toast.success('Compra realizada com sucesso!')

      // Invalidate all relevant queries
      queryClient.invalidateQueries({
        queryKey: ['camper-balance', selectedCamperId],
      })
      queryClient.invalidateQueries({
        queryKey: ['camper-transactions', selectedCamperId],
      })
      queryClient.invalidateQueries({
        queryKey: ['all-transactions'],
      })

      // Reset form and selected camper
      form.reset({ amount: 0, camper_id: '' })
      setSelectedCamperId('')
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao processar compra',
      )
    },
  })

  // Verificar se existe um acampamento ativo
  if (!isLoading && !currentCamp) {
    return (
      <>
        <Header fixed>
          <Search />
          <div className="ml-auto flex items-center space-x-4">
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </Header>

        <Main>
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">
              Nenhum acampamento ativo
            </h2>
            <p className="text-muted-foreground text-center max-w-md">
              Não existem acampamentos a decorrer atualmente. O snack bar está disponível apenas durante acampamentos ativos.
            </p>
            <Button variant="outline" onClick={() => navigate({ to: '/' })}>
              Voltar ao Dashboard
            </Button>
          </div>
        </Main>
      </>
    )
  }

  // Usamos o acampamento real (agora já sabemos que existe)
  const activeCamp = currentCamp

  function onSubmit(data: SnackBarTransaction) {
    if (!selectedCamperId) return

    const amount = Number(data.amount)
    const numericBalance = typeof balance === 'number' ? balance : parseFloat(String(balance)) || 0
    
    if (amount > numericBalance) {
      toast.error('Saldo insuficiente')
      return
    }

    const transaction = {
      amount: amount,
      camper_id: selectedCamperId,
    }

    mutation.mutate(transaction)
  }

  const amount = form.watch('amount')
  const amountNumber = Number(amount)
  const numericBalance = typeof balance === 'number' ? balance : parseFloat(String(balance)) || 0
  const isAmountValid =
    !isNaN(amountNumber) && amountNumber > 0 && amountNumber <= numericBalance

  // If no access to snack bar, show upgrade dialog or redirect
  if (!permissions.snackBar.access) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">
            Funcionalidade Premium
          </h2>
          <p className="text-muted-foreground text-center max-w-md">
            O Snack Bar está disponível apenas para equipas com plano Premium.
            Faça upgrade do seu plano para aceder a esta funcionalidade.
          </p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate({ to: '/' })}>
              Voltar ao Dashboard
            </Button>
            <Button onClick={() => setShowUpgradeDialog(true)}>
              Fazer Upgrade
            </Button>
          </div>
        </div>
        <TierUpgradeDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
        />
      </>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="mb-8 flex items-center justify-between space-y-2 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Snack Bar</h2>
            <p className="text-muted-foreground">
              Gerencie as compras do snack bar dos campistas.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Vendas
                </CardTitle>
                <IconCoinEuro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  €{' '}
                  {allTransactions.length > 0 
                    ? allTransactions
                        .reduce(
                          (sum, transaction) => sum + Number(transaction.amount),
                          0,
                        )
                        .toFixed(2)
                    : '0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Durante {activeCamp?.name || 'o acampamento atual'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Transações
                </CardTitle>
                <IconCashOff className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {allTransactions.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Durante {activeCamp?.name || 'o acampamento atual'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-[300px,1fr] gap-8">
            <Form {...form}>
              <div className="space-y-6">
                <div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium leading-none">
                      Selecionar Campista
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Escolha o campista para debitar o valor.
                    </p>
                  </div>
                  <Separator className="my-4" />
                  <CamperCombobox
                    value={selectedCamperId}
                    onValueChange={(value: string) => {
                      setSelectedCamperId(value)
                      form.setValue('camper_id', value)
                    }}
                  />
                </div>

                {selectedCamperId && (
                  <>
                    <div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium leading-none">
                          Saldo Disponível
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Saldo atual do campista.
                        </p>
                      </div>
                      <Separator className="my-4" />
                      <div
                        className={`text-2xl font-bold ${balance > 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        € {typeof balance === 'number' ? balance.toFixed(2) : '0.00'}
                      </div>
                    </div>

                    <div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium leading-none">
                          Debitar Valor
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Insira o valor a ser debitado.
                        </p>
                      </div>
                      <Separator className="my-4" />

                      <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    if (
                                      value === '' ||
                                      /^\d*\.?\d{0,2}$/.test(value)
                                    ) {
                                      field.onChange(value)
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={
                            !selectedCamperId ||
                            mutation.isPending ||
                            balance <= 0 ||
                            !isAmountValid
                          }
                        >
                          {mutation.isPending
                            ? 'A debitar...'
                            : balance <= 0
                              ? 'Sem saldo disponível'
                              : 'Debitar valor'}
                        </Button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            </Form>

            <div className="space-y-6">
              <div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium leading-none">
                    Histórico de Transações
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Últimas transações realizadas{' '}
                    {selectedCamperId ? 'pelo campista' : ''}.
                  </p>
                </div>
                <Separator className="my-4" />
              </div>

              <div className="-mx-4 flex-1 overflow-auto px-4">
                <TransactionsTable data={transactions} />
                {selectedCamperId && transactions.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    Este campista não possui transações.
                  </div>
                )}
                {!selectedCamperId && (
                  <div className="text-center py-4 text-muted-foreground">
                    Selecione um campista para ver suas transações.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium leading-none">
                Análise de Pagamentos
              </h3>
              <p className="text-sm text-muted-foreground">
                Visualize o histórico e tendências de vendas do acampamento.
              </p>
            </div>
            <Separator className="my-4" />

            <TransactionsCharts 
              data={allTransactions.length > 0 ? allTransactions : []} 
            />
          </div>
        </div>
      </Main>
    </>
  )
}

export const Route = createFileRoute('/_authenticated/snack-bar/')({
  component: SnackBarPage,
})

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
import { AddTransactionDialog } from '@/features/snack-bar/components/add-transaction-dialog'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { IconCoinEuro, IconCashOff, IconPlus } from '@tabler/icons-react'
import { useTeamPermissions } from '@/features/teams/hooks/use-team-permissions'
import { TierUpgradeDialog } from '@/features/teams/components/tier-upgrade-dialog'

export default function SnackBarPage() {
  const navigate = useNavigate()
  const permissions = useTeamPermissions()
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')
  const [showAddTransactionDialog, setShowAddTransactionDialog] = useState(false)
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

  // Query otimizada que busca pessoa, saldo e transações em uma única operação
  const { data: personData = { balance: 0, payment_status: 'confirmed', person: null, transactions: [] } } = useQuery({
    queryKey: ['person-data', selectedPersonId],
    queryFn: () => snackBarService.getPersonData(selectedPersonId),
    enabled: !!selectedPersonId,
    staleTime: 2 * 60 * 1000, // 2 minutes - cache for longer since it's only updated on selection
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  const { data: allTransactions = [] } = useQuery({
    queryKey: ['all-transactions', currentCamp?.id],
    queryFn: () => snackBarService.getAllTransactions(currentCamp?.id),
    enabled: !!currentCamp?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - cache for longer since it's only updated on selection
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  const { data: campers = [] } = useQuery({
    queryKey: ['campers-and-staff', currentCamp?.id],
    queryFn: () => snackBarService.getCampersAndStaff(currentCamp?.id),
    enabled: !!currentCamp?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - list changes very rarely
    gcTime: 15 * 60 * 1000, // 15 minutes
  })

  const mutation = useMutation({
    mutationFn: async (transaction: SnackBarTransaction) => {
      await snackBarService.deductBalance(transaction)
    },
    onSuccess: () => {
      toast.success('Compra realizada com sucesso!')

      // Invalidate only the necessary queries
      queryClient.invalidateQueries({
        queryKey: ['person-data', selectedPersonId],
      })
      queryClient.invalidateQueries({
        queryKey: ['all-transactions', currentCamp?.id],
      })

      // Reset form and selected person
      form.reset({ amount: 0, camper_id: '' })
      setSelectedPersonId('')
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

      <AddTransactionDialog
        open={showAddTransactionDialog}
        onOpenChange={setShowAddTransactionDialog}
        onSuccess={() => {
          // Refresh data when transaction is added
          queryClient.invalidateQueries({
            queryKey: ['all-transactions', currentCamp?.id],
          })
        }}
      />
    </>
  )
}

  // Usamos o acampamento real (agora já sabemos que existe)
  const activeCamp = currentCamp

  function onSubmit(data: SnackBarTransaction) {
    if (!selectedPersonId) return

    const amount = Number(data.amount)
    const numericBalance = personData.balance
    
    if (amount > numericBalance) {
      toast.error('Saldo insuficiente')
      return
    }

    // Verificar se o payment_status é 'confirmed'
    if (personData.payment_status !== 'confirmed') {
      toast.error('Não é possível usar saldo que ainda não foi confirmado')
      return
    }

    const transaction = {
      amount: amount,
      camper_id: selectedPersonId,
    }

    mutation.mutate(transaction)
  }

  const amount = form.watch('amount')
  const amountNumber = Number(amount)
  const numericBalance = personData.balance
  const isAmountValid =
    !isNaN(amountNumber) && amountNumber > 0 && amountNumber <= numericBalance
  const isPaymentConfirmed = personData.payment_status === 'confirmed'

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
              Gere as compras do snack bar dos campistas.
            </p>
          </div>
                             <Button onClick={() => setShowAddTransactionDialog(true)}>
                     <IconPlus className="mr-2 h-4 w-4" />
                     Adicionar Pagamento
                   </Button>
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
                    value={selectedPersonId}
                    onValueChange={(value: string) => {
                      setSelectedPersonId(value)
                      form.setValue('camper_id', value)
                    }}
                    campers={campers}
                  />
                </div>

                {selectedPersonId && (
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
                      <div className="space-y-2">
                        <div
                          className={`text-2xl font-bold ${
                            personData.balance > 0 
                              ? (personData.payment_status === 'confirmed' ? 'text-green-600' : 'text-yellow-600')
                              : 'text-red-600'
                          }`}
                        >
                          € {personData.balance.toFixed(2)}
                        </div>
                        {personData.balance > 0 && personData.payment_status !== 'confirmed' && (
                          <div className="text-sm text-yellow-600 font-medium">
                            ⚠️ Saldo aguarda confirmação de pagamento
                          </div>
                        )}
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
                            !selectedPersonId ||
                            mutation.isPending ||
                            personData.balance <= 0 ||
                            !isAmountValid ||
                            !isPaymentConfirmed
                          }
                        >
                          {mutation.isPending
                            ? 'A debitar...'
                            : personData.balance <= 0
                              ? 'Sem saldo disponível'
                              : !isPaymentConfirmed
                                ? 'Saldo não confirmado'
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
                    Últimas transações realizadas
                    {selectedPersonId ? 'pela pessoa selecionada' : ''}.
                  </p>
                </div>
                <Separator className="my-4" />
              </div>

              <div className="-mx-4 flex-1 overflow-auto px-4">
                <TransactionsTable data={personData.transactions} />
                {selectedPersonId && personData.transactions.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    Esta pessoa não possui transações.
                  </div>
                )}
                {!selectedPersonId && (
                  <div className="text-center py-4 text-muted-foreground">
                    Selecione uma pessoa para ver suas transações.
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

      <AddTransactionDialog
        open={showAddTransactionDialog}
        onOpenChange={setShowAddTransactionDialog}
        onSuccess={() => {
          // Refresh data when transaction is added
          queryClient.invalidateQueries({
            queryKey: ['all-transactions', currentCamp?.id],
          })
        }}
      />
    </>
  )
}

export const Route = createFileRoute('/_authenticated/snack-bar/')({
  component: SnackBarPage,
})

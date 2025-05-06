import { createContext, useContext, useState, ReactNode } from 'react'
import { Registration } from '../data/schema'
import { registrationService } from '../services/registration-service'
import { toast } from 'sonner'

type DialogType = 'create' | 'view' | 'delete' | 'onboard' | null

interface RegistrationDialogsContextType {
  openDialog: DialogType
  selectedRegistration: Registration | null
  handleOpenChange: (open: boolean) => void
  forceCloseDialog: () => void
  closeCreateDialog: () => void
  openCreateDialog: () => void
  openViewDialog: (registration: Registration) => void
  openDeleteDialog: (registration: Registration) => void
  openOnboardDialog: (registration: Registration) => void
}

const RegistrationDialogsContext = createContext<RegistrationDialogsContextType | undefined>(undefined)

interface RegistrationDialogsProviderProps {
  children: ReactNode
}

export function RegistrationDialogsProvider({ children }: RegistrationDialogsProviderProps) {
  const [openDialog, setOpenDialog] = useState<DialogType>(null)
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null)

  const forceCloseDialog = () => {
    setOpenDialog(null);
    setSelectedRegistration(null);
  };

  const closeCreateDialog = () => {
    if (openDialog === 'create') {
      setOpenDialog(null);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Se abrindo, o diálogo já deve ter sido definido pelo método apropriado
    } else {
      // Se fechando, limpar o estado
      setOpenDialog(null);
      setSelectedRegistration(null);
    }
  }

  const openCreateDialog = () => {
    setOpenDialog('create')
    setSelectedRegistration(null)
  }

  const openViewDialog = async (registration: Registration) => {
    try {
      const fullRegistration = await registrationService.getRegistration(registration.id)
      setSelectedRegistration(fullRegistration)
      setOpenDialog('view')
    } catch (error) {
      toast.error('Failed to load registration details', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  const openDeleteDialog = (registration: Registration) => {
    setSelectedRegistration(registration)
    setOpenDialog('delete')
  }

  const openOnboardDialog = (registration: Registration) => {
    setSelectedRegistration(registration)
    setOpenDialog('onboard')
  }

  return (
    <RegistrationDialogsContext.Provider
      value={{
        openDialog,
        selectedRegistration,
        handleOpenChange,
        forceCloseDialog,
        closeCreateDialog,
        openCreateDialog,
        openViewDialog,
        openDeleteDialog,
        openOnboardDialog,
      }}
    >
      {children}
    </RegistrationDialogsContext.Provider>
  )
}

export function useRegistrationDialogs() {
  const context = useContext(RegistrationDialogsContext)
  if (context === undefined) {
    throw new Error('useRegistrationDialogs must be used within a RegistrationDialogsProvider')
  }
  return context
} 
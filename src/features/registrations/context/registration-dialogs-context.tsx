import { createContext, useContext, useState, ReactNode } from 'react'
import { Registration } from '../data/schema'

type DialogType = 'create' | 'view' | 'delete' | null

interface RegistrationDialogsContextType {
  openDialog: DialogType
  selectedRegistration: Registration | null
  handleOpenChange: (open: boolean) => void
  openCreateDialog: () => void
  openViewDialog: (registration: Registration) => void
  openDeleteDialog: (registration: Registration) => void
}

const RegistrationDialogsContext = createContext<RegistrationDialogsContextType | undefined>(undefined)

interface RegistrationDialogsProviderProps {
  children: ReactNode
}

export function RegistrationDialogsProvider({ children }: RegistrationDialogsProviderProps) {
  const [openDialog, setOpenDialog] = useState<DialogType>(null)
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null)

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setOpenDialog(null)
      setSelectedRegistration(null)
    }
  }

  const openCreateDialog = () => {
    setOpenDialog('create')
    setSelectedRegistration(null)
  }

  const openViewDialog = (registration: Registration) => {
    setSelectedRegistration(registration)
    setOpenDialog('view')
  }

  const openDeleteDialog = (registration: Registration) => {
    setSelectedRegistration(registration)
    setOpenDialog('delete')
  }

  return (
    <RegistrationDialogsContext.Provider
      value={{
        openDialog,
        selectedRegistration,
        handleOpenChange,
        openCreateDialog,
        openViewDialog,
        openDeleteDialog,
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
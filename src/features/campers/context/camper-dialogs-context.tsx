import { createContext, useContext, useState } from 'react'
import { Camper } from '../data/schema'

interface CamperDialogsContextType {
  isCreateDialogOpen: boolean
  selectedCamperId: string | null
  openCreateDialog: () => void
  closeCreateDialog: () => void
  openEditDialog: (camperId: string) => void
  closeEditDialog: () => void
}

const CamperDialogsContext = createContext<CamperDialogsContextType | undefined>(
  undefined
)

interface CamperDialogsProviderProps {
  children: React.ReactNode
}

export function CamperDialogsProvider({ children }: CamperDialogsProviderProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedCamperId, setSelectedCamperId] = useState<string | null>(null)

  const openCreateDialog = () => setIsCreateDialogOpen(true)
  const closeCreateDialog = () => setIsCreateDialogOpen(false)
  const openEditDialog = (camperId: string) => setSelectedCamperId(camperId)
  const closeEditDialog = () => setSelectedCamperId(null)

  return (
    <CamperDialogsContext.Provider
      value={{
        isCreateDialogOpen,
        selectedCamperId,
        openCreateDialog,
        closeCreateDialog,
        openEditDialog,
        closeEditDialog,
      }}
    >
      {children}
    </CamperDialogsContext.Provider>
  )
}

export function useCamperDialogs() {
  const context = useContext(CamperDialogsContext)
  if (context === undefined) {
    throw new Error('useCamperDialogs must be used within a CamperDialogsProvider')
  }
  return context
} 
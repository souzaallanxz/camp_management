import { createContext, useContext, useState } from 'react'

interface StaffDialogsContextType {
  isCreateDialogOpen: boolean
  selectedStaffId: string | null
  openCreateDialog: () => void
  closeCreateDialog: () => void
  openEditDialog: (staffId: string) => void
  closeEditDialog: () => void
}

const StaffDialogsContext = createContext<StaffDialogsContextType | undefined>(
  undefined
)

interface StaffDialogsProviderProps {
  children: React.ReactNode
}

export function StaffDialogsProvider({ children }: StaffDialogsProviderProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)

  const openCreateDialog = () => setIsCreateDialogOpen(true)
  const closeCreateDialog = () => setIsCreateDialogOpen(false)
  const openEditDialog = (staffId: string) => setSelectedStaffId(staffId)
  const closeEditDialog = () => setSelectedStaffId(null)

  return (
    <StaffDialogsContext.Provider
      value={{
        isCreateDialogOpen,
        selectedStaffId,
        openCreateDialog,
        closeCreateDialog,
        openEditDialog,
        closeEditDialog,
      }}
    >
      {children}
    </StaffDialogsContext.Provider>
  )
}

export function useStaffDialogs() {
  const context = useContext(StaffDialogsContext)
  if (context === undefined) {
    throw new Error('useStaffDialogs must be used within a StaffDialogsProvider')
  }
  return context
} 
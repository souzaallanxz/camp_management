import { createContext, useContext, useState } from 'react'
import { type Camp } from '../data/schema'

interface CampDialogsContextData {
  isEditOpen: boolean
  isDeleteOpen: boolean
  selectedCamp: Camp | null
  onOpenEdit: (camp: Camp | null) => void
  onCloseEdit: () => void
  onOpenDelete: (camp: Camp) => void
  onCloseDelete: () => void
}

const CampDialogsContext = createContext<CampDialogsContextData>(
  {} as CampDialogsContextData,
)

export function CampDialogsProvider({ children }: { children: React.ReactNode }) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null)

  function onOpenEdit(camp: Camp | null) {
    setSelectedCamp(camp)
    setIsEditOpen(true)
  }

  function onCloseEdit() {
    setSelectedCamp(null)
    setIsEditOpen(false)
  }

  function onOpenDelete(camp: Camp) {
    setSelectedCamp(camp)
    setIsDeleteOpen(true)
  }

  function onCloseDelete() {
    setSelectedCamp(null)
    setIsDeleteOpen(false)
  }

  return (
    <CampDialogsContext.Provider
      value={{
        isEditOpen,
        isDeleteOpen,
        selectedCamp,
        onOpenEdit,
        onCloseEdit,
        onOpenDelete,
        onCloseDelete,
      }}
    >
      {children}
    </CampDialogsContext.Provider>
  )
}

export function useCampDialogs() {
  const context = useContext(CampDialogsContext)

  if (!context) {
    throw new Error('useCampDialogs must be used within a CampDialogsProvider')
  }

  return context
} 
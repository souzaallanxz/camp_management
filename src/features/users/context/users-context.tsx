import React, { createContext, useContext, useState } from 'react'
import { User } from '../data/schema'

interface UsersDialogsContextProps {
  isInviteDialogOpen: boolean
  isEditDialogOpen: boolean
  isDeleteDialogOpen: boolean
  selectedUser: User | null
  openInviteDialog: () => void
  closeInviteDialog: () => void
  openEditDialog: (user: User) => void
  closeEditDialog: () => void
  openDeleteDialog: (user: User) => void
  closeDeleteDialog: () => void
}

const UsersDialogsContext = createContext<UsersDialogsContextProps | undefined>(undefined)

export function useUsersDialogs() {
  const context = useContext(UsersDialogsContext)
  if (!context) {
    throw new Error('useUsersDialogs must be used within UsersProvider')
  }
  return context
}

interface UsersProviderProps {
  children: React.ReactNode
}

export default function UsersProvider({ children }: UsersProviderProps) {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const openInviteDialog = () => setIsInviteDialogOpen(true)
  const closeInviteDialog = () => setIsInviteDialogOpen(false)

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setIsEditDialogOpen(true)
  }
  const closeEditDialog = () => setIsEditDialogOpen(false)

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }
  const closeDeleteDialog = () => setIsDeleteDialogOpen(false)

  return (
    <UsersDialogsContext.Provider
      value={{
        isInviteDialogOpen,
        isEditDialogOpen,
        isDeleteDialogOpen,
        selectedUser,
        openInviteDialog,
        closeInviteDialog,
        openEditDialog,
        closeEditDialog,
        openDeleteDialog,
        closeDeleteDialog,
      }}
    >
      {children}
    </UsersDialogsContext.Provider>
  )
}

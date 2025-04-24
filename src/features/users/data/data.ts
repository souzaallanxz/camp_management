import {
  IconCash,
  IconShield,
  IconUsersGroup,
  IconUserShield,
  IconUser,
  IconCheck,
  IconX,
  IconMailOpened,
  IconLock,
} from '@tabler/icons-react'

export const userTypes = [
  {
    label: 'Superadmin',
    value: 'superadmin',
    icon: IconShield,
  },
  {
    label: 'Admin',
    value: 'admin',
    icon: IconUserShield,
  },
  {
    label: 'Manager',
    value: 'manager',
    icon: IconUsersGroup,
  },
  {
    label: 'Cashier',
    value: 'cashier',
    icon: IconCash,
  },
  {
    label: 'Contributor',
    value: 'contributor',
    icon: IconUser,
  },
] as const

export const userStatuses = [
  {
    label: 'Active',
    value: 'active',
    icon: IconCheck,
  },
  {
    label: 'Inactive',
    value: 'inactive',
    icon: IconX,
  },
  {
    label: 'Invited',
    value: 'invited',
    icon: IconMailOpened,
  },
  {
    label: 'Suspended',
    value: 'suspended',
    icon: IconLock,
  },
] as const

import type { TeamTier } from '../types'

interface DashboardPermissions {
  viewPaymentsTotal: boolean
  viewRegistrationsTotal: boolean
  viewCamperTotal: boolean
  viewRechargesTotal: boolean
  viewOverview: boolean
  viewLatestRegistrations: boolean
}

interface RegistrationsPermissions {
  viewList: boolean
  create: boolean
  startOnboarding: boolean
  delete: boolean
}

interface CampersPermissions {
  viewList: boolean
  create: boolean
  rechargeCard: boolean
}

interface CampsPermissions {
  viewList: boolean
  create: boolean
}

interface SnackBarPermissions {
  access: boolean
}

export interface FeaturePermissions {
  dashboard: DashboardPermissions
  registrations: RegistrationsPermissions
  campers: CampersPermissions
  camps: CampsPermissions
  snackBar: SnackBarPermissions
}

// Permissões para o role Cashier
const CASHIER_ROLE_PERMISSIONS: FeaturePermissions = {
  dashboard: {
    viewPaymentsTotal: false, // Cashier não deve ver Total Pagamentos
    viewRegistrationsTotal: true,
    viewCamperTotal: true,
    viewRechargesTotal: true,
    viewOverview: false, // Cashier não deve ver Overview
    viewLatestRegistrations: false, // Cashier não deve ver Últimas Inscrições
  },
  registrations: {
    viewList: false,
    create: false,
    startOnboarding: false,
    delete: false,
  },
  campers: {
    viewList: false,
    create: false,
    rechargeCard: false,
  },
  camps: {
    viewList: false,
    create: false,
  },
  snackBar: {
    access: true, // Cashier deve ter acesso apenas ao Snackbar
  },
}

const FREE_TIER_PERMISSIONS: FeaturePermissions = {
  dashboard: {
    viewPaymentsTotal: true,
    viewRegistrationsTotal: true,
    viewCamperTotal: true,
    viewRechargesTotal: false,
    viewOverview: true,
    viewLatestRegistrations: true,
  },
  registrations: {
    viewList: true,
    create: true,
    startOnboarding: true,
    delete: true,
  },
  campers: {
    viewList: true,
    create: true,
    rechargeCard: false,
  },
  camps: {
    viewList: true,
    create: true,
  },
  snackBar: {
    access: false,
  },
}

const PREMIUM_TIER_PERMISSIONS: FeaturePermissions = {
  dashboard: {
    viewPaymentsTotal: true,
    viewRegistrationsTotal: true,
    viewCamperTotal: true,
    viewRechargesTotal: true,
    viewOverview: true,
    viewLatestRegistrations: true,
  },
  registrations: {
    viewList: true,
    create: true,
    startOnboarding: true,
    delete: true,
  },
  campers: {
    viewList: true,
    create: true,
    rechargeCard: true,
  },
  camps: {
    viewList: true,
    create: true,
  },
  snackBar: {
    access: true,
  },
}

export function getFeaturePermissions(tier: TeamTier, userRole?: string): FeaturePermissions {
  // Se o usuário tem role Cashier, usar permissões específicas do Cashier
  if (userRole === 'cashier') {
    return CASHIER_ROLE_PERMISSIONS
  }
  
  // Caso contrário, usar permissões baseadas no tier
  return tier === 'premium' ? PREMIUM_TIER_PERMISSIONS : FREE_TIER_PERMISSIONS
}

export function hasFeatureAccess(tier: TeamTier, feature: keyof FeaturePermissions, userRole?: string): boolean {
  const permissions = getFeaturePermissions(tier, userRole)
  return Object.values(permissions[feature]).some(Boolean)
}

export function hasSpecificPermission<
  T extends keyof FeaturePermissions,
  P extends keyof FeaturePermissions[T]
>(tier: TeamTier, feature: T, permission: P, userRole?: string): boolean {
  const permissions = getFeaturePermissions(tier, userRole)
  return permissions[feature][permission] as boolean
} 
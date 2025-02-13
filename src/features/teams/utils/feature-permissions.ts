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

export function getFeaturePermissions(tier: TeamTier): FeaturePermissions {
  return tier === 'premium' ? PREMIUM_TIER_PERMISSIONS : FREE_TIER_PERMISSIONS
}

export function hasFeatureAccess(tier: TeamTier, feature: keyof FeaturePermissions): boolean {
  const permissions = getFeaturePermissions(tier)
  return Object.values(permissions[feature]).some(Boolean)
}

export function hasSpecificPermission<
  T extends keyof FeaturePermissions,
  P extends keyof FeaturePermissions[T]
>(tier: TeamTier, feature: T, permission: P): boolean {
  const permissions = getFeaturePermissions(tier)
  return permissions[feature][permission] as boolean
} 
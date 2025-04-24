import { z } from 'zod'

const userStatusSchema = z.union([
  z.literal('active'),
  z.literal('inactive'),
  z.literal('invited'),
  z.literal('suspended'),
])
export type UserStatus = 'active' | 'inactive' | 'invited' | 'suspended'

const userRoleSchema = z.union([
  z.literal('superadmin'),
  z.literal('admin'),
  z.literal('contributor'),
  z.literal('cashier'),
  z.literal('manager'),
])
export type UserRole = 'superadmin' | 'admin' | 'contributor' | 'cashier' | 'manager'

const userSchema = z.object({
  id: z.string(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().email().optional(),
  status: userStatusSchema.optional(),
  role: userRoleSchema.optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})
export type User = z.infer<typeof userSchema>

export const userListSchema = z.array(userSchema)

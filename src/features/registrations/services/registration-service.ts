import type { Registration, InsertRegistration, UpdateRegistration } from '../data/schema'
import { api, API_PATHS } from '@/services/api'

export const registrationService = {
  async getRegistrations() {
    return await api.get<Registration[]>(API_PATHS.REGISTRATIONS);
  },

  async getRegistration(id: string) {
    return await api.get<Registration>(API_PATHS.REGISTRATION(id));
  },

  async createRegistration(data: InsertRegistration) {
    return await api.post<Registration>(API_PATHS.REGISTRATIONS, data);
  },

  async updateRegistration(id: string, data: UpdateRegistration) {
    return await api.put<Registration>(API_PATHS.REGISTRATION(id), data);
  },

  async deleteRegistration(id: string) {
    await api.delete(API_PATHS.REGISTRATION(id));
  },

  async getRegistrationsByCamp(campId: string) {
    return await api.get<Registration[]>(API_PATHS.REGISTRATIONS_BY_CAMP(campId));
  },

  async updateOnboardingStatus(registrationId: string, onboardingStatus: string) {
    return await api.patch<Registration>(
      `${API_PATHS.REGISTRATION(registrationId)}/onboarding-status`,
      { onboarding_status: onboardingStatus }
    );
  }
};

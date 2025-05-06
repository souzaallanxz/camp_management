import api from '@/services/api';

// Define the Settings type locally since it's not found in @/types
interface Settings {
  id: string;
  name: string;
  value: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function findAll() {
  return api.get<Settings[]>("/settings", { requireTeam: true });
}

export async function findById(id: string) {
  return api.get<Settings>(`/settings/${id}`, { requireTeam: true });
}

export async function create(data: Partial<Settings>) {
  return api.post<Settings>("/settings", data, { requireTeam: true });
}

export async function update(id: string, data: Partial<Settings>) {
  return api.put<Settings>(`/settings/${id}`, data, { requireTeam: true });
}

export async function remove(id: string) {
  return api.delete<void>(`/settings/${id}`, { requireTeam: true });
}

// Convenience function for fetching settings
export async function getSettings() {
  const response = await findAll();
  return response;
}

// Convenience function for fetching a specific setting
export async function getSettingById(id: string) {
  const response = await findById(id);
  return response;
} 
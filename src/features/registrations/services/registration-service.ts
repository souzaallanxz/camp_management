import { getTeamIdHeader } from '@/lib/auth';

// For production, directly use the correct API URL with /api prefix
const API_BASE_URL = 'https://campmanagement.vercel.app/api';

// Interface para a resposta da API
interface ApiRegistration {
  id: string;
  form_id?: string;
  name?: string;
  email?: string;
  contact?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  camp_id?: string;
  camp_name?: string;
  camper_name?: string;
  camper_email?: string;
  total_paid?: number | string;
  onboarding_status?: string;
  // Para outros campos que possam existir
  [key: string]: unknown;
}

// Interface para pagamentos
interface ApiPayment {
  id: string;
  registration_id: string;
  amount: string | number;
  payment_method: string;
  payment_status: string;
  payment_date: string;
  payment_link?: string | null;
  phone_number?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  campId: string;
  campName?: string;
  camperId: string;
  camperName?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  total_paid?: number;
  camp_price?: number;
}

export interface CreateRegistrationData {
  campId: string;
  camperId: string;
  totalAmount: number;
}

// Helper function to get the total paid amount for a registration
async function getTotalPaidForRegistration(registrationId: string): Promise<number> {
  try {
    const headers = { ...getTeamIdHeader() };
    const response = await fetch(`${API_BASE_URL}/payments?registrationId=${registrationId}`, { 
      headers,
      credentials: 'include'
    });
    
    if (!response.ok) {
      return 0;
    }
    
    const payments: ApiPayment[] = await response.json();
    return payments.reduce((total, payment) => total + Number(payment.amount), 0);
  } catch {
    return 0;
  }
}

// Helper function to calculate registration status based on total paid and camp price
function calculateRegistrationStatus(totalPaid: number, campPrice: number): string {
  // Garantir que estamos trabalhando com números
  totalPaid = Number(totalPaid) || 0;
  campPrice = Number(campPrice) || 0;
  
  // Se o preço do acampamento for 0 ou não definido, vamos considerar como pago
  if (campPrice <= 0) {
    return totalPaid > 0 ? 'paid' : 'unpaid';
  }
  
  // Comparação com tolerância para evitar problemas de arredondamento
  // Consideramos como pago se a diferença for menor que 1 euro
  if (totalPaid >= campPrice || (campPrice - totalPaid) < 1) {
    return 'paid';
  } else if (totalPaid > 0) {
    return 'partial';
  } else {
    return 'unpaid';
  }
}

// Helper function to get the camp price
async function getCampPrice(campId: string): Promise<number> {
  try {
    const headers = { ...getTeamIdHeader() };
    const response = await fetch(`${API_BASE_URL}/camps/${campId}`, { 
      headers,
      credentials: 'include'
    });
    
    if (!response.ok) {
      return 0;
    }
    
    const camp = await response.json();
    return Number(camp.price) || 0;
  } catch {
    return 0;
  }
}

export const registrationService = {
  async findAll(): Promise<Registration[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      
      const response = await fetch(`${API_BASE_URL}/registrations`, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      
      // Mapeamento básico inicial dos registros
      const registrations = data.map((registration: ApiRegistration) => ({
        ...registration,
        total_paid: Number(registration.total_paid) || 0,
        camp_price: Number(registration.camp_price) || 0
      }));
      
      // Para cada registro, buscar os pagamentos e calcular o total
      const registrationsWithTotalPaid = await Promise.all(
        registrations.map(async (registration) => {
          // Se total_paid já estiver definido e for diferente de 0, usar esse valor
          let totalPaid = Number(registration.total_paid) || 0;
          if (totalPaid === 0) {
            totalPaid = await getTotalPaidForRegistration(registration.id);
          }
          
          // Garantir que temos o preço do acampamento
          const campPrice = Number(registration.camp_price) || 0;
          
          // Recalcular o status com base no valor pago e preço do acampamento
          const calculatedStatus = calculateRegistrationStatus(totalPaid, campPrice);
          
          return {
            ...registration,
            total_paid: totalPaid,
            // Se o status do backend não corresponder ao calculado, usamos o calculado
            status: calculatedStatus
          };
        })
      );
      
      return registrationsWithTotalPaid;
    } catch {
      // Tratamento silencioso do erro
      return [];
    }
  },

  async findById(id: string): Promise<Registration | null> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/registrations/${id}`, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      // Se total_paid for 0 ou null, buscar os pagamentos
      let totalPaid = Number(data.total_paid) || 0;
      if (totalPaid === 0) {
        totalPaid = await getTotalPaidForRegistration(id);
      }
      
      // Buscar o preço do acampamento se necessário
      let campPrice = Number(data.camp_price) || 0;
      if (campPrice === 0 && data.camp_id) {
        campPrice = await getCampPrice(data.camp_id);
      }
      
      // Calcular o status com base no pagamento e preço
      const calculatedStatus = calculateRegistrationStatus(totalPaid, campPrice);
      
      return {
        ...data,
        total_paid: totalPaid,
        camp_price: campPrice,
        status: calculatedStatus
      };
    } catch {
      return null;
    }
  },

  async create(data: CreateRegistrationData): Promise<Registration | null> {
    try {
      const headers = { 
        ...getTeamIdHeader(),
        'Content-Type': 'application/json' 
      };
      
      const response = await fetch(`${API_BASE_URL}/registrations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        return null;
      }
      
      const result = await response.json();
      
      return {
        ...result,
        total_paid: 0 // Nova inscrição, sem pagamentos
      };
    } catch {
      return null;
    }
  },

  async update(id: string, data: Partial<Registration>): Promise<Registration | null> {
    try {
      const headers = { 
        ...getTeamIdHeader(),
        'Content-Type': 'application/json' 
      };
      
      const response = await fetch(`${API_BASE_URL}/registrations/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        return null;
      }
      
      const result = await response.json();
      
      // Se total_paid for 0 ou null, buscar os pagamentos
      let totalPaid = Number(result.total_paid) || 0;
      if (totalPaid === 0) {
        totalPaid = await getTotalPaidForRegistration(id);
      }
      
      // Buscar o preço do acampamento se necessário
      let campPrice = Number(result.camp_price) || 0;
      if (campPrice === 0 && result.camp_id) {
        campPrice = await getCampPrice(result.camp_id);
      }
      
      // Calcular o status com base no pagamento e preço
      const calculatedStatus = calculateRegistrationStatus(totalPaid, campPrice);
      
      return {
        ...result,
        total_paid: totalPaid,
        camp_price: campPrice,
        status: calculatedStatus
      };
    } catch {
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/registrations/${id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      
      return response.ok;
    } catch {
      return false;
    }
  },

  async getRegistrationsByCamp(campId: string): Promise<Registration[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/registrations/camp/${campId}`, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      
      // Buscar o preço do acampamento uma vez para todas as inscrições
      const campPrice = await getCampPrice(campId);
      
      // Para cada registro, verificar o total pago
      const registrationsWithTotalPaid = await Promise.all(
        data.map(async (registration: ApiRegistration) => {
          let totalPaid = Number(registration.total_paid) || 0;
          if (totalPaid === 0) {
            totalPaid = await getTotalPaidForRegistration(registration.id);
          }
          
          // Calcular o status com base no pagamento e preço
          const calculatedStatus = calculateRegistrationStatus(totalPaid, campPrice);
          
          return {
            ...registration,
            total_paid: totalPaid,
            camp_price: campPrice,
            status: calculatedStatus
          };
        })
      );
      
      return registrationsWithTotalPaid;
    } catch {
      return [];
    }
  },

  async getRegistrationsByCamper(camperId: string): Promise<Registration[]> {
    try {
      const headers = { ...getTeamIdHeader() };
      const response = await fetch(`${API_BASE_URL}/registrations/camper/${camperId}`, { 
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      
      // Para cada registro, processar os pagamentos e preços dos acampamentos
      const registrationsWithTotalPaid = await Promise.all(
        data.map(async (registration: ApiRegistration) => {
          let totalPaid = Number(registration.total_paid) || 0;
          if (totalPaid === 0) {
            totalPaid = await getTotalPaidForRegistration(registration.id);
          }
          
          // Buscar o preço do acampamento se necessário
          let campPrice = Number(registration.camp_price) || 0;
          if (campPrice === 0 && registration.camp_id) {
            campPrice = await getCampPrice(registration.camp_id);
          }
          
          // Calcular o status com base no pagamento e preço
          const calculatedStatus = calculateRegistrationStatus(totalPaid, campPrice);
          
          return {
            ...registration,
            total_paid: totalPaid,
            camp_price: campPrice,
            status: calculatedStatus
          };
        })
      );
      
      return registrationsWithTotalPaid;
    } catch {
      return [];
    }
  },

  async updateOnboardingStatus(registrationId: string, onboardingStatus: string): Promise<Registration | null> {
    try {
      const headers = { 
        ...getTeamIdHeader(),
        'Content-Type': 'application/json' 
      };
      
      const response = await fetch(`${API_BASE_URL}/registrations/${registrationId}/onboarding-status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ onboarding_status: onboardingStatus }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        return null;
      }
      
      const result = await response.json();
      
      // Se total_paid for 0 ou null, buscar os pagamentos
      let totalPaid = Number(result.total_paid) || 0;
      if (totalPaid === 0) {
        totalPaid = await getTotalPaidForRegistration(registrationId);
      }
      
      // Buscar o preço do acampamento se necessário
      let campPrice = Number(result.camp_price) || 0;
      if (campPrice === 0 && result.camp_id) {
        campPrice = await getCampPrice(result.camp_id);
      }
      
      // Calcular o status com base no pagamento e preço
      const calculatedStatus = calculateRegistrationStatus(totalPaid, campPrice);
      
      return {
        ...result,
        total_paid: totalPaid,
        camp_price: campPrice,
        status: calculatedStatus
      };
    } catch {
      return null;
    }
  }
};

/**
 * Lemon Squeezy API Service
 * Handles payment processing and subscription management
 */

const LEMON_SQUEEZY_API_BASE = 'https://api.lemonsqueezy.com/v1';
const API_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiIzMWM1YWY3MjY4M2UxYjQxODY0YmM0ODljMDQ3NTUwNzc2MTk4ZGRkNTQxYTVjZGE4YTJjZjQ3MzRmOTI1NDY3NmJjMzNiMzAxYzA0MWY2YiIsImlhdCI6MTc1MTQ5NTIxMC42NTE5NjUsIm5iZiI6MTc1MTQ5NTIxMC42NTE5NjgsImV4cCI6MjA2NzAyODAxMC42MjA0OTQsInN1YiI6IjE3NjU0NiIsInNjb3BlcyI6W119.uPCyfF91rnEGaXLdxSTqDIFib1lUsHgd_a7WRV568-KsMjs8hdIYEvhQ0iAh1fERgixi938Pc5wa-60_YUpYYDVhzhaj9M7iPjWUuAU0S9jL_EhWILMQYnXKHhA-HIZoLcHglfBSwWllFctBhUlPlJUM1EMXbI3P686WKiEK6lenOHfZ9dYMOdczT_EZ5zQzsv2NrKi6NqdFuBKXAH9fsCvki_oxomoc6lLtqwk7H_lmAzRRDtiQM3dGj2nrSait-y4-3cBg_JfICdJnCz1I1z0YPkCHWzKmVYpcbcM2y2QjinXWD1qqvT4GJr9cPugy99N_xa7caPFyzFFPDn9fQKg-7wo9Ghe7ZJ5vOAczbf2KdnU9sb6M8fJjDJjrXdrSMH_EPcNMr_eoq4dbhA6s-425O4IYWSCwxDILlp9YwU2sm_7L2f8voShYnBs3vd3ixFDEuGWjTf4mBuNuQmeIMimWSQZyspHALDo9N71Kcc6_LUPehGX-b9dzuo_GdJsq';

interface LemonSqueezyResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
  links?: Record<string, string>;
}

interface CheckoutData {
  type: 'checkouts';
  attributes: {
    checkout_options?: {
      embed?: boolean;
      media?: boolean;
      logo?: boolean;
      desc?: boolean;
      discount?: boolean;
      dark?: boolean;
      subscription_preview?: boolean;
      button_color?: string;
      return_url?: string;
    };
    checkout_data?: {
      email?: string;
      name?: string;
      custom?: Record<string, unknown>;
    };
    expires_at?: string;
    preview?: boolean;
    test_mode?: boolean;
  };
  relationships: {
    store: {
      data: {
        type: 'stores';
        id: string;
      };
    };
    variant: {
      data: {
        type: 'variants';
        id: string;
      };
    };
  };
}

interface Checkout {
  id: string;
  type: 'checkouts';
  attributes: {
    store_id: number;
    variant_id: number;
    custom_price: number | null;
    product_options: Record<string, unknown>;
    checkout_options: Record<string, unknown>;
    checkout_data: Record<string, unknown>;
    expires_at: string | null;
    created_at: string;
    updated_at: string;
    test_mode: boolean;
    url: string;
  };
}

/**
 * Makes authenticated requests to Lemon Squeezy API
 */
async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<LemonSqueezyResponse<T>> {
  const response = await fetch(`${LEMON_SQUEEZY_API_BASE}${endpoint}`, {
    headers: {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'Authorization': `Bearer ${API_KEY}`,
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Lemon Squeezy API Error: ${response.status} - ${errorData}`);
  }

  return response.json();
}

/**
 * Creates a checkout session for a specific variant
 */
export async function createCheckout(params: {
  storeId: string;
  variantId: string;
  customData?: Record<string, unknown>;
  customerEmail?: string;
  customerName?: string;
  returnUrl?: string;
}): Promise<string> {
  const checkoutData: CheckoutData = {
    type: 'checkouts',
    attributes: {
      checkout_options: {
        embed: false, // false para usar overlay
        media: true,
        logo: true,
        desc: true,
        discount: true,
        dark: false,
        subscription_preview: true,
        ...(params.returnUrl ? { return_url: params.returnUrl } : {}),
      },
      checkout_data: {
        email: params.customerEmail,
        name: params.customerName,
        custom: params.customData,
      },
      test_mode: import.meta.env.DEV, // Use test mode in development
    },
    relationships: {
      store: {
        data: {
          type: 'stores',
          id: params.storeId,
        },
      },
      variant: {
        data: {
          type: 'variants',
          id: params.variantId,
        },
      },
    },
  };

  const response = await makeRequest<Checkout>('/checkouts', {
    method: 'POST',
    body: JSON.stringify({
      data: checkoutData,
    }),
  });

  return response.data.attributes.url;
}

/**
 * Gets all stores for the authenticated user
 */
export async function getStores() {
  return makeRequest('/stores');
}

/**
 * Gets all products for a store
 */
export async function getProducts(storeId: string) {
  return makeRequest(`/products?filter[store_id]=${storeId}`);
}

/**
 * Gets all variants for a product
 */
export async function getVariants(productId: string) {
  return makeRequest(`/variants?filter[product_id]=${productId}`);
}

/**
 * Premium plan configuration
 * You'll need to replace these IDs with your actual Lemon Squeezy store and variant IDs
 */
export const PREMIUM_PLAN = {
  storeId: '181507', // Campy store ID
  variantId: '883664', // Premium variant ID from Lemon Squeezy
  price: 19,
  currency: 'EUR',
  interval: 'month',
};

export const lemonSqueezyService = {
  createCheckout,
  getStores,
  getProducts,
  getVariants,
  PREMIUM_PLAN,
}; 
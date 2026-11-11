import type {
  AuthResponse,
  Customer,
  Order,
  Page,
  Product,
  Role,
} from './types'

const API_BASE: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

const TOKEN_KEY = 'oms_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

/** Decodes the JWT payload (no verification — display purposes only). */
export function decodeToken(token: string): { sub?: string; role?: string } {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as { sub?: string; role?: string }
  } catch {
    return {}
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (!response.ok) {
    let message = `Request failed: ${response.status}`
    try {
      const body: unknown = await response.json()
      if (
        body !== null &&
        typeof body === 'object' &&
        'message' in body &&
        typeof (body as { message: unknown }).message === 'string'
      ) {
        message = (body as { message: string }).message
      }
    } catch {
      // No JSON error body — keep the status-based message.
    }
    throw new Error(message)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

// --- Auth ---

export function login(username: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function register(
  username: string,
  password: string,
  role: Role,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, role }),
  })
}

// --- Products ---

export function listProducts(): Promise<Page<Product>> {
  return apiFetch<Page<Product>>('/api/products?page=0&size=100')
}

export function createProduct(product: Product): Promise<Product> {
  return apiFetch<Product>('/api/products', {
    method: 'POST',
    body: JSON.stringify(product),
  })
}

export function updateProduct(id: number, product: Product): Promise<Product> {
  return apiFetch<Product>(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  })
}

export function deleteProduct(id: number): Promise<void> {
  return apiFetch<void>(`/api/products/${id}`, { method: 'DELETE' })
}

// --- Customers ---

export function listCustomers(): Promise<Page<Customer>> {
  return apiFetch<Page<Customer>>('/api/customers?page=0&size=100')
}

export function createCustomer(customer: Customer): Promise<Customer> {
  return apiFetch<Customer>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(customer),
  })
}

export function updateCustomer(
  id: number,
  customer: Customer,
): Promise<Customer> {
  return apiFetch<Customer>(`/api/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customer),
  })
}

export function deleteCustomer(id: number): Promise<void> {
  return apiFetch<void>(`/api/customers/${id}`, { method: 'DELETE' })
}

// --- Orders ---

export function listOrders(): Promise<Page<Order>> {
  return apiFetch<Page<Order>>('/api/orders?page=0&size=100')
}

export function createOrder(order: Order): Promise<Order> {
  return apiFetch<Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  })
}

export function updateOrderStatus(
  id: number,
  status: string,
): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${id}/status?status=${status}`, {
    method: 'PATCH',
  })
}

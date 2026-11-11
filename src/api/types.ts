// Types mirroring the backend DTOs in com.example.OMS.dto (order-management-api).

export type Role = 'CUSTOMER' | 'SELLER' | 'ADMIN'

export interface Product {
  id: number | null
  name: string
  description: string | null
  price: number
  stockQuantity: number
  sellerId: number | null
  sellerUsername: string | null
}

export interface Customer {
  id: number | null
  name: string
  email: string
  phone: string | null
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'

export const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]

export interface OrderItem {
  id: number | null
  productId: number
  quantity: number
  priceAtPurchase: number | null
}

export interface Order {
  id: number | null
  customerId: number
  placedById: number | null
  placedByUsername: string | null
  status: OrderStatus | null
  orderDate: string | null
  items: OrderItem[]
}

export interface AuthResponse {
  token: string
}

/** Spring Data Page<T> JSON shape returned by the list endpoints. */
export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

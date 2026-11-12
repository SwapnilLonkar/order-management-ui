import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Product } from '../api/types'

export interface CartItem {
  productId: number
  name: string
  price: number
  quantity: number
  /** Stock available when the item was added; the cart caps quantity here,
   *  the same limit the Products page stepper enforces. */
  stock: number
}

interface CartState {
  items: CartItem[]
  count: number
  total: number
  add: (product: Product) => void
  remove: (productId: number) => void
  setQuantity: (productId: number, quantity: number) => void
  clear: () => void
}

const CartContext = createContext<CartState | null>(null)
const STORAGE_KEY = 'oms_cart'

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const items = raw ? (JSON.parse(raw) as CartItem[]) : []
    // Carts saved before items carried stock have no cap until re-added.
    return items.map((item) => ({ ...item, stock: item.stock ?? 0 }))
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const add = useCallback((product: Product) => {
    if (product.id == null) return
    const productId = product.id
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === productId)
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? {
                ...item,
                stock: product.stockQuantity,
                quantity: Math.min(
                  item.quantity + 1,
                  product.stockQuantity,
                ),
              }
            : item,
        )
      }
      return [
        ...prev,
        {
          productId,
          name: product.name,
          price: product.price,
          quantity: 1,
          stock: product.stockQuantity,
        },
      ]
    })
  }, [])

  const remove = useCallback((productId: number) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId))
  }, [])

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((item) => item.productId !== productId)
        : prev.map((item) => {
            if (item.productId !== productId) return item
            const capped =
              item.stock > 0 ? Math.min(quantity, item.stock) : quantity
            return { ...item, quantity: capped }
          }),
    )
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const { count, total } = useMemo(
    () => ({
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }),
    [items],
  )

  const value = useMemo(
    () => ({ items, count, total, add, remove, setQuantity, clear }),
    [items, count, total, add, remove, setQuantity, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartState {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

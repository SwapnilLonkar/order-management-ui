import { useEffect, useState, type FormEvent } from 'react'
import {
  createOrder,
  listCustomers,
  listOrders,
  listProducts,
  updateOrderStatus,
} from '../api/client'
import {
  ORDER_STATUSES,
  type Customer,
  type Order,
  type OrderItem,
  type Product,
} from '../api/types'
import { useAuth } from '../auth/AuthContext'

interface ItemRow {
  productId: number
  quantity: number
}

function orderTotal(order: Order): number {
  return order.items.reduce(
    (sum, item) => sum + (item.priceAtPurchase ?? 0) * item.quantity,
    0,
  )
}

export default function OrdersPage() {
  const { role } = useAuth()
  // Only admins place orders from this page (on behalf of a chosen
  // customer). Customers order through their cart, always for themselves.
  const isAdmin = role === 'ADMIN'
  // Status changes belong to the seller fulfilling the order (or an admin).
  // Customers only track the status — the API rejects their changes too.
  const canEditStatus = role === 'SELLER' || role === 'ADMIN'
  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customerId, setCustomerId] = useState<number>(0)
  const [rows, setRows] = useState<ItemRow[]>([{ productId: 0, quantity: 1 }])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      const [orderPage, customerPage, productPage] = await Promise.all([
        listOrders(),
        listCustomers(),
        listProducts(),
      ])
      setOrders(orderPage.content)
      setCustomers(customerPage.content)
      setProducts(productPage.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  function customerName(id: number | null): string {
    if (id == null) return '—'
    return customers.find((c) => c.id === id)?.name ?? `#${id}`
  }

  function productName(id: number): string {
    return products.find((p) => p.id === id)?.name ?? `#${id}`
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const items: OrderItem[] = rows
      .filter((row) => row.productId > 0 && row.quantity > 0)
      .map((row) => ({
        id: null,
        productId: row.productId,
        quantity: row.quantity,
        priceAtPurchase: null,
      }))
    if (!customerId) {
      setError('Choose a customer first.')
      return
    }
    if (items.length === 0) {
      setError('Add at least one item with a product and quantity.')
      return
    }
    try {
      await createOrder({
        id: null,
        customerId,
        placedById: null,
        placedByUsername: null,
        status: null,
        orderDate: null,
        items,
      })
      setRows([{ productId: 0, quantity: 1 }])
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order.')
    }
  }

  async function handleStatus(order: Order, status: string) {
    if (!order.id) return
    setError(null)
    try {
      await updateOrderStatus(order.id, status)
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update status.',
      )
    }
  }

  return (
    <section>
      <h2>{role === 'SELLER' ? 'Incoming Orders' : 'Orders'}</h2>
      {role === 'SELLER' && (
        <p className="muted">
          Orders containing your products — you only see your own items in
          each order.
        </p>
      )}
      {role === 'CUSTOMER' && (
        <p className="muted">
          Your orders. New orders come from your cart and are always placed
          for your own account — there is no ordering for someone else.
        </p>
      )}
      {isAdmin && (
      <form className="panel" onSubmit={handleCreate}>
        <div className="form-grid">
          <label>
            Customer
            <select
              value={customerId}
              onChange={(e) => setCustomerId(Number(e.target.value))}
            >
              <option value={0}>Select a customer…</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id ?? 0}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {rows.map((row, index) => (
          <div className="form-grid" key={index}>
            <label>
              Product
              <select
                value={row.productId}
                onChange={(e) => {
                  const next = [...rows]
                  next[index] = {
                    ...row,
                    productId: Number(e.target.value),
                  }
                  setRows(next)
                }}
              >
                <option value={0}>Select a product…</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id ?? 0}>
                    {product.name} (stock: {product.stockQuantity})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantity
              <input
                type="number"
                min="1"
                value={row.quantity}
                onChange={(e) => {
                  const next = [...rows]
                  next[index] = {
                    ...row,
                    quantity: Number(e.target.value),
                  }
                  setRows(next)
                }}
              />
            </label>
            <div className="row">
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setRows(rows.filter((_, i) => i !== index))
                }
                disabled={rows.length === 1}
              >
                Remove item
              </button>
            </div>
          </div>
        ))}
        <div className="row">
          <button
            type="button"
            className="secondary"
            onClick={() => setRows([...rows, { productId: 0, quantity: 1 }])}
          >
            + Add item
          </button>
          <button type="submit">Create order</button>
        </div>
      </form>
      )}

      {error && <div className="error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Buyer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{customerName(order.customerId)}</td>
                <td>{order.placedByUsername ?? '—'}</td>
                <td>
                  {order.orderDate
                    ? new Date(order.orderDate).toLocaleString()
                    : ''}
                </td>
                <td>
                  {order.items.map((item) => (
                    <div key={item.id ?? item.productId}>
                      {productName(item.productId)} × {item.quantity} @ $
                      {(item.priceAtPurchase ?? 0).toFixed(2)}
                    </div>
                  ))}
                </td>
                <td>${orderTotal(order).toFixed(2)}</td>
                <td className="status-cell">
                  <span
                    className={`badge badge-${(order.status ?? 'PENDING').toLowerCase()}`}
                  >
                    {order.status ?? 'PENDING'}
                  </span>
                  {canEditStatus && (
                    <select
                      value={order.status ?? 'PENDING'}
                      disabled={
                        order.status === 'DELIVERED' ||
                        order.status === 'CANCELLED'
                      }
                      onChange={(e) =>
                        void handleStatus(order, e.target.value)
                      }
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      {role !== 'CUSTOMER' && (
        <p className="muted">
          Status cannot change once an order is DELIVERED or CANCELLED — the
          API rejects it.
        </p>
      )}
    </section>
  )
}

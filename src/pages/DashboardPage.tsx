import { useEffect, useMemo, useState } from 'react'
import { listOrders, listProducts } from '../api/client'
import { ORDER_STATUSES, type Order, type Product } from '../api/types'
import { useAuth } from '../auth/AuthContext'

/** Matches the low-stock threshold used on the Products page. */
const LOW_STOCK = 15

/**
 * Seller/admin overview, computed from the orders and products the API
 * already returns for this account: a seller sees only their own orders
 * (with items trimmed to their products), an admin sees everything.
 */
export default function DashboardPage() {
  const { role } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [orderPage, productPage] = await Promise.all([
          listOrders(),
          listProducts(),
        ])
        setOrders(orderPage.content)
        setProducts(productPage.content)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load dashboard.',
        )
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== 'CANCELLED')
    const revenue = active.reduce(
      (sum, order) =>
        sum +
        order.items.reduce(
          (s, item) => s + (item.priceAtPurchase ?? 0) * item.quantity,
          0,
        ),
      0,
    )
    const byStatus = new Map(ORDER_STATUSES.map((s) => [s, 0]))
    for (const order of orders) {
      if (order.status) {
        byStatus.set(order.status, (byStatus.get(order.status) ?? 0) + 1)
      }
    }
    const soldByProduct = new Map<number, number>()
    for (const order of active) {
      for (const item of order.items) {
        soldByProduct.set(
          item.productId,
          (soldByProduct.get(item.productId) ?? 0) + item.quantity,
        )
      }
    }
    const nameOf = (id: number) =>
      products.find((p) => p.id === id)?.name ?? `Product #${id}`
    const topProducts = [...soldByProduct.entries()]
      .map(([id, qty]) => ({ id, name: nameOf(id), qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
    const lowStock = products
      .filter((p) => p.stockQuantity <= LOW_STOCK)
      .sort((a, b) => a.stockQuantity - b.stockQuantity)
    return { revenue, byStatus, topProducts, lowStock }
  }, [orders, products])

  return (
    <section>
      <h2>
        {role === 'ADMIN' ? 'Dashboard — all sellers' : 'Dashboard — my store'}
      </h2>
      {error && <div className="error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-label">Revenue (excl. cancelled)</span>
              <span className="stat-value">${stats.revenue.toFixed(2)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total orders</span>
              <span className="stat-value">{orders.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Products</span>
              <span className="stat-value">{products.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Low-stock products</span>
              <span className="stat-value">{stats.lowStock.length}</span>
            </div>
          </div>

          <h3>Orders by status</h3>
          <div className="status-row">
            {ORDER_STATUSES.map((status) => (
              <span
                key={status}
                className={`badge badge-${status.toLowerCase()}`}
              >
                {status}: {stats.byStatus.get(status) ?? 0}
              </span>
            ))}
          </div>

          <div className="dash-columns">
            <div>
              <h3>Top-selling products</h3>
              {stats.topProducts.length === 0 ? (
                <p className="muted">No sales yet.</p>
              ) : (
                <ol className="top-list">
                  {stats.topProducts.map((p) => (
                    <li key={p.id}>
                      <span>{p.name}</span>
                      <span className="muted">{p.qty} sold</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div>
              <h3>Low stock</h3>
              {stats.lowStock.length === 0 ? (
                <p className="muted">Nothing running low.</p>
              ) : (
                <ul className="top-list">
                  {stats.lowStock.map((p) => (
                    <li key={p.id}>
                      <span>{p.name}</span>
                      <span
                        className={
                          p.stockQuantity === 0
                            ? 'badge badge-cancelled'
                            : 'badge badge-low'
                        }
                      >
                        {p.stockQuantity === 0
                          ? 'Out of stock'
                          : `${p.stockQuantity} left`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

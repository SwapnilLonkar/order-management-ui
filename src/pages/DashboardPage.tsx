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
    // Revenue per day over the last 14 days (non-cancelled orders).
    const revenueOf = (order: Order) =>
      order.items.reduce(
        (s, item) => s + (item.priceAtPurchase ?? 0) * item.quantity,
        0,
      )
    const byDay = new Map<string, number>()
    for (const order of active) {
      if (!order.orderDate) continue
      const d = new Date(order.orderDate)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      byDay.set(key, (byDay.get(key) ?? 0) + revenueOf(order))
    }
    const now = new Date()
    const revenueByDay = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - i))
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      return {
        key,
        label: `${d.toLocaleDateString(undefined, { weekday: 'narrow' })} ${d.getDate()}`,
        revenue: byDay.get(key) ?? 0,
      }
    })
    const maxDayRevenue = Math.max(0, ...revenueByDay.map((d) => d.revenue))
    const maxStatusCount = Math.max(0, ...byStatus.values())
    const maxTopQty = Math.max(0, ...topProducts.map((p) => p.qty))
    return {
      revenue,
      byStatus,
      topProducts,
      lowStock,
      revenueByDay,
      maxDayRevenue,
      maxStatusCount,
      maxTopQty,
    }
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
              <span className="stat-label">💰 Revenue (excl. cancelled)</span>
              <span className="stat-value">${stats.revenue.toFixed(2)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">🧾 Total orders</span>
              <span className="stat-value">{orders.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">📦 Products</span>
              <span className="stat-value">{products.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">⚠️ Low-stock products</span>
              <span className="stat-value">{stats.lowStock.length}</span>
            </div>
          </div>

          <h3>Revenue — last 14 days</h3>
          <div
            className="chart-bars"
            role="img"
            aria-label="Revenue per day for the last 14 days"
          >
            {stats.revenueByDay.map((day) => (
              <div
                className="chart-col"
                key={day.key}
                title={`${day.label}: $${day.revenue.toFixed(2)}`}
              >
                <div className="chart-track">
                  <div
                    className="chart-bar"
                    style={{
                      height: `${
                        stats.maxDayRevenue > 0
                          ? Math.max(3, (day.revenue / stats.maxDayRevenue) * 100)
                          : 3
                      }%`,
                    }}
                  />
                </div>
                <span className="chart-x">{day.label}</span>
              </div>
            ))}
          </div>

          <h3>Orders by status</h3>
          <div className="hbars">
            {ORDER_STATUSES.map((status) => {
              const count = stats.byStatus.get(status) ?? 0
              return (
                <div className="hbar-row" key={status}>
                  <span className="hbar-label">{status}</span>
                  <div className="hbar-track">
                    <div
                      className={`hbar-fill fill-${status.toLowerCase()}`}
                      style={{
                        width: `${
                          stats.maxStatusCount > 0
                            ? (count / stats.maxStatusCount) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="hbar-count">{count}</span>
                </div>
              )
            })}
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
                      <span className="top-bar">
                        <span
                          className="top-bar-fill"
                          style={{
                            width: `${
                              stats.maxTopQty > 0
                                ? (p.qty / stats.maxTopQty) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </span>
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

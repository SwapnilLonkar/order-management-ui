import { useState } from 'react'
import { createOrder } from '../api/client'
import { useCart } from '../cart/CartContext'

export default function CartPage({
  onGoToOrders,
}: {
  onGoToOrders: () => void
}) {
  const { items, total, setQuantity, remove, clear } = useCart()
  const [error, setError] = useState<string | null>(null)
  const [placedOrderId, setPlacedOrderId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleCheckout() {
    setError(null)
    setBusy(true)
    try {
      // No customerId is sent: the backend always places a CUSTOMER
      // account's order on that account's own customer record.
      const order = await createOrder({
        id: null,
        customerId: null,
        placedById: null,
        placedByUsername: null,
        status: null,
        orderDate: null,
        items: items.map((item) => ({
          id: null,
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: null,
        })),
      })
      clear()
      setPlacedOrderId(order.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setBusy(false)
    }
  }

  if (placedOrderId !== null) {
    return (
      <section>
        <h2>Cart</h2>
        <div className="panel">
          <p>
            Order <strong>#{placedOrderId}</strong> placed — it's on your
            account, under your own customer record.
          </p>
          <button onClick={onGoToOrders}>View my orders</button>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2>Cart</h2>
      {error && <div className="error">{error}</div>}
      {items.length === 0 ? (
        <p className="muted">
          Your cart is empty — add products from the Products page.
        </p>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Line total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.productId}>
                  <td>
                    <div className="cell-with-thumb">
                      {item.imageUrl ? (
                        <img
                          className="thumb-sm"
                          src={item.imageUrl}
                          alt=""
                        />
                      ) : (
                        <span className="thumb-sm thumb-fallback">🛍️</span>
                      )}
                      <span>{item.name}</span>
                    </div>
                  </td>
                  <td>${item.price.toFixed(2)}</td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      max={item.stock > 0 ? item.stock : undefined}
                      value={item.quantity}
                      onChange={(e) =>
                        setQuantity(
                          item.productId,
                          parseInt(e.target.value, 10) || 0,
                        )
                      }
                      style={{ width: '4.5rem' }}
                    />
                    {item.stock > 0 && item.quantity >= item.stock && (
                      <div className="muted">Only {item.stock} available</div>
                    )}
                  </td>
                  <td>${(item.price * item.quantity).toFixed(2)}</td>
                  <td>
                    <button
                      className="danger"
                      onClick={() => remove(item.productId)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row" style={{ marginTop: '1rem' }}>
            <strong>Total: ${total.toFixed(2)}</strong>
            <button onClick={() => void handleCheckout()} disabled={busy}>
              {busy ? 'Placing order…' : 'Place order'}
            </button>
            <button className="secondary" onClick={clear} disabled={busy}>
              Clear cart
            </button>
          </div>
          <p className="muted">
            Orders are placed for your own account — there's no choosing a
            different customer.
          </p>
        </>
      )}
    </section>
  )
}

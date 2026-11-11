import { useEffect, useState, type FormEvent } from 'react'
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from '../api/client'
import type { Product } from '../api/types'

const EMPTY: Product = {
  id: null,
  name: '',
  description: '',
  price: 0,
  stockQuantity: 0,
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState<Product>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      const page = await listProducts()
      setProducts(page.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      if (form.id) {
        await updateProduct(form.id, form)
      } else {
        await createProduct(form)
      }
      setForm(EMPTY)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product.')
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this product?')) return
    setError(null)
    try {
      await deleteProduct(id)
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to delete product. Note: deleting requires an ADMIN account.',
      )
    }
  }

  return (
    <section>
      <h2>Products</h2>
      <form className="panel" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label>
            Description
            <input
              value={form.description ?? ''}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <label>
            Price
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) =>
                setForm({ ...form, price: Number(e.target.value) })
              }
              required
            />
          </label>
          <label>
            Stock quantity
            <input
              type="number"
              min="0"
              value={form.stockQuantity}
              onChange={(e) =>
                setForm({ ...form, stockQuantity: Number(e.target.value) })
              }
              required
            />
          </label>
        </div>
        <div className="row">
          <button type="submit">
            {form.id ? 'Update product' : 'Add product'}
          </button>
          {form.id && (
            <button
              type="button"
              className="secondary"
              onClick={() => setForm(EMPTY)}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      {error && <div className="error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Description</th>
              <th>Price</th>
              <th>Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.id}</td>
                <td>{product.name}</td>
                <td>{product.description}</td>
                <td>${product.price.toFixed(2)}</td>
                <td>{product.stockQuantity}</td>
                <td className="row">
                  <button
                    className="secondary"
                    onClick={() => setForm(product)}
                  >
                    Edit
                  </button>
                  <button
                    className="danger"
                    onClick={() => product.id && void handleDelete(product.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      <p className="muted">Deleting a product requires an ADMIN account.</p>
    </section>
  )
}

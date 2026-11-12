import { useEffect, useState, type FormEvent } from 'react'
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from '../api/client'
import type { Product } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'

const EMPTY: Product = {
  id: null,
  name: '',
  description: '',
  imageUrl: null,
  price: 0,
  stockQuantity: 0,
  sellerId: null,
  sellerUsername: null,
}

/** At or below this stock level a product gets an "Only X left" badge. */
const LOW_STOCK = 15

function ProductImage({
  product,
  variant,
}: {
  product: Product
  variant: 'card' | 'thumb'
}) {
  const [failed, setFailed] = useState(false)
  const className = variant === 'card' ? 'product-img' : 'thumb'
  if (!product.imageUrl || failed) {
    return (
      <div className={`${className} fallback`} aria-hidden="true">
        🛍️
      </div>
    )
  }
  return (
    <img
      className={className}
      src={product.imageUrl}
      alt={product.name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

export default function ProductsPage() {
  const { role } = useAuth()
  const { add, items, setQuantity } = useCart()
  const canManage = role === 'SELLER' || role === 'ADMIN'
  const canDelete = role === 'ADMIN'
  const canShop = role === 'CUSTOMER'
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sort, setSort] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>(
    'featured',
  )
  const [form, setForm] = useState<Product>(EMPTY)
  const [editorOpen, setEditorOpen] = useState(false)
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

  const visible = products
    .filter((p) =>
      p.name.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .filter((p) => !inStockOnly || p.stockQuantity > 0)
    .sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return a.price - b.price
        case 'price-desc':
          return b.price - a.price
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

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
      setEditorOpen(false)
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
      <h2>{role === 'SELLER' ? 'My Products' : 'Products'}</h2>
      {canManage && (
        <div className="row" style={{ marginBottom: '1rem' }}>
          <button
            onClick={() => {
              setForm(EMPTY)
              setError(null)
              setEditorOpen(true)
            }}
          >
            Add product
          </button>
        </div>
      )}
      {canManage && editorOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setEditorOpen(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{form.id ? 'Edit product' : 'Add product'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>
                  Name
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
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
                  Image URL
                  <input
                    value={form.imageUrl ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, imageUrl: e.target.value })
                    }
                    placeholder="https://…"
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
                      setForm({
                        ...form,
                        stockQuantity: Number(e.target.value),
                      })
                    }
                    required
                  />
                </label>
              </div>
              {error && <div className="error">{error}</div>}
              <div className="row">
                <button type="submit">
                  {form.id ? 'Update product' : 'Add product'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setEditorOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="Search products…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          aria-label="Sort products"
        >
          <option value="featured">Sort: Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="name">Name: A to Z</option>
        </select>
        <label className="check">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
          />
          In stock only
        </label>
      </div>

      {error && !editorOpen && <div className="error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : role === 'CUSTOMER' ? (
        <div className="product-grid">
          {visible.map((product) => {
            const cartItem = items.find(
              (item) => item.productId === product.id,
            )
            return (
              <div
                className={
                  product.stockQuantity === 0
                    ? 'product-card out-of-stock'
                    : 'product-card'
                }
                key={product.id}
              >
                <ProductImage product={product} variant="card" />
                <div className="product-card-top">
                  <h3>{product.name}</h3>
                  <span className="price">${product.price.toFixed(2)}</span>
                </div>
                <p className="muted product-desc">{product.description}</p>
                <div className="product-meta">
                  {product.stockQuantity === 0 ? (
                    <span className="stock out">Out of stock</span>
                  ) : product.stockQuantity <= LOW_STOCK ? (
                    <span className="badge badge-low">
                      Only {product.stockQuantity} left
                    </span>
                  ) : (
                    <span className="stock">
                      {product.stockQuantity} in stock
                    </span>
                  )}
                  <span className="muted">
                    Seller: {product.sellerUsername ?? '—'}
                  </span>
                </div>
                <div className="product-action">
                  {cartItem ? (
                    <div className="stepper">
                      <button
                        className="secondary"
                        onClick={() =>
                          setQuantity(cartItem.productId, cartItem.quantity - 1)
                        }
                      >
                        −
                      </button>
                      <span className="qty">{cartItem.quantity}</span>
                      <button
                        className="secondary"
                        disabled={cartItem.quantity >= product.stockQuantity}
                        onClick={() =>
                          setQuantity(cartItem.productId, cartItem.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      className="add-btn"
                      disabled={product.stockQuantity === 0}
                      onClick={() => add(product)}
                    >
                      {product.stockQuantity === 0
                        ? 'Out of stock'
                        : 'Add to cart'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {visible.length === 0 && (
            <p className="muted">
              {products.length === 0
                ? 'No products yet.'
                : 'No products match your search.'}
            </p>
          )}
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th></th>
              <th>Name</th>
              <th>Description</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Seller</th>
              {canManage && <th></th>}
              {canShop && <th></th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((product) => {
              const cartItem = items.find(
                (item) => item.productId === product.id,
              )
              return (
              <tr key={product.id}>
                <td>{product.id}</td>
                <td>
                  <ProductImage product={product} variant="thumb" />
                </td>
                <td>{product.name}</td>
                <td>{product.description}</td>
                <td>${product.price.toFixed(2)}</td>
                <td>
                  {product.stockQuantity}
                  {product.stockQuantity === 0 ? (
                    <span
                      className="badge badge-cancelled"
                      style={{ marginLeft: '0.4rem' }}
                    >
                      Out
                    </span>
                  ) : product.stockQuantity <= LOW_STOCK ? (
                    <span
                      className="badge badge-low"
                      style={{ marginLeft: '0.4rem' }}
                    >
                      Low stock
                    </span>
                  ) : null}
                </td>
                <td>{product.sellerUsername ?? '—'}</td>
                {canManage && (
                  <td className="row">
                    <button
                      className="secondary"
                      onClick={() => {
                        setForm(product)
                        setError(null)
                        setEditorOpen(true)
                      }}
                    >
                      Edit
                    </button>
                    {canDelete && (
                      <button
                        className="danger"
                        onClick={() =>
                          product.id && void handleDelete(product.id)
                        }
                      >
                        Delete
                      </button>
                    )}
                  </td>
                )}
                {canShop && (
                  <td>
                    {cartItem ? (
                      <div className="stepper">
                        <button
                          className="secondary"
                          onClick={() =>
                            setQuantity(
                              cartItem.productId,
                              cartItem.quantity - 1,
                            )
                          }
                        >
                          −
                        </button>
                        <span className="qty">{cartItem.quantity}</span>
                        <button
                          className="secondary"
                          disabled={
                            cartItem.quantity >= product.stockQuantity
                          }
                          onClick={() =>
                            setQuantity(
                              cartItem.productId,
                              cartItem.quantity + 1,
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        disabled={product.stockQuantity === 0}
                        onClick={() => add(product)}
                      >
                        {product.stockQuantity === 0
                          ? 'Out of stock'
                          : 'Add to cart'}
                      </button>
                    )}
                  </td>
                )}
              </tr>
              )
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="muted">
                  {products.length === 0
                    ? 'No products yet.'
                    : 'No products match your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      {role === 'ADMIN' && (
        <p className="muted">Admins see every seller's products.</p>
      )}
    </section>
  )
}

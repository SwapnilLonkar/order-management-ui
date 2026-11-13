import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
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
  imageUrls: [],
  price: 0,
  stockQuantity: 0,
  sellerId: null,
  sellerUsername: null,
}

/** A product's gallery: imageUrls when present, else its single photo. */
function galleryOf(product: Product): string[] {
  if (product.imageUrls && product.imageUrls.length > 0) {
    return product.imageUrls
  }
  return product.imageUrl ? [product.imageUrl] : []
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

/** Quick-look pop-up: full gallery + details without leaving the grid. */
function QuickViewModal({
  product,
  onClose,
}: {
  product: Product
  onClose: () => void
}) {
  const { role } = useAuth()
  const { add, items, setQuantity } = useCart()
  const gallery = galleryOf(product)
  const [active, setActive] = useState(0)
  const [failed, setFailed] = useState<ReadonlySet<number>>(new Set())
  const cartItem = items.find((item) => item.productId === product.id)
  const mainFailed = failed.has(active) || gallery.length === 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal qv-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Quick view of ${product.name}`}
      >
        <div className="qv-layout">
          <div className="qv-gallery">
            {mainFailed ? (
              <div className="qv-main fallback" aria-hidden="true">
                🛍️
              </div>
            ) : (
              <img
                className="qv-main"
                src={gallery[active]}
                alt={product.name}
                onError={() =>
                  setFailed((prev) => new Set(prev).add(active))
                }
              />
            )}
            {gallery.length > 1 && (
              <div className="qv-thumbs">
                {gallery.map((url, index) => (
                  <button
                    key={`${index}-${url.slice(0, 24)}`}
                    type="button"
                    className={
                      index === active ? 'qv-thumb active' : 'qv-thumb'
                    }
                    onClick={() => setActive(index)}
                    aria-label={`Photo ${index + 1}`}
                  >
                    <img src={url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="qv-details">
            <h3>{product.name}</h3>
            <span className="price">${product.price.toFixed(2)}</span>
            <p className="product-desc">{product.description}</p>
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
            {role === 'CUSTOMER' && (
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
            )}
            <button type="button" className="secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
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
  const [newImageUrl, setNewImageUrl] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [quickView, setQuickView] = useState<Product | null>(null)
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

  /** Appends a photo to the form's gallery (first photo is the cover). */
  function appendImage(url: string) {
    setForm((f) => {
      const gallery = galleryOf(f)
      if (!url || gallery.includes(url)) return f
      const next = [...gallery, url]
      return { ...f, imageUrls: next, imageUrl: next[0] }
    })
  }

  function removeImage(index: number) {
    setForm((f) => {
      const next = galleryOf(f).filter((_, i) => i !== index)
      return { ...f, imageUrls: next, imageUrl: next[0] ?? null }
    })
  }

  function addImageUrl() {
    const url = newImageUrl.trim()
    if (!url) return
    appendImage(url)
    setNewImageUrl('')
  }

  /**
   * Reads a picked image file and appends it to the form's gallery as a
   * data URL. Photos larger than 1000px are downscaled on a canvas first
   * so the stored value stays small.
   */
  function handleImageFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onload = () => {
        const max = 1000
        if (img.width <= max && img.height <= max) {
          appendImage(dataUrl)
          return
        }
        const scale = max / Math.max(img.width, img.height)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
        appendImage(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const gallery = galleryOf(form)
      const payload: Product = {
        ...form,
        imageUrls: gallery,
        imageUrl: gallery[0] ?? null,
      }
      if (form.id) {
        await updateProduct(form.id, payload)
      } else {
        await createProduct(payload)
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
              setNewImageUrl('')
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
                <div className="gallery-editor">
                  <span className="gallery-label">
                    Photos — the first is the cover
                  </span>
                  {galleryOf(form).length > 0 && (
                    <div className="gallery-list">
                      {galleryOf(form).map((url, index) => (
                        <div className="gallery-item" key={`${index}-${url.slice(0, 24)}`}>
                          <img src={url} alt={`Photo ${index + 1}`} />
                          {index === 0 && (
                            <span className="cover-tag">Cover</span>
                          )}
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => removeImage(index)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="row">
                    <input
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="Paste a photo URL…"
                      aria-label="Photo URL"
                    />
                    <button
                      type="button"
                      className="secondary"
                      onClick={addImageUrl}
                    >
                      Add photo
                    </button>
                  </div>
                  <label>
                    Upload image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFile}
                    />
                  </label>
                </div>
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
                <div
                  className="qv-open"
                  onClick={() => setQuickView(product)}
                  title="Quick view"
                >
                  <ProductImage product={product} variant="card" />
                </div>
                <div className="product-card-top">
                  <h3
                    className="qv-open"
                    onClick={() => setQuickView(product)}
                    title="Quick view"
                  >
                    {product.name}
                  </h3>
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
                <td
                  className="qv-open"
                  onClick={() => setQuickView(product)}
                  title="Quick view"
                >
                  {product.name}
                </td>
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
                        setForm({
                          ...product,
                          imageUrls: galleryOf(product),
                        })
                        setNewImageUrl('')
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
      {quickView && (
        <QuickViewModal
          product={quickView}
          onClose={() => setQuickView(null)}
        />
      )}
    </section>
  )
}

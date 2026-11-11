import { useEffect, useState, type FormEvent } from 'react'
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
} from '../api/client'
import type { Customer } from '../api/types'

const EMPTY: Customer = { id: null, name: '', email: '', phone: '' }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [form, setForm] = useState<Customer>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      const page = await listCustomers()
      setCustomers(page.content)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load customers.',
      )
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
        await updateCustomer(form.id, form)
      } else {
        await createCustomer(form)
      }
      setForm(EMPTY)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer.')
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this customer?')) return
    setError(null)
    try {
      await deleteCustomer(id)
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to delete customer. Note: deleting requires an ADMIN account.',
      )
    }
  }

  return (
    <section>
      <h2>Customers</h2>
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
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label>
            Phone
            <input
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
        </div>
        <div className="row">
          <button type="submit">
            {form.id ? 'Update customer' : 'Add customer'}
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
              <th>Email</th>
              <th>Phone</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.id}</td>
                <td>{customer.name}</td>
                <td>{customer.email}</td>
                <td>{customer.phone}</td>
                <td className="row">
                  <button
                    className="secondary"
                    onClick={() => setForm(customer)}
                  >
                    Edit
                  </button>
                  <button
                    className="danger"
                    onClick={() =>
                      customer.id && void handleDelete(customer.id)
                    }
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  )
}

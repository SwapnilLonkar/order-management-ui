import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import AuthPage from './pages/AuthPage'
import CustomersPage from './pages/CustomersPage'
import OrdersPage from './pages/OrdersPage'
import ProductsPage from './pages/ProductsPage'

type Tab = 'products' | 'customers' | 'orders'

function Shell() {
  const { username, role, logout } = useAuth()
  const [tab, setTab] = useState<Tab>('products')

  // Every login starts on Products. Without this, the previous user's tab
  // would carry over — e.g. a customer logging in after a seller would land
  // on the Customers page even though their nav hides it.
  useEffect(() => {
    setTab('products')
  }, [username])

  if (!username) {
    return <AuthPage />
  }

  // Customers (the recipient directory) is a back-office view for sellers and admins.
  const showCustomers = role !== 'CUSTOMER'

  return (
    <div className="layout">
      <header>
        <span className="brand">Order Management</span>
        <nav>
          <button
            className={tab === 'products' ? 'nav active' : 'nav'}
            onClick={() => setTab('products')}
          >
            Products
          </button>
          {showCustomers && (
            <button
              className={tab === 'customers' ? 'nav active' : 'nav'}
              onClick={() => setTab('customers')}
            >
              Customers
            </button>
          )}
          <button
            className={tab === 'orders' ? 'nav active' : 'nav'}
            onClick={() => setTab('orders')}
          >
            Orders
          </button>
        </nav>
        <span className="user">
          {username}
          {role ? ` (${role})` : ''}
          <button className="secondary" onClick={logout}>
            Log out
          </button>
        </span>
      </header>
      <main>
        {tab === 'products' && <ProductsPage />}
        {tab === 'customers' && showCustomers && <CustomersPage />}
        {tab === 'orders' && <OrdersPage />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}

import { useState } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import AuthPage from './pages/AuthPage'
import CustomersPage from './pages/CustomersPage'
import OrdersPage from './pages/OrdersPage'
import ProductsPage from './pages/ProductsPage'

type Tab = 'products' | 'customers' | 'orders'

function Shell() {
  const { username, role, logout } = useAuth()
  const [tab, setTab] = useState<Tab>('products')

  if (!username) {
    return <AuthPage />
  }

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
          <button
            className={tab === 'customers' ? 'nav active' : 'nav'}
            onClick={() => setTab('customers')}
          >
            Customers
          </button>
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
        {tab === 'customers' && <CustomersPage />}
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

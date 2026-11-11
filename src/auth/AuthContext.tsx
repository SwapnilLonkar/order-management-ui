import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  decodeToken,
  getToken,
  login as apiLogin,
  register as apiRegister,
  setToken,
} from '../api/client'
import type { Role } from '../api/types'

interface AuthState {
  username: string | null
  role: string | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, role: Role) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [claims, setClaims] = useState(() => {
    const token = getToken()
    return token ? decodeToken(token) : null
  })

  const applyToken = useCallback((token: string) => {
    setToken(token)
    setClaims(decodeToken(token))
  }, [])

  const login = useCallback(
    async (username: string, password: string) => {
      const response = await apiLogin(username, password)
      applyToken(response.token)
    },
    [applyToken],
  )

  const register = useCallback(
    async (username: string, password: string, role: Role) => {
      const response = await apiRegister(username, password, role)
      applyToken(response.token)
    },
    [applyToken],
  )

  const logout = useCallback(() => {
    setToken(null)
    setClaims(null)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      username: claims?.sub ?? null,
      role: claims?.role ?? null,
      login,
      register,
      logout,
    }),
    [claims, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}

import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const setUser = useAuthStore((state) => state.setUser)

  useEffect(() => {
    // 检查 localStorage 中的 token
    const token = localStorage.getItem('auth_token')

    if (token && !isAuthenticated) {
      // TODO: 可以验证 token 是否有效
      // 暂时假设 token 有效，从 localStorage 恢复用户信息
      const savedUser = localStorage.getItem('auth_user')
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser))
        } catch {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
        }
      }
    }
  }, [isAuthenticated, setUser])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

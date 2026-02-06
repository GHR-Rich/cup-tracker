import { createContext, useState, useContext, useEffect } from 'react'
import toast from 'react-hot-toast'

console.log('AuthContext loaded!') // ADD THIS LINE

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Investigation state
  const [investigations, setInvestigations] = useState([])
  const [selectedInvestigationId, setSelectedInvestigationId] = useState(null)
  const [investigationsLoading, setInvestigationsLoading] = useState(false)

  // Check for stored token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    const storedInvestigationId = localStorage.getItem('selectedInvestigationId')

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
      if (storedInvestigationId) {
        setSelectedInvestigationId(parseInt(storedInvestigationId))
      }
    }
    setLoading(false)
  }, [])

  // Fetch investigations when user logs in
  useEffect(() => {
    if (user && token) {
      fetchInvestigations()
    }
  }, [user, token])

  const fetchInvestigations = async () => {
    if (!token) return
    
    setInvestigationsLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/investigations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setInvestigations(data)
        
        // Auto-select first investigation if none selected
        if (data.length > 0 && !selectedInvestigationId) {
          selectInvestigation(data[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch investigations:', error)
    } finally {
      setInvestigationsLoading(false)
    }
  }

  const selectInvestigation = (investigationId) => {
    setSelectedInvestigationId(investigationId)
    localStorage.setItem('selectedInvestigationId', investigationId.toString())
  }

  const login = async (email, password) => {
    try {
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Login failed')
      }

      const data = await response.json()

      // Store token and user
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setToken(data.access_token)
      setUser(data.user)

      toast.success(`Welcome back, ${data.user.full_name || data.user.email}!`)
      return data
    } catch (error) {
      toast.error(error.message)
      throw error
    }
  }

  const register = async (email, password, full_name, role = 'contributor') => {
    try {
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, full_name, role }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Registration failed')
      }

      const data = await response.json()

      // Store token and user
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setToken(data.access_token)
      setUser(data.user)

      toast.success(`Welcome, ${data.user.full_name || data.user.email}!`)
      return data
    } catch (error) {
      toast.error(error.message)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('selectedInvestigationId')
    setToken(null)
    setUser(null)
    setSelectedInvestigationId(null)
    setInvestigations([])
    toast.success('Logged out successfully')
  }

  const isAdmin = () => {
    return user?.role === 'admin'
  }

  const isContributor = () => {
    return user?.role === 'contributor'
  }

  const selectedInvestigation = investigations.find(
    inv => inv.id === selectedInvestigationId
  )

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAdmin,
    isContributor,
    isAuthenticated: !!token,
    // Investigation management
    investigations,
    investigationsLoading,
    selectedInvestigationId,
    selectedInvestigation,
    selectInvestigation,
    fetchInvestigations,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}


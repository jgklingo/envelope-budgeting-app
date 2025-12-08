import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Envelopes from './pages/Envelopes'
import Transactions from './pages/Transactions'
import Settings from './pages/Settings'
import Categorization from './pages/Categorization'
import Tutorial from './pages/Tutorial'
import Navbar from './components/Navbar'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  }, [token])

  const handleLogout = () => {
    setToken(null)
    localStorage.removeItem('token')
  }

  if (!token) {
    return (
      <Router>
        <Routes>
          <Route path="/register" element={<Register setToken={setToken} />} />
          <Route path="/login" element={<Login setToken={setToken} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    )
  }

  return (
    <Router>
      <Navbar onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Dashboard token={token} />} />
        <Route path="/envelopes" element={<Envelopes token={token} />} />
        <Route path="/transactions" element={<Transactions token={token} />} />
        <Route path="/categorization" element={<Categorization token={token} />} />
        <Route path="/settings" element={<Settings token={token} />} />
        <Route path="/tutorial" element={<Tutorial />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App

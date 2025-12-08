import { NavLink } from 'react-router-dom'

function Navbar({ onLogout }) {
  return (
    <nav className="nav">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <ul className="nav-links">
            <li><NavLink to="/">Dashboard</NavLink></li>
            <li><NavLink to="/envelopes">Envelopes</NavLink></li>
            <li><NavLink to="/transactions">Transactions</NavLink></li>
            <li><NavLink to="/settings">Settings</NavLink></li>
            <li><NavLink to="/tutorial">Tutorial</NavLink></li>
          </ul>
          <button onClick={onLogout} className="btn btn-secondary">Logout</button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

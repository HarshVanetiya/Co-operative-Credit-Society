import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Users, LogOut, LayoutDashboard, History, CircleDollarSign, FileText } from 'lucide-react';

const SidebarItem = ({ to, icon: Icon, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `sidebar-item ${isActive ? 'active' : ''}`
    }
  >
    <Icon size={20} />
    <span className="font-medium">{children}</span>
  </NavLink>
);

const Layout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <LayoutDashboard />
            <span>Bank Portal</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <SidebarItem to="/" icon={Home}>Overview</SidebarItem>
          <SidebarItem to="/members" icon={Users}>Members</SidebarItem>
          <SidebarItem to="/loans" icon={CircleDollarSign}>Loans</SidebarItem>
          <SidebarItem to="/history" icon={History}>History</SidebarItem>
          <SidebarItem to="/activity" icon={FileText}>Activity</SidebarItem>
        </nav>

        <div className="sidebar-footer">
          <div className='user-info'>
            <p className='label'>Logged in as</p>
            <p className='username'>{user?.username || 'Operator'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="logout-btn"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;

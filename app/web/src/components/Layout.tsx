import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="header">
        <Link to="/" className="brand" data-testid="nav-home-link">
          BookIt
        </Link>
        <nav aria-label="Main navigation" className="nav">
          {user ? (
            <>
              <NavLink to="/rooms" data-testid="nav-rooms-link">
                Rooms
              </NavLink>
              <NavLink to="/bookings" data-testid="nav-bookings-link">
                {user.role === 'admin' ? 'All bookings' : 'My bookings'}
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/login" data-testid="nav-login-link">
                Log in
              </NavLink>
              <NavLink to="/register" data-testid="nav-register-link">
                Register
              </NavLink>
            </>
          )}
        </nav>
        {user && (
          <div className="session">
            <span data-testid="current-user" data-role={user.role}>
              {user.name}{' '}
              <span className="role" data-testid="current-user-role">
                {user.role}
              </span>
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleLogout}
              data-testid="logout-button"
            >
              Log out
            </button>
          </div>
        )}
      </header>
      <main className="main">
        <Outlet />
      </main>
    </>
  );
}

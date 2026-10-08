import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { Loading } from './Feedback';

/** Redirige vers /login si non connecté ; affiche un message 403 si `adminOnly` et non admin. */
export function RequireAuth({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (adminOnly && user.role !== 'admin') {
    return (
      <div className="alert alert-error" role="alert" data-testid="forbidden-message">
        You need administrator rights to access this page.
      </div>
    );
  }
  return <>{children}</>;
}

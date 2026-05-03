import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { isAuthenticated } from "../../lib/auth";

type ProtectedRouteProps = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

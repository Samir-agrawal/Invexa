import { ReactNode } from "react";
import { Navigate } from "react-router";
import { isAuthenticated } from "../../lib/auth";

type PublicOnlyRouteProps = {
  children: ReactNode;
};

export default function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

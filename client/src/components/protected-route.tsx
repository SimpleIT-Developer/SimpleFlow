import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { AnimatedLogo } from "./animated-logo";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && (error || !user)) {
      // Clear any stored auth token
      localStorage.removeItem("authToken");
      setLocation("/login");
    }
  }, [user, isLoading, error, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <AnimatedLogo size="lg" showPulse className="mb-4" />
          <p className="text-white/80">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return null;
  }

  return <>{children}</>;
}

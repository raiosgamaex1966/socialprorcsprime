import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSetupCheck } from "@/hooks/useSetupCheck";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "moderator";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { isSetupComplete, loading: setupLoading } = useSetupCheck();

  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (!data || data.length === 0) return "user";
      if (data.some((r: any) => r.role === "admin")) return "admin";
      if (data.some((r: any) => r.role === "moderator")) return "moderator";
      return "user";
    },
    enabled: !!user,
    staleTime: 300000,
  });

  // No fullscreen spinner here — the index.html splash screen covers initial loading.
  if (loading || setupLoading || (user && roleLoading)) {
    return null;
  }

  // Redirect to setup if no admin exists yet
  if (isSetupComplete === false) {
    return <Navigate to="/setup" replace />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole === "admin" && userRole !== "admin") {
    return <Navigate to="/" replace />;
  }

  if (requiredRole === "moderator" && userRole !== "admin" && userRole !== "moderator") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

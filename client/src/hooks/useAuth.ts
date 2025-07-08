import { useQuery } from "@tanstack/react-query";
import { useAdminSession } from "./useAdminSession";

export function useAuth() {
  const { data: response, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const { user: adminUser, isAuthenticated: isAdminAuth, isLoading: isAdminLoading } = useAdminSession();

  // Always call hooks in the same order
  // Prefer admin authentication if available, otherwise use regular auth
  return {
    user: (isAdminAuth && adminUser) ? adminUser : response?.user,
    isLoading: isAdminLoading || isLoading,
    isAuthenticated: isAdminAuth || (response?.authenticated === true),
  };
}

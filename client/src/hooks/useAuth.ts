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
  const finalUser = (isAdminAuth && adminUser) ? adminUser : response?.user;
  const finalIsAuthenticated = isAdminAuth || (response?.authenticated === true);
  const finalIsLoading = isAdminLoading || isLoading;

  return {
    user: finalUser,
    isLoading: finalIsLoading,
    isAuthenticated: finalIsAuthenticated,
  };
}

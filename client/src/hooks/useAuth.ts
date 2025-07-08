import { useQuery } from "@tanstack/react-query";
import { useAdminSession } from "./useAdminSession";

export function useAuth() {
  const { data: response, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const { user: adminUser, isAuthenticated: isAdminAuth, isLoading: isAdminLoading } = useAdminSession();

  // Check if current user is the specific admin (adamLinkenauger@gmail.com)
  const isSpecificAdmin = adminUser?.email === 'adamLinkenauger@gmail.com' && adminUser?.role === 'admin';

  // Only use admin bypass for the specific admin user, everyone else uses regular auth
  const finalUser = (isSpecificAdmin && isAdminAuth) ? adminUser : response?.user;
  const finalIsAuthenticated = isSpecificAdmin ? isAdminAuth : (response?.authenticated === true);
  const finalIsLoading = isSpecificAdmin ? isAdminLoading : isLoading;

  return {
    user: finalUser,
    isLoading: finalIsLoading,
    isAuthenticated: finalIsAuthenticated,
  };
}

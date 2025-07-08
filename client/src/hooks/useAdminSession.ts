import { useQuery } from "@tanstack/react-query";

export function useAdminSession() {
  const { data: response, isLoading } = useQuery({
    queryKey: ["/api/admin-session"],
    retry: false,
  });

  return {
    user: response?.user,
    isLoading,
    isAuthenticated: response?.authenticated === true,
  };
}
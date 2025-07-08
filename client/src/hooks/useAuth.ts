import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: response, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  return {
    user: response?.user,
    isLoading,
    isAuthenticated: response?.authenticated === true,
  };
}

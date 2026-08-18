import { useQuery } from "@tanstack/react-query";

interface AuthUser {
  id?: string;
  currentBrandId?: number | null;
  [key: string]: unknown;
}

interface AuthResponse {
  authenticated: boolean;
  user: AuthUser | null;
}

export function useAuth() {
  const { data: response, isLoading } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  return {
    user: response?.user,
    isLoading: isLoading,
    isAuthenticated: response?.authenticated === true,
  };
}

import { useQuery } from "@tanstack/react-query";

interface AdminCheckResponse {
  isAdmin: boolean;
}

export function useAdminAuth() {
  const { data, isLoading, error } = useQuery<AdminCheckResponse>({
    queryKey: ["/api/temp-admin-check"],
    retry: false,
  });

  return {
    isAdmin: data?.isAdmin === true,
    isLoading,
    error,
  };
}
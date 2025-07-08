import { useQuery } from "@tanstack/react-query";
import { useAdminAuth } from "./useAdminAuth";

export function useAdminData() {
  const { isAdmin } = useAdminAuth();

  // Admin-specific data hooks that use bypass endpoints
  const brands = useQuery({
    queryKey: ["/api/admin-bypass/brands"],
    enabled: isAdmin,
  });

  const guides = useQuery({
    queryKey: ["/api/admin-bypass/guides"],
    enabled: isAdmin,
  });

  const notifications = useQuery({
    queryKey: ["/api/admin-bypass/notifications"],
    enabled: isAdmin,
  });

  const dashboardStats = useQuery({
    queryKey: ["/api/admin-bypass/dashboard-stats"],
    enabled: isAdmin,
  });

  const branding = useQuery({
    queryKey: ["/api/admin-bypass/branding"],
    enabled: isAdmin,
  });

  return {
    brands: brands.data,
    guides: guides.data,
    notifications: notifications.data,
    dashboardStats: dashboardStats.data,
    branding: branding.data,
    isLoading: brands.isLoading || guides.isLoading || notifications.isLoading || dashboardStats.isLoading || branding.isLoading,
  };
}
import { useQuery } from "@tanstack/react-query";
import { useAdminAuth } from "./useAdminAuth";

// Hook that uses admin bypass endpoints when user is admin, regular endpoints otherwise
export function useAdminAwareData() {
  const { isAdmin } = useAdminAuth();

  // Brands query
  const brands = useQuery({
    queryKey: isAdmin ? ["/api/admin-bypass/brands"] : ["/api/brands"],
    enabled: true,
  });

  // Guides query
  const guides = useQuery({
    queryKey: isAdmin ? ["/api/admin-bypass/guides"] : ["/api/guides"],
    enabled: true,
  });

  // Notifications query
  const notifications = useQuery({
    queryKey: isAdmin ? ["/api/admin-bypass/notifications"] : ["/api/notifications"],
    enabled: true,
  });

  // Dashboard stats query
  const dashboardStats = useQuery({
    queryKey: isAdmin ? ["/api/admin-bypass/dashboard-stats"] : ["/api/dashboard/stats"],
    enabled: true,
  });

  // Branding query
  const branding = useQuery({
    queryKey: isAdmin ? ["/api/admin-bypass/branding"] : ["/api/branding"],
    enabled: true,
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
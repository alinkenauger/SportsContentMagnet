import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface Brand {
  id: number;
  userId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useBrands() {
  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["/api/brands"],
    retry: false,
  });

  return {
    brands: brands as Brand[],
    isLoading,
    hasMultipleBrands: brands.length > 1,
  };
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (brandData: Partial<Brand>) => {
      return await apiRequest("/api/brands", {
        method: "POST",
        body: brandData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...brandData }: Partial<Brand> & { id: number }) => {
      return await apiRequest(`/api/brands/${id}`, {
        method: "PUT",
        body: brandData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
    },
  });
}

export function useSetCurrentBrand() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (brandId: number) => {
      return await apiRequest(`/api/brands/${brandId}/set-current`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      // Invalidate all brand-specific data
      queryClient.invalidateQueries({ queryKey: ["/api/guides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/branding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledgebase"] });
    },
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (brandId: number) => {
      return await apiRequest(`/api/brands/${brandId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
    },
  });
}
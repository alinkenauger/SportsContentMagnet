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
  const { data: brands = [], isLoading } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
    retry: false,
  });

  return {
    brands: brands || [],
    isLoading,
    hasMultipleBrands: (brands || []).length > 1,
  };
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (brandData: Partial<Brand>) => {
      return await apiRequest("/api/brands", "POST", brandData);
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
      return await apiRequest(`/api/brands/${id}`, "PUT", brandData);
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
      return await apiRequest(`/api/brands/${brandId}/set-current`, "POST");
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

export function useClearCurrentBrand() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/brands/clear-current", "POST");
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
      return await apiRequest(`/api/brands/${brandId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
    },
  });
}
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (brandId: number) => {
      return await apiRequest(`/api/brands/${brandId}/set-current`, "POST");
    },
    onMutate: async (brandId: number) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/auth/user"] });
      
      // Snapshot the previous value
      const previousUser = queryClient.getQueryData(["/api/auth/user"]);
      
      // Optimistically update the user's current brand
      queryClient.setQueryData(["/api/auth/user"], (old: any) => {
        if (!old) return old;
        return { ...old, currentBrandId: brandId };
      });
      
      // Return context object with the snapshotted value
      return { previousUser };
    },
    onError: (err, brandId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousUser) {
        queryClient.setQueryData(["/api/auth/user"], context.previousUser);
      }
      toast({
        title: "Error",
        description: "Failed to switch brand. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: (data, brandId) => {
      // Get the brand name for the toast
      const brands = queryClient.getQueryData(["/api/brands"]) as Brand[];
      const brand = brands?.find(b => b.id === brandId);
      toast({
        title: "Brand switched",
        description: `Switched to ${brand?.name || "selected brand"}`,
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Invalidate brand-specific data but don't wait for it
      queryClient.invalidateQueries({ queryKey: ["/api/guides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/branding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledgebase"] });
    },
  });
}

export function useClearCurrentBrand() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/brands/clear-current", "POST");
    },
    onMutate: async () => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/auth/user"] });
      
      // Snapshot the previous value
      const previousUser = queryClient.getQueryData(["/api/auth/user"]);
      
      // Optimistically clear the current brand
      queryClient.setQueryData(["/api/auth/user"], (old: any) => {
        if (!old) return old;
        return { ...old, currentBrandId: null };
      });
      
      // Return context object with the snapshotted value
      return { previousUser };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousUser) {
        queryClient.setQueryData(["/api/auth/user"], context.previousUser);
      }
      toast({
        title: "Error",
        description: "Failed to switch to default account. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Switched to default account",
        description: "You're now using your personal account",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Invalidate brand-specific data but don't wait for it
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
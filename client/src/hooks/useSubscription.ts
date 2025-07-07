import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface SubscriptionStatus {
  status: string;
  plan: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  billingCycle?: string;
  additionalBrands?: number;
  accountStatus?: string;
  pausedAt?: string;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  displayName: string;
  price: string;
  currency: string;
  billingCycle: string;
  maxLeads: number | null;
  maxVisits: number | null;
  maxBrands: number;
  customBranding: boolean;
  whiteLabeling: boolean;
  features: string[];
}

export function useSubscription() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get subscription status
  const subscriptionQuery = useQuery({
    queryKey: ['/api/stripe/subscription-status'],
    queryFn: async () => {
      const response = await apiRequest('/api/stripe/subscription-status', 'GET');
      return response.json() as Promise<SubscriptionStatus>;
    }
  });

  // Get available plans
  const plansQuery = useQuery({
    queryKey: ['/api/subscription/plans'],
    queryFn: async () => {
      const response = await apiRequest('/api/subscription/plans', 'GET');
      return response.json() as Promise<SubscriptionPlan[]>;
    }
  });

  // Change plan mutation
  const changePlanMutation = useMutation({
    mutationFn: async ({ planName, billingCycle }: { planName: string; billingCycle: string }) => {
      const response = await apiRequest('/api/stripe/change-plan', 'POST', {
        newPlanName: planName,
        newBillingCycle: billingCycle
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/subscription-status'] });
      toast({
        title: "Plan Updated",
        description: "Your subscription plan has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Plan Update Failed",
        description: error.message || "Failed to update plan. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Manage brands mutation
  const manageBrandsMutation = useMutation({
    mutationFn: async (additionalBrands: number) => {
      const response = await apiRequest('/api/stripe/manage-brands', 'POST', {
        additionalBrands
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/subscription-status'] });
      toast({
        title: "Brands Updated",
        description: "Your brand allocation has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Brand Update Failed",
        description: error.message || "Failed to update brands. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Pause account mutation
  const pauseAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/stripe/pause-account', 'POST');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/subscription-status'] });
      toast({
        title: "Account Paused",
        description: "Your account will be paused at the end of the current billing period.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Pause Failed",
        description: error.message || "Failed to pause account. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Resume account mutation
  const resumeAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/stripe/resume-account', 'POST');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/subscription-status'] });
      toast({
        title: "Account Resumed",
        description: "Your account has been reactivated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Resume Failed",
        description: error.message || "Failed to resume account. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Customer portal access
  const openCustomerPortal = async () => {
    try {
      const response = await apiRequest('/api/stripe/customer-portal', 'POST');
      const { url } = await response.json();
      window.open(url, '_blank');
    } catch (error) {
      toast({
        title: "Portal Access Failed",
        description: "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    // Data
    subscriptionStatus: subscriptionQuery.data,
    plans: plansQuery.data,
    isLoading: subscriptionQuery.isLoading || plansQuery.isLoading,
    
    // Mutations
    changePlan: changePlanMutation.mutate,
    manageBrands: manageBrandsMutation.mutate,
    pauseAccount: pauseAccountMutation.mutate,
    resumeAccount: resumeAccountMutation.mutate,
    openCustomerPortal,
    
    // States
    isChangingPlan: changePlanMutation.isPending,
    isManagingBrands: manageBrandsMutation.isPending,
    isPausing: pauseAccountMutation.isPending,
    isResuming: resumeAccountMutation.isPending,
  };
}
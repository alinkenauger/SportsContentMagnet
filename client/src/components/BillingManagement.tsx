import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Loader2, CreditCard, Calendar, FileText, ExternalLink, Settings, ArrowUpDown, Plus, Minus, Building2, Pause, Play, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

interface SubscriptionStatus {
  status: string;
  plan: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  billingCycle?: string;
  additionalBrands?: number;
  accountStatus?: string;
  pausedAt?: string;
}

interface SubscriptionPlan {
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

export default function BillingManagement() {
  const [isLoading, setIsLoading] = useState(false);
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
  const [isBrandManagementOpen, setIsBrandManagementOpen] = useState(false);
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedBillingCycle, setSelectedBillingCycle] = useState('monthly');
  const [additionalBrands, setAdditionalBrands] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscriptionStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/stripe/subscription-status'],
    queryFn: async () => {
      const response = await apiRequest('/api/stripe/subscription-status', 'GET');
      return response.json() as Promise<SubscriptionStatus>;
    }
  });

  const { data: plans } = useQuery({
    queryKey: ['/api/subscription/plans'],
    queryFn: async () => {
      const response = await apiRequest('/api/subscription/plans', 'GET');
      return response.json() as Promise<SubscriptionPlan[]>;
    }
  });

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
      setIsChangePlanOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update plan. Please try again.",
        variant: "destructive",
      });
    }
  });

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
      setIsBrandManagementOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update brands. Please try again.",
        variant: "destructive",
      });
    }
  });

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
      setIsPauseDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to pause account. Please try again.",
        variant: "destructive",
      });
    }
  });

  const resumeAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/stripe/resume-account', 'POST');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/subscription-status'] });
      toast({
        title: "Account Resumed",
        description: "Your subscription has been reactivated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resume account. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('/api/stripe/customer-portal', 'POST');
      const { url } = await response.json();
      
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      toast({
        title: "Error",
        description: "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getPlanDisplayName = (plan: string) => {
    switch (plan) {
      case 'free': return 'Free';
      case 'personal': return 'Personal';
      case 'business': return 'Business';
      default: return plan.charAt(0).toUpperCase() + plan.slice(1);
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'personal': return 'bg-blue-100 text-blue-800';
      case 'business': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isActivePaidPlan = subscriptionStatus?.status === 'active' && subscriptionStatus?.plan !== 'free';
  
  const handlePlanChange = () => {
    if (!selectedPlan) return;
    changePlanMutation.mutate({
      planName: selectedPlan,
      billingCycle: selectedBillingCycle
    });
  };

  const handleBrandManagement = () => {
    manageBrandsMutation.mutate(additionalBrands);
  };

  const calculatePlanPrice = (basePrice: string, cycle: string) => {
    const price = parseFloat(basePrice);
    return cycle === 'yearly' ? (price * 10).toFixed(2) : basePrice;
  };

  const calculateBrandAddonPrice = (brands: number, cycle: string) => {
    const monthlyPrice = brands * 33;
    return cycle === 'yearly' ? (monthlyPrice * 10).toFixed(2) : monthlyPrice.toFixed(2);
  };

  const getTotalBrands = () => {
    const planBrands = subscriptionStatus?.plan === 'business' ? 3 : 
                     subscriptionStatus?.plan === 'personal' ? 0 : 0;
    return planBrands + (subscriptionStatus?.additionalBrands || 0);
  };

  const handlePauseAccount = () => {
    pauseAccountMutation.mutate();
  };

  const handleResumeAccount = () => {
    resumeAccountMutation.mutate();
  };

  const isPaused = subscriptionStatus?.accountStatus === 'paused' || subscriptionStatus?.cancelAtPeriodEnd;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Billing & Subscription
        </CardTitle>
        <CardDescription>
          Manage your subscription, payment methods, and billing information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan */}
        <div className="border rounded-lg p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-xl">
                  {getPlanDisplayName(subscriptionStatus?.plan || 'free')} Plan
                </h3>
                <Badge className={getPlanColor(subscriptionStatus?.plan || 'free')}>
                  {subscriptionStatus?.status === 'active' ? 'Active' : 
                   subscriptionStatus?.status === 'canceled' ? 'Canceled' :
                   subscriptionStatus?.status || 'Free'}
                </Badge>
              </div>
              
              {subscriptionStatus?.plan === 'free' ? (
                <p className="text-gray-600 dark:text-gray-300">
                  50 leads • 500 visits per month • VidMagnet branding
                </p>
              ) : subscriptionStatus?.plan === 'personal' ? (
                <p className="text-gray-600 dark:text-gray-300">
                  Unlimited leads & visits • Custom branding • Priority support
                </p>
              ) : subscriptionStatus?.plan === 'business' ? (
                <p className="text-gray-600 dark:text-gray-300">
                  Everything in Personal • Multiple brands • White labeling • Advanced analytics
                </p>
              ) : (
                <p className="text-gray-600 dark:text-gray-300">
                  Custom plan features
                </p>
              )}

              {subscriptionStatus?.currentPeriodEnd && (
                <div className="flex items-center gap-2 mt-3">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-500">
                    {subscriptionStatus.cancelAtPeriodEnd 
                      ? `Cancels on ${formatDate(subscriptionStatus.currentPeriodEnd)}`
                      : `Renews on ${formatDate(subscriptionStatus.currentPeriodEnd)}`
                    }
                  </span>
                </div>
              )}
            </div>
            
            <div className="text-right">
              {subscriptionStatus?.plan !== 'free' && (
                <div className="text-2xl font-bold mb-2">
                  {subscriptionStatus?.billingCycle === 'year' ? 'Yearly' : 'Monthly'}
                </div>
              )}
              
              <div className="flex gap-2">
                {subscriptionStatus?.plan === 'free' ? (
                  <Button asChild>
                    <Link href="/subscribe">
                      Upgrade Plan
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" asChild>
                      <Link href="/subscribe">
                        Change Plan
                      </Link>
                    </Button>
                    <Button 
                      onClick={handleManageBilling}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Settings className="w-4 h-4" />
                      )}
                      Manage Billing
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Management */}
        {isActivePaidPlan && (
          <div className="space-y-4">
            <h3 className="font-semibold">Subscription Management</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Plan Change */}
              <Dialog open={isChangePlanOpen} onOpenChange={setIsChangePlanOpen}>
                <DialogTrigger asChild>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4" />
                        Change Plan
                      </CardTitle>
                      <CardDescription>
                        Upgrade, downgrade, or switch billing cycle
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full">
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        Modify Subscription
                      </Button>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Change Subscription Plan</DialogTitle>
                    <DialogDescription>
                      Select a new plan and billing cycle. Changes will be prorated automatically.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="plan">Plan</Label>
                      <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans?.filter(p => p.name !== 'free').map(plan => (
                            <SelectItem key={plan.id} value={plan.name}>
                              {plan.displayName} - ${plan.price}/month
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cycle">Billing Cycle</Label>
                      <Select value={selectedBillingCycle} onValueChange={setSelectedBillingCycle}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly (Save 17%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedPlan && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-sm">
                          <div className="font-medium">New Price:</div>
                          <div className="text-lg font-bold">
                            ${calculatePlanPrice(
                              plans?.find(p => p.name === selectedPlan)?.price || '0',
                              selectedBillingCycle
                            )}
                            <span className="text-sm font-normal">
                              /{selectedBillingCycle === 'yearly' ? 'year' : 'month'}
                            </span>
                          </div>
                          {selectedBillingCycle === 'yearly' && (
                            <div className="text-xs text-green-600">
                              Save ${((parseFloat(plans?.find(p => p.name === selectedPlan)?.price || '0') * 12) - 
                                     (parseFloat(plans?.find(p => p.name === selectedPlan)?.price || '0') * 10)).toFixed(2)} per year
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsChangePlanOpen(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button 
                        onClick={handlePlanChange}
                        disabled={!selectedPlan || changePlanMutation.isPending}
                        className="flex-1"
                      >
                        {changePlanMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Update Plan
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Brand Management (Business Only) */}
              {subscriptionStatus?.plan === 'business' && (
                <Dialog open={isBrandManagementOpen} onOpenChange={setIsBrandManagementOpen}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          Manage Brands
                        </CardTitle>
                        <CardDescription>
                          Add or remove additional brand workspaces
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          Current: {getTotalBrands()} brands
                        </div>
                        <Button variant="outline" className="w-full">
                          <Building2 className="w-4 h-4 mr-2" />
                          Modify Brands
                        </Button>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Manage Brand Workspaces</DialogTitle>
                      <DialogDescription>
                        Your Business plan includes 3 brands. Add additional brands for $33/month each.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Additional Brands</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAdditionalBrands(Math.max(0, additionalBrands - 1))}
                            disabled={additionalBrands <= 0}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Input
                            type="number"
                            min="0"
                            max="10"
                            value={additionalBrands}
                            onChange={(e) => setAdditionalBrands(Math.max(0, parseInt(e.target.value) || 0))}
                            className="text-center w-20"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAdditionalBrands(Math.min(10, additionalBrands + 1))}
                            disabled={additionalBrands >= 10}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-xs text-gray-500">
                          Total brands: {3 + additionalBrands} (3 included + {additionalBrands} additional)
                        </div>
                      </div>

                      {additionalBrands > 0 && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-sm">
                            <div className="font-medium">Additional Cost:</div>
                            <div className="text-lg font-bold">
                              +${calculateBrandAddonPrice(additionalBrands, subscriptionStatus?.billingCycle || 'monthly')}
                              <span className="text-sm font-normal">
                                /{subscriptionStatus?.billingCycle === 'yearly' ? 'year' : 'month'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              ${additionalBrands * 33}/month per additional brand
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-4">
                        <Button variant="outline" onClick={() => setIsBrandManagementOpen(false)} className="flex-1">
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleBrandManagement}
                          disabled={manageBrandsMutation.isPending || additionalBrands === (subscriptionStatus?.additionalBrands || 0)}
                          className="flex-1"
                        >
                          {manageBrandsMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : null}
                          Update Brands
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Payment & Billing */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleManageBilling}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Payment & Billing
                  </CardTitle>
                  <CardDescription>
                    Manage payment methods and view invoices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Settings className="w-4 h-4 mr-2" />
                    )}
                    Manage Billing
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Account Control */}
            <Separator />
            <div className="space-y-4">
              <h3 className="font-semibold text-red-600 dark:text-red-400">Account Control</h3>
              
              {isPaused ? (
                /* Resume Account Card */
                <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-300">
                      <Play className="w-4 h-4" />
                      Account Paused
                    </CardTitle>
                    <CardDescription className="text-green-600 dark:text-green-400">
                      {subscriptionStatus?.cancelAtPeriodEnd 
                        ? "Your subscription will end at the current billing period. You can resume anytime."
                        : "Your account is currently paused. All data is preserved and you can resume anytime."
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={handleResumeAccount}
                      disabled={resumeAccountMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {resumeAccountMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Resume Subscription
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                /* Pause Account Dialog */
                <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
                  <DialogTrigger asChild>
                    <Card className="border-orange-200 hover:border-orange-300 cursor-pointer transition-colors">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-300">
                          <Pause className="w-4 h-4" />
                          Pause Account
                        </CardTitle>
                        <CardDescription className="text-orange-600 dark:text-orange-400">
                          Temporarily pause your subscription while preserving all your data
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
                          <Pause className="w-4 h-4 mr-2" />
                          Pause My Account
                        </Button>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-orange-700">
                        <AlertTriangle className="w-5 h-5" />
                        Pause Account
                      </DialogTitle>
                      <DialogDescription>
                        This will pause your subscription and limit your account to free tier access. 
                        All your guides, leads, and settings will be preserved.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                        <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">What happens when you pause:</h4>
                        <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                          <li>• Subscription billing stops at the end of current period</li>
                          <li>• Account limited to free tier features (50 leads, 500 visits)</li>
                          <li>• All guides, leads, and brand settings preserved</li>
                          <li>• You can resume your subscription anytime</li>
                        </ul>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button variant="outline" onClick={() => setIsPauseDialogOpen(false)} className="flex-1">
                          Cancel
                        </Button>
                        <Button 
                          onClick={handlePauseAccount}
                          disabled={pauseAccountMutation.isPending}
                          variant="destructive"
                          className="flex-1"
                        >
                          {pauseAccountMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Pause className="w-4 h-4 mr-2" />
                          )}
                          Pause Account
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        )}

        {/* Upgrade Prompt for Free Users */}
        {subscriptionStatus?.plan === 'free' && (
          <div className="border rounded-lg p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-2">Ready to unlock unlimited potential?</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Upgrade to remove limits, add custom branding, and get priority support
              </p>
              <Button asChild size="lg" className="flex items-center gap-2 mx-auto">
                <Link href="/subscribe">
                  <ExternalLink className="w-4 h-4" />
                  View Upgrade Options
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Features Comparison */}
        <div className="pt-6 border-t">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">
              Need help choosing the right plan?
            </p>
            <Button variant="outline" asChild>
              <Link href="/pricing">
                Compare All Plans
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
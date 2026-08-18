import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
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
import { formatDate, getPlanDisplayName, getPlanColor } from "@/utils/formatters";

export default function BillingManagement() {
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
  const [isBrandManagementOpen, setIsBrandManagementOpen] = useState(false);
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedBillingCycle, setSelectedBillingCycle] = useState('monthly');
  const [additionalBrands, setAdditionalBrands] = useState(0);
  
  const {
    subscriptionStatus,
    plans,
    isLoading,
    changePlan,
    manageBrands,
    pauseAccount,
    resumeAccount,
    openCustomerPortal,
    isChangingPlan,
    isManagingBrands,
    isPausing,
    isResuming,
  } = useSubscription();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }



  const isActivePaidPlan = subscriptionStatus?.status === 'active' && subscriptionStatus?.plan !== 'free';
  
  const handlePlanChange = () => {
    if (!selectedPlan) return;
    changePlan({
      planName: selectedPlan,
      billingCycle: selectedBillingCycle
    });
    setIsChangePlanOpen(false);
  };

  const handleBrandManagement = () => {
    manageBrands(additionalBrands);
    setIsBrandManagementOpen(false);
  };

  const handlePauseAccount = () => {
    pauseAccount();
    setIsPauseDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Current Subscription
          </CardTitle>
          <CardDescription>
            Manage your subscription plan and billing details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge className={getPlanColor(subscriptionStatus?.plan || 'free')}>
                  {getPlanDisplayName(subscriptionStatus?.plan || 'free')}
                </Badge>
                {subscriptionStatus?.billingCycle && (
                  <Badge variant="outline">
                    {subscriptionStatus.billingCycle.charAt(0).toUpperCase() + subscriptionStatus.billingCycle.slice(1)}
                  </Badge>
                )}
              </div>
              {subscriptionStatus?.currentPeriodEnd && (
                <p className="text-sm text-muted-foreground mt-1">
                  Next billing: {formatDate(subscriptionStatus.currentPeriodEnd)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {isActivePaidPlan && (
                <Button variant="outline" onClick={openCustomerPortal}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Billing Portal
                </Button>
              )}
              {subscriptionStatus?.plan === 'free' && (
                <Link href="/subscribe">
                  <Button>
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    Upgrade Plan
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {subscriptionStatus?.accountStatus === 'paused' && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <div>
                  <h4 className="font-medium text-orange-800">Account Paused</h4>
                  <p className="text-sm text-orange-600">
                    Your account is currently paused. Click resume to reactivate your subscription.
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => resumeAccount()}
                disabled={isResuming}
                className="mt-3"
                size="sm"
              >
                {isResuming ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Resume Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Management Actions */}
      {isActivePaidPlan && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Change Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Change Plan</CardTitle>
              <CardDescription>
                Upgrade or downgrade your subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isChangePlanOpen} onOpenChange={setIsChangePlanOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    Change Plan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Subscription Plan</DialogTitle>
                    <DialogDescription>
                      Select a new plan and billing cycle. Changes will be prorated.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="plan-select">Plan</Label>
                      <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans?.filter(p => p.name !== 'free').map((plan) => (
                            <SelectItem key={plan.id} value={plan.name}>
                              {plan.displayName} - ${plan.price}/{plan.billingCycle}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="billing-cycle-select">Billing Cycle</Label>
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
                    
                    <Button 
                      onClick={handlePlanChange} 
                      disabled={!selectedPlan || isChangingPlan}
                      className="w-full"
                    >
                      {isChangingPlan ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Update Plan
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Brand Management */}
          {subscriptionStatus?.plan === 'business' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Manage Brands</CardTitle>
                <CardDescription>
                  Add or remove additional brands ($33/month each)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={isBrandManagementOpen} onOpenChange={setIsBrandManagementOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Building2 className="w-4 h-4 mr-2" />
                      Manage Brands
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Manage Additional Brands</DialogTitle>
                      <DialogDescription>
                        Business plans include 3 brands. Add more for $33/month each.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="additional-brands">Additional Brands</Label>
                        <Input
                          type="number"
                          min="0"
                          value={additionalBrands}
                          onChange={(e) => setAdditionalBrands(parseInt(e.target.value) || 0)}
                          placeholder="Number of additional brands"
                        />
                      </div>
                      
                      <Button 
                        onClick={handleBrandManagement} 
                        disabled={isManagingBrands}
                        className="w-full"
                      >
                        {isManagingBrands ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Update Brands
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}

          {/* Account Pause */}
          {subscriptionStatus?.accountStatus !== 'paused' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Account Control</CardTitle>
                <CardDescription>
                  Pause your account to retain data while stopping billing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Pause className="w-4 h-4 mr-2" />
                      Pause Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Pause Account</DialogTitle>
                      <DialogDescription>
                        This will downgrade you to the free tier at the end of your current billing period while preserving all your data.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-sm text-orange-800">
                          Your subscription will be paused at the end of the current billing period. 
                          All your guides, leads, and settings will be preserved.
                        </p>
                      </div>
                      
                      <Button 
                        onClick={handlePauseAccount} 
                        disabled={isPausing}
                        variant="destructive"
                        className="w-full"
                      >
                        {isPausing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Pause className="w-4 h-4 mr-2" />}
                        Confirm Pause
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

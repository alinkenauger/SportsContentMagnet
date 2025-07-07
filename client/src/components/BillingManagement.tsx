import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Calendar, FileText, ExternalLink, Settings } from "lucide-react";
import { Link } from "wouter";

interface SubscriptionStatus {
  status: string;
  plan: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  billingCycle?: string;
}

export default function BillingManagement() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const { data: subscriptionStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/stripe/subscription-status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/stripe/subscription-status');
      return response.json() as Promise<SubscriptionStatus>;
    }
  });

  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/stripe/create-portal-session', {});
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

        {/* Billing Management */}
        {isActivePaidPlan && (
          <div className="space-y-4">
            <h3 className="font-semibold">Billing Management</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Payment Methods
                  </CardTitle>
                  <CardDescription>
                    Update your payment information and billing details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleManageBilling}
                    disabled={isLoading}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Manage Payment Methods
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Billing History
                  </CardTitle>
                  <CardDescription>
                    View and download your invoices and receipts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleManageBilling}
                    disabled={isLoading}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Invoices
                  </Button>
                </CardContent>
              </Card>
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
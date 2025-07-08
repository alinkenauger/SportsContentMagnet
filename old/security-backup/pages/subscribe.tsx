import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, CreditCard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

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

export default function Subscribe() {
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/subscription/plans'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/subscription/plans');
      return response.json() as Promise<SubscriptionPlan[]>;
    }
  });

  const { data: subscriptionStatus } = useQuery({
    queryKey: ['/api/stripe/subscription-status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/stripe/subscription-status');
      return response.json();
    }
  });

  const handleUpgrade = async (planName: string) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/stripe/create-checkout-session', {
        planName,
        billingCycle
      });
      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Error",
        description: "Failed to start checkout process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateYearlyPrice = (monthlyPrice: string) => {
    return (parseFloat(monthlyPrice) * 10).toFixed(2); // 2 months free
  };

  const calculateSavings = (monthlyPrice: string) => {
    const monthly = parseFloat(monthlyPrice) * 12;
    const yearly = parseFloat(monthlyPrice) * 10;
    return (monthly - yearly).toFixed(2);
  };

  if (plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const currentPlan = subscriptionStatus?.plan || 'free';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Transform your content into high-converting lead magnets
          </p>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            <span className={`${billingCycle === 'monthly' ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                billingCycle === 'yearly' ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`${billingCycle === 'yearly' ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
              Yearly
            </span>
            {billingCycle === 'yearly' && (
              <Badge variant="secondary" className="ml-2">
                Save 17%
              </Badge>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans?.map((plan) => {
            const isCurrentPlan = currentPlan === plan.name;
            const isPopular = plan.name === 'personal';
            const price = billingCycle === 'yearly' ? calculateYearlyPrice(plan.price) : plan.price;
            const savings = billingCycle === 'yearly' ? calculateSavings(plan.price) : '0';

            return (
              <Card key={plan.id} className={`relative ${isPopular ? 'ring-2 ring-blue-500' : ''} ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-green-500 text-white">Current Plan</Badge>
                  </div>
                )}

                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.displayName}</CardTitle>
                  <div className="text-4xl font-bold">
                    ${price}
                    <span className="text-lg font-normal text-gray-500">
                      /{billingCycle === 'yearly' ? 'year' : 'month'}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && parseFloat(savings) > 0 && (
                    <div className="text-sm text-green-600">
                      Save ${savings} per year
                    </div>
                  )}
                  <CardDescription>
                    {plan.maxLeads ? `${plan.maxLeads} leads` : 'Unlimited leads'} • {' '}
                    {plan.maxVisits ? `${plan.maxVisits} visits` : 'Unlimited visits'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm capitalize">{feature.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                    {plan.customBranding && (
                      <div className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Custom Branding</span>
                      </div>
                    )}
                    {plan.whiteLabeling && (
                      <div className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm">White Labeling</span>
                      </div>
                    )}
                    {plan.maxBrands > 0 && (
                      <div className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{plan.maxBrands} Brand Workspaces</span>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => handleUpgrade(plan.name)}
                    disabled={isLoading || isCurrentPlan || plan.name === 'free'}
                    className="w-full"
                    variant={isPopular ? "default" : "outline"}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CreditCard className="w-4 h-4 mr-2" />
                    )}
                    {isCurrentPlan ? 'Current Plan' : 
                     plan.name === 'free' ? 'Free Plan' : 
                     'Upgrade Now'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            All plans include our core features and 24/7 support
          </p>
          <p className="text-sm text-gray-500">
            You can cancel or change your plan at any time
          </p>
        </div>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Star, Users, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SubscriptionPlan {
  id: number;
  name: string;
  displayName: string;
  price: string;
  currency: string;
  billingCycle: string;
  maxLeads: number | null;
  maxVisits: number | null;
  maxBrands: number | null;
  customBranding: boolean;
  whiteLabeling: boolean;
  features: string[];
  isActive: boolean;
}

interface UserSubscription {
  id: number;
  userId: string;
  planId: number;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

const planIcons = {
  free: Zap,
  personal: Star,
  business: Crown,
};

const planColors = {
  free: "text-blue-600",
  personal: "text-purple-600", 
  business: "text-amber-600",
};

export default function Pricing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubscribing, setIsSubscribing] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const { data: plans = [], isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription/plans"],
  });

  const { data: currentSubscription } = useQuery<UserSubscription>({
    queryKey: ["/api/subscription/current"],
  });

  const subscribeMutation = useMutation({
    mutationFn: async ({ planId, billingCycle }: { planId: number; billingCycle: 'monthly' | 'yearly' }) => {
      return apiRequest("POST", "/api/subscription/create", { 
        planId,
        billingCycle
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Subscription updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/current"] });
      setIsSubscribing(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription",
        variant: "destructive",
      });
      setIsSubscribing(null);
    },
  });

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    setIsSubscribing(plan.name);
    subscribeMutation.mutate({ planId: plan.id, billingCycle });
  };

  const formatFeature = (feature: string) => {
    const featureMap: Record<string, string> = {
      basic_guides: "Basic guide creation",
      vidmagnet_branding: "VidMagnet branding",
      unlimited_guides: "Unlimited guides",
      custom_branding: "Custom branding",
      white_labeling: "Full white-labeling",
      team_management: "Team collaboration",
      priority_support: "Priority support",
    };
    return featureMap[feature] || feature;
  };

  const formatLimits = (plan: SubscriptionPlan) => {
    const limits = [];
    if (plan.maxLeads) limits.push(`${plan.maxLeads} leads/month`);
    else if (plan.maxLeads === null) limits.push("Unlimited leads");
    
    if (plan.maxVisits) limits.push(`${plan.maxVisits} visits/month`);
    else if (plan.maxVisits === null) limits.push("Unlimited visits");
    
    if (plan.maxBrands === 0) limits.push("Personal account only");
    else if (plan.maxBrands === 3) limits.push("3 brands included");
    else if (plan.maxBrands === null) limits.push("Unlimited brands");
    
    return limits;
  };

  const isCurrentPlan = (planId: number) => {
    return currentSubscription?.planId === planId;
  };

  const calculatePrice = (monthlyPrice: string) => {
    const price = parseFloat(monthlyPrice);
    if (price === 0) return "0"; // Free plan
    
    if (billingCycle === 'yearly') {
      return (price * 10).toFixed(0); // 10 months = 2 months free
    }
    return monthlyPrice;
  };

  const getPriceLabel = (monthlyPrice: string) => {
    const price = parseFloat(monthlyPrice);
    if (price === 0) return "Free";
    
    if (billingCycle === 'yearly') {
      return `$${calculatePrice(monthlyPrice)} / year`;
    }
    return `$${monthlyPrice} / month`;
  };

  const getSavingsText = (monthlyPrice: string) => {
    const price = parseFloat(monthlyPrice);
    if (price === 0 || billingCycle === 'monthly') return null;
    
    const monthlyTotal = price * 12;
    const yearlyPrice = price * 10;
    const savings = monthlyTotal - yearlyPrice;
    
    return `Save $${savings.toFixed(0)} per year`;
  };

  if (plansLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Manage Your Subscription</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {currentSubscription?.plan ? 
            `You're currently on the ${currentSubscription.plan.displayName} plan. Upgrade anytime to unlock more features.` :
            'Choose a plan that fits your content creation needs'
          }
        </p>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex flex-col items-center mb-8 space-y-3">
        <div className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium">
          Save 17% with yearly billing
        </div>
        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const IconComponent = planIcons[plan.name as keyof typeof planIcons] || Star;
          const isPopular = plan.name === 'personal';
          const isEnterprise = plan.name === 'business';
          
          return (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-200 ${
                isCurrentPlan(plan.id) 
                  ? 'border-green-300 bg-green-50 shadow-lg' 
                  : 'hover:shadow-lg'
              } ${
                isPopular && !isCurrentPlan(plan.id) ? 'border-purple-200 shadow-lg scale-105' : ''
              } ${isEnterprise ? 'border-amber-200' : ''}`}
            >
              {isCurrentPlan(plan.id) && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600">
                  Current Plan
                </Badge>
              )}
              {isPopular && !isCurrentPlan(plan.id) && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-600">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center space-y-4">
                <div className={`mx-auto p-3 rounded-full bg-gray-100 w-fit ${planColors[plan.name as keyof typeof planColors]}`}>
                  <IconComponent className="h-8 w-8" />
                </div>
                
                <div>
                  <CardTitle className="text-2xl">{plan.displayName}</CardTitle>
                  <CardDescription className="mt-2">
                    {plan.name === 'free' && (isCurrentPlan(plan.id) ? "Your current plan" : "Perfect for trying out ConvertMag")}
                    {plan.name === 'personal' && (isCurrentPlan(plan.id) ? "Your current plan" : "Upgrade for unlimited leads & custom branding")}
                    {plan.name === 'business' && (isCurrentPlan(plan.id) ? "Your current plan" : "Includes 3 brands + unlimited team management")}
                  </CardDescription>
                </div>

                <div className="space-y-1">
                  <div className="text-4xl font-bold">
                    ${calculatePrice(plan.price)}
                    {plan.name === 'business' && <span className="text-lg text-muted-foreground">/3 brands</span>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    per {billingCycle === 'yearly' ? 'year' : 'month'}
                  </div>
                  {getSavingsText(plan.price) && (
                    <div className="text-sm text-green-600 font-medium">
                      {getSavingsText(plan.price)}
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <h4 className="font-semibold">Limits:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {formatLimits(plan).map((limit, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {limit}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Features:</h4>
                  <ul className="space-y-1 text-sm">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {formatFeature(feature)}
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.customBranding && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Shield className="h-4 w-4" />
                    Custom branding available
                  </div>
                )}

                {plan.whiteLabeling && (
                  <div className="flex items-center gap-2 text-sm text-purple-600">
                    <Users className="h-4 w-4" />
                    Full white-labeling & team management
                  </div>
                )}
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={isCurrentPlan(plan.id) ? "outline" : isPopular ? "default" : "outline"}
                  onClick={() => plan.name === 'free' || isCurrentPlan(plan.id) ? null : window.location.href = '/subscribe'}
                  disabled={isCurrentPlan(plan.id)}
                >
                  {isCurrentPlan(plan.id) ? (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      You Already Own This
                    </div>
                  ) : plan.name === 'free' ? (
                    'Current Plan'
                  ) : (
                    `Upgrade to ${plan.displayName}`
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
        <div className="grid gap-4 text-left">
          <div>
            <h3 className="font-semibold">How does the Business plan pricing work?</h3>
            <p className="text-muted-foreground">
              The Business plan is $99/month (or $990/year) and includes 3 brands minimum. Each brand gets unlimited guides, leads, and visits, 
              plus full white-labeling and team management capabilities.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Can I change plans anytime?</h3>
            <p className="text-muted-foreground">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, 
              and billing is prorated accordingly.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">What's included in team management?</h3>
            <p className="text-muted-foreground">
              Business plans include hierarchical user roles (Admin/Editor/View Only), invitation management, 
              and brand-specific access controls for seamless team collaboration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
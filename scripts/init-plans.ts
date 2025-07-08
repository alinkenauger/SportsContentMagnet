import { db } from "../server/db";
import { subscriptionPlans } from "../shared/schema";

async function initializePlans() {
  console.log("🚀 Initializing subscription plans...");

  const plans = [
    {
      name: 'free',
      displayName: 'Free',
      price: '0',
      currency: 'USD',
      billingCycle: 'monthly',
      maxLeads: 100,
      maxVisits: 1000,
      maxBrands: 1,
      customBranding: false,
      whiteLabeling: false,
      features: ['Basic features', 'Single brand', 'Community support']
    },
    {
      name: 'basic',
      displayName: 'Basic',
      price: '29',
      currency: 'USD',
      billingCycle: 'monthly',
      maxLeads: 1000,
      maxVisits: 10000,
      maxBrands: 3,
      customBranding: true,
      whiteLabeling: false,
      features: ['All Free features', 'Custom branding', 'Email support', 'Analytics']
    },
    {
      name: 'pro',
      displayName: 'Professional',
      price: '99',
      currency: 'USD',
      billingCycle: 'monthly',
      maxLeads: null, // unlimited
      maxVisits: null, // unlimited
      maxBrands: 10,
      customBranding: true,
      whiteLabeling: true,
      features: ['All Basic features', 'White labeling', 'Priority support', 'Advanced analytics', 'API access']
    },
    {
      name: 'enterprise',
      displayName: 'Enterprise',
      price: '299',
      currency: 'USD',
      billingCycle: 'monthly',
      maxLeads: null,
      maxVisits: null,
      maxBrands: null, // unlimited
      customBranding: true,
      whiteLabeling: true,
      features: ['All Pro features', 'Unlimited brands', 'Dedicated support', 'Custom integrations', 'SLA']
    }
  ];

  try {
    for (const plan of plans) {
      await db.insert(subscriptionPlans)
        .values(plan)
        .onConflictDoNothing();
    }
    
    console.log("✅ Subscription plans initialized successfully!");
  } catch (error) {
    console.error("❌ Error initializing plans:", error);
    process.exit(1);
  }

  process.exit(0);
}

initializePlans();
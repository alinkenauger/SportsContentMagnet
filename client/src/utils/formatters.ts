/**
 * Utility functions for formatting data
 */

export const formatDate = (timestamp?: number) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp * 1000).toLocaleDateString();
};

export const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num);
};

export const formatPercentage = (value: number, decimals = 1) => {
  return `${value.toFixed(decimals)}%`;
};

export const getPlanDisplayName = (plan: string) => {
  switch (plan) {
    case 'free': return 'Free';
    case 'personal': return 'Personal';
    case 'business': return 'Business';
    default: return plan.charAt(0).toUpperCase() + plan.slice(1);
  }
};

export const getPlanColor = (plan: string) => {
  switch (plan) {
    case 'free': return 'bg-gray-100 text-gray-800';
    case 'personal': return 'bg-blue-100 text-blue-800';
    case 'business': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getBadgeVariant = (status: string) => {
  switch (status) {
    case 'active': return 'default';
    case 'paused': return 'secondary';
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
};
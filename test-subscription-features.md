# Legacy Subscription Management Testing Checklist

> **Status: legacy manual checklist.** Verify plan names, prices, limits, and Stripe configuration against the current deployed billing data before using this as release evidence. The v1.1 release gate is documented in `replit.md` and `TODOS.md`.

## Feature Testing Checklist

### 1. Plan Change Testing
- [ ] Upgrade from Personal to Business
- [ ] Downgrade from Business to Personal  
- [ ] Change billing cycle (monthly to yearly)
- [ ] Change billing cycle (yearly to monthly)
- [ ] Verify proration handling
- [ ] Test price calculations with 17% yearly savings

### 2. Brand Management Testing (Business Only)
- [ ] Add additional brands (beyond 3 included)
- [ ] Remove additional brands
- [ ] Verify $33/month pricing per additional brand
- [ ] Test yearly pricing (10 months = $330/year per brand)
- [ ] Verify brand limits enforcement

### 3. Account Pausing Testing
- [ ] Pause active subscription
- [ ] Verify account limitation to free tier
- [ ] Confirm data preservation (guides, leads, settings)
- [ ] Test subscription cancellation at period end
- [ ] Verify pause status display

### 4. Account Resume Testing
- [ ] Resume paused account
- [ ] Restore original plan and billing cycle
- [ ] Verify reactivated subscription
- [ ] Test immediate access restoration
- [ ] Confirm billing restart

### 5. Payment Management Testing
- [ ] Access Stripe customer portal
- [ ] Update payment methods
- [ ] View invoice history
- [ ] Download invoices
- [ ] Update billing information

## Test Results Log
- Feature:
- Status:
- Notes:

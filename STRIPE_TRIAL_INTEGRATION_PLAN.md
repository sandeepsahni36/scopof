# Production Stripe Trial Integration Plan

## Executive Summary

This document outlines a comprehensive strategy for integrating Stripe subscription trials into the existing scopoStay application while maintaining zero downtime and preserving all existing subscription data.

## 1. Current System Analysis

### Existing Database Schema
```sql
-- Current subscription-related tables
admin (
  id, owner_id, customer_id, subscription_tier, subscription_status,
  trial_started_at, trial_ends_at, created_at, updated_at
)

stripe_customers (
  id, user_id, customer_id, created_at, updated_at, deleted_at
)

stripe_subscriptions (
  id, customer_id, subscription_id, price_id, current_period_start,
  current_period_end, cancel_at_period_end, payment_method_brand,
  payment_method_last4, status, created_at, updated_at, deleted_at
)

stripe_orders (
  id, checkout_session_id, payment_intent_id, customer_id,
  amount_subtotal, amount_total, currency, payment_status,
  status, created_at, updated_at, deleted_at
)
```

### Current Stripe Integration Points
- `supabase/functions/stripe-checkout/index.ts` - Checkout session creation
- `supabase/functions/stripe-webhook/index.ts` - Webhook processing
- `src/store/authStore.ts` - Subscription status management
- `src/stripe-config.ts` - Product configuration

## 2. Implementation Timeline

### Phase 1: Preparation & Validation (Day 1)
**Duration**: 2-4 hours
**Risk Level**: Low

#### 2.1 Database Backup & Validation
```bash
# Create full database backup
pg_dump -h your-db-host -U postgres -d your-db > backup_pre_trial_$(date +%Y%m%d_%H%M%S).sql

# Validate current subscription data
SELECT 
  COUNT(*) as total_admins,
  COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_subs,
  COUNT(CASE WHEN subscription_status = 'trialing' THEN 1 END) as trialing_subs,
  COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as with_stripe_customer
FROM admin;
```

#### 2.2 Stripe Configuration Audit
```javascript
// Document current Stripe products and prices
const currentProducts = {
  starter: { priceId: 'price_1RJXhuCDShtAyWWl8VhTAtNj', type: 'one_time' },
  professional: { priceId: 'price_1RJXjHCDShtAyWWllZtomnFA', type: 'one_time' },
  enterprise: { priceId: 'price_1RJXjjCDShtAyWWlL0WQc0I8', type: 'one_time' }
};
```

### Phase 2: Schema Enhancement (Day 1-2)
**Duration**: 1-2 hours
**Risk Level**: Low (additive changes only)

#### 2.1 Add Trial Tracking Fields
```sql
-- Add new fields to support enhanced trial tracking
ALTER TABLE admin ADD COLUMN IF NOT EXISTS trial_payment_intent_id text;
ALTER TABLE admin ADD COLUMN IF NOT EXISTS trial_setup_intent_id text;
ALTER TABLE admin ADD COLUMN IF NOT EXISTS payment_method_authorized boolean DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_trial_status ON admin(subscription_status, trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_admin_payment_authorized ON admin(payment_method_authorized);
```

#### 2.2 Create Migration Validation Function
```sql
CREATE OR REPLACE FUNCTION validate_trial_migration()
RETURNS TABLE(
  check_name text,
  status text,
  details text
) AS $$
BEGIN
  -- Check 1: Verify no data loss
  RETURN QUERY
  SELECT 
    'data_integrity'::text,
    CASE WHEN COUNT(*) = (SELECT COUNT(*) FROM admin_backup) 
         THEN 'PASS' ELSE 'FAIL' END::text,
    'Admin records: ' || COUNT(*)::text
  FROM admin;
  
  -- Check 2: Verify new columns exist
  RETURN QUERY
  SELECT 
    'schema_update'::text,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'admin' AND column_name = 'trial_payment_intent_id'
    ) THEN 'PASS' ELSE 'FAIL' END::text,
    'New trial tracking columns added'::text;
END;
$$ LANGUAGE plpgsql;
```

### Phase 3: Stripe Product Configuration (Day 2)
**Duration**: 1 hour
**Risk Level**: Low (external configuration)

#### 3.1 Create New Subscription Products in Stripe Dashboard
```javascript
// New subscription products to create in Stripe Dashboard
const newSubscriptionProducts = {
  starter_subscription: {
    name: 'Starter Plan',
    billing: 'monthly',
    amount: 2900, // $29.00
    trial_period_days: 14,
    currency: 'usd'
  },
  professional_subscription: {
    name: 'Professional Plan', 
    billing: 'monthly',
    amount: 7900, // $79.00
    trial_period_days: 14,
    currency: 'usd'
  },
  enterprise_subscription: {
    name: 'Enterprise Plan',
    billing: 'monthly', 
    amount: 19900, // $199.00
    trial_period_days: 14,
    currency: 'usd'
  }
};
```

#### 3.2 Update Configuration with Feature Flags
```typescript
// Enhanced stripe-config.ts with backward compatibility
export const STRIPE_PRODUCTS = {
  enterprise: {
    id: 'prod_SDzjYH1yYqyelf',
    priceId: 'price_1RJXjjCDShtAyWWlL0WQc0I8', // Legacy one-time
    subscriptionPriceId: 'price_NEW_ENTERPRISE_SUBSCRIPTION', // New subscription
    name: 'Enterprise',
    description: 'For large property management companies',
    price: 199,
    mode: 'subscription' as const,
    trialDays: 14,
    features: [/* existing features */],
    useTrialFlow: true, // Feature flag
  },
  // ... other products
};
```

### Phase 4: Backend Integration (Day 2-3)
**Duration**: 4-6 hours
**Risk Level**: Medium (core business logic)

#### 4.1 Enhanced Checkout Session Creation
```typescript
// Key changes to stripe-checkout/index.ts
const sessionParams: any = {
  customer: customerId,
  mode: 'subscription',
  success_url: `${success_url}`,
  cancel_url: `${cancel_url}`,
  allow_promotion_codes: true,
  billing_address_collection: "auto",
  payment_method_collection: "always", // Critical for trial
  subscription_data: {
    trial_period_days: 14,
    trial_settings: {
      end_behavior: {
        missing_payment_method: 'cancel'
      }
    },
    metadata: {
      user_id: user.id,
      admin_id: adminData.id,
      tier: tier,
      trial_start: new Date().toISOString(),
    },
  },
  line_items: [{
    price: product.subscriptionPriceId || product.priceId,
    quantity: 1,
  }],
  metadata: {
    user_id: user.id,
    admin_id: adminData.id,
    tier: tier,
    integration_version: 'v2_trial',
  },
};
```

#### 4.2 Comprehensive Webhook Enhancement
```typescript
// Enhanced webhook handlers in stripe-webhook/index.ts
switch (event.type) {
  case "checkout.session.completed": {
    const session = event.data.object;
    
    // Handle subscription checkout with trial
    if (session.mode === 'subscription' && session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      // Update admin record with trial information
      const trialEnd = subscription.trial_end 
        ? new Date(subscription.trial_end * 1000).toISOString()
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      
      await supabase
        .from("admin")
        .update({
          subscription_status: 'trialing',
          subscription_tier: tier,
          trial_started_at: new Date().toISOString(),
          trial_ends_at: trialEnd,
          payment_method_authorized: true,
        })
        .eq("id", session.metadata.admin_id);
      
      // Create/update subscription record
      await supabase
        .from("stripe_subscriptions")
        .upsert({
          customer_id: session.customer,
          subscription_id: subscription.id,
          price_id: subscription.items.data[0]?.price.id,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          status: subscription.status,
        }, { onConflict: "customer_id" });
    }
    break;
  }
  
  case "customer.subscription.trial_will_end": {
    const subscription = event.data.object;
    
    // Send trial ending notification (3 days before)
    console.log(`Trial ending soon for subscription: ${subscription.id}`);
    // TODO: Implement email notification
    break;
  }
  
  case "invoice.payment_succeeded": {
    const invoice = event.data.object;
    
    if (invoice.subscription) {
      // Trial has converted to paid subscription
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      
      await supabase
        .from("admin")
        .update({
          subscription_status: 'active',
        })
        .eq("customer_id", invoice.customer);
    }
    break;
  }
}
```

### Phase 5: Frontend Integration (Day 3-4)
**Duration**: 3-4 hours
**Risk Level**: Low (UI changes)

#### 5.1 Enhanced Authentication Store
```typescript
// Key changes to authStore.ts
const subscription_status = admin.subscription_status;
const stripe_status = subscription?.subscription_status;
const trial_end = admin.trial_ends_at ? new Date(admin.trial_ends_at) : null;
const now = new Date();

// Enhanced trial logic
if (subscription_status === 'trialing') {
  if (trial_end && now < trial_end) {
    hasActiveSubscription = admin.payment_method_authorized || false;
    console.log('Active trial period with payment authorization');
  } else {
    isTrialExpired = true;
    requiresPayment = true;
    console.log('Trial expired, payment required');
  }
} else if (stripe_status === 'active') {
  hasActiveSubscription = true;
  console.log('Active paid subscription');
}
```

#### 5.2 Trial Status UI Components
```typescript
// Enhanced StartTrialPage.tsx
const trialBenefits = [
  '14-day free trial with full access',
  'Payment method secured for seamless transition',
  'No charges during trial period',
  'Cancel anytime before trial ends',
  'Automatic billing starts after trial expires'
];
```

### Phase 6: Testing & Validation (Day 4-5)
**Duration**: 6-8 hours
**Risk Level**: Critical (validation phase)

#### 6.1 Automated Testing Suite
```typescript
// Test scenarios to implement
const testScenarios = [
  {
    name: 'existing_subscriber_preservation',
    description: 'Verify existing subscribers maintain access',
    steps: [
      'Query existing active subscriptions',
      'Verify no disruption to current billing',
      'Confirm UI displays correct status'
    ]
  },
  {
    name: 'new_trial_signup_flow',
    description: 'Test complete trial signup process',
    steps: [
      'Register new user',
      'Complete trial signup with test card',
      'Verify trial status in database',
      'Confirm 14-day access period'
    ]
  },
  {
    name: 'trial_to_paid_conversion',
    description: 'Test automatic trial conversion',
    steps: [
      'Create trial subscription',
      'Fast-forward to trial end (Stripe test mode)',
      'Verify automatic payment processing',
      'Confirm status change to active'
    ]
  },
  {
    name: 'trial_cancellation',
    description: 'Test trial cancellation before payment',
    steps: [
      'Create trial subscription',
      'Cancel before trial end',
      'Verify no payment processed',
      'Confirm access termination'
    ]
  }
];
```

#### 6.2 Data Integrity Validation
```sql
-- Validation queries to run after each phase
-- Check 1: No existing subscribers affected
SELECT 
  'existing_subscribers' as check_name,
  COUNT(*) as count,
  'Should remain unchanged' as expected
FROM admin 
WHERE subscription_status = 'active' 
AND trial_started_at IS NULL;

-- Check 2: New trial users properly configured
SELECT 
  'new_trial_users' as check_name,
  COUNT(*) as count,
  'Should have trial_ends_at set' as expected
FROM admin 
WHERE subscription_status = 'trialing' 
AND trial_ends_at IS NOT NULL;

-- Check 3: Payment authorization tracking
SELECT 
  'payment_authorization' as check_name,
  COUNT(*) as count,
  'Should match trial users' as expected
FROM admin 
WHERE payment_method_authorized = true;
```

## 3. Risk Mitigation Strategies

### 3.1 Feature Flag Implementation
```typescript
// Feature flag system for gradual rollout
export const FEATURE_FLAGS = {
  STRIPE_TRIAL_V2: {
    enabled: process.env.VITE_ENABLE_TRIAL_V2 === 'true',
    rolloutPercentage: 10, // Start with 10% of new users
  }
};

// Usage in checkout flow
const useTrialFlow = FEATURE_FLAGS.STRIPE_TRIAL_V2.enabled && 
  Math.random() < (FEATURE_FLAGS.STRIPE_TRIAL_V2.rolloutPercentage / 100);
```

### 3.2 Rollback Procedures

#### Database Rollback
```sql
-- Rollback script (if needed)
BEGIN;

-- Remove new columns (if safe)
ALTER TABLE admin DROP COLUMN IF EXISTS trial_payment_intent_id;
ALTER TABLE admin DROP COLUMN IF EXISTS trial_setup_intent_id;
ALTER TABLE admin DROP COLUMN IF EXISTS payment_method_authorized;

-- Restore from backup (if necessary)
-- psql -h your-db-host -U postgres -d your-db < backup_pre_trial_TIMESTAMP.sql

COMMIT;
```

#### Code Rollback
```bash
# Git rollback commands
git tag pre-trial-integration
git checkout pre-trial-integration  # If rollback needed
```

### 3.3 Monitoring & Alerting
```typescript
// Critical metrics to monitor
const monitoringMetrics = {
  subscription_creation_rate: 'Should remain stable or increase',
  payment_failure_rate: 'Should not increase significantly',
  trial_conversion_rate: 'Target: 15-25%',
  existing_subscriber_churn: 'Should remain at baseline',
  webhook_processing_errors: 'Should be < 1%'
};
```

## 4. Edge Case Handling

### 4.1 Existing Subscribers
```typescript
// Preserve existing subscriber experience
if (adminData.subscription_status === 'active' && !adminData.trial_started_at) {
  // This is an existing subscriber - maintain current flow
  return createLegacyCheckoutSession(product);
} else {
  // New user or trial user - use new trial flow
  return createTrialCheckoutSession(product);
}
```

### 4.2 Failed Payment Authorization
```typescript
// Handle setup intent failures
case "setup_intent.setup_failed": {
  const setupIntent = event.data.object;
  
  // Update admin record to reflect authorization failure
  await supabase
    .from("admin")
    .update({
      subscription_status: 'setup_failed',
      payment_method_authorized: false,
    })
    .eq("trial_setup_intent_id", setupIntent.id);
  
  // Send notification to user about payment method issue
  break;
}
```

### 4.3 Webhook Delivery Failures
```typescript
// Implement webhook retry logic with exponential backoff
const processWebhookWithRetry = async (event, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await processWebhookEvent(event);
      return { success: true };
    } catch (error) {
      console.error(`Webhook processing attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        // Log to error tracking service
        await logCriticalError('webhook_processing_failed', {
          eventId: event.id,
          eventType: event.type,
          error: error.message,
          attempts: maxRetries
        });
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};
```

## 5. Implementation Steps

### Step 1: Database Preparation
```bash
# 1. Create backup
npm run db:backup

# 2. Run schema migration
npm run db:migrate:trial-support

# 3. Validate migration
npm run db:validate:trial-migration
```

### Step 2: Stripe Configuration
```bash
# 1. Create new subscription products in Stripe Dashboard
# 2. Update environment variables with new price IDs
# 3. Test webhook endpoints with Stripe CLI
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

### Step 3: Code Deployment
```bash
# 1. Deploy with feature flag disabled
VITE_ENABLE_TRIAL_V2=false npm run build
npm run deploy

# 2. Enable for 10% of users
VITE_ENABLE_TRIAL_V2=true npm run deploy

# 3. Monitor metrics for 24 hours

# 4. Gradually increase rollout
# 25% -> 50% -> 100% over 1 week
```

### Step 4: Validation & Monitoring
```typescript
// Automated validation checks
const validationChecks = [
  {
    name: 'existing_subscribers_unaffected',
    query: `SELECT COUNT(*) FROM admin WHERE subscription_status = 'active' AND created_at < '${deploymentDate}'`,
    expected: 'Should equal pre-deployment count'
  },
  {
    name: 'new_trials_working',
    query: `SELECT COUNT(*) FROM admin WHERE subscription_status = 'trialing' AND trial_ends_at > now()`,
    expected: 'Should be > 0 if new signups occurred'
  },
  {
    name: 'payment_authorization_rate',
    query: `SELECT AVG(CASE WHEN payment_method_authorized THEN 1 ELSE 0 END) FROM admin WHERE subscription_status = 'trialing'`,
    expected: 'Should be > 0.95 (95% success rate)'
  }
];
```

## 6. Success Metrics

### 6.1 Technical Metrics
- **Zero data loss**: All existing subscription data preserved
- **Zero downtime**: No service interruption during deployment
- **Payment authorization rate**: >95% for new trial signups
- **Webhook processing success**: >99% success rate
- **Database query performance**: No degradation in response times

### 6.2 Business Metrics
- **Trial conversion rate**: Target 15-25%
- **Existing subscriber retention**: Maintain current rates
- **New user acquisition**: Should increase with trial offering
- **Support ticket volume**: Should not increase significantly

## 7. Rollback Triggers

### Immediate Rollback Required If:
- **Data corruption detected**: Any loss of existing subscription data
- **Payment processing failures**: >5% increase in payment failures
- **Existing subscriber impact**: Any disruption to current subscribers
- **Critical webhook failures**: >1% webhook processing failure rate
- **Database performance degradation**: >20% increase in query times

### Rollback Procedure:
```bash
# 1. Disable feature flag immediately
VITE_ENABLE_TRIAL_V2=false npm run deploy:emergency

# 2. Revert to previous deployment
git checkout pre-trial-integration
npm run deploy:emergency

# 3. Restore database if needed
psql -h your-db-host -U postgres -d your-db < backup_pre_trial_TIMESTAMP.sql

# 4. Validate system restoration
npm run test:integration
npm run db:validate:rollback
```

## 8. Post-Implementation Monitoring

### Week 1: Intensive Monitoring
- **Daily validation checks**: Run all automated tests
- **Manual testing**: Test critical user flows daily
- **Metrics review**: Daily review of all success metrics
- **Error monitoring**: Real-time alerts for any failures

### Week 2-4: Standard Monitoring
- **Weekly validation**: Automated test suite
- **Bi-weekly metrics review**: Business and technical metrics
- **Monthly optimization**: Performance tuning and improvements

## 9. Documentation Updates

### 9.1 Technical Documentation
- Update API documentation for new webhook events
- Document new database schema changes
- Create troubleshooting guide for trial-related issues

### 9.2 User Documentation
- Update user guides to explain trial process
- Create FAQ for trial and billing questions
- Update support scripts for trial-related inquiries

## 10. Conclusion

This integration plan provides a comprehensive, low-risk approach to implementing Stripe subscription trials while preserving existing functionality. The phased approach with feature flags, comprehensive testing, and detailed rollback procedures ensures minimal risk to your production system.

**Key Success Factors:**
1. **Backward Compatibility**: Existing subscribers are completely unaffected
2. **Gradual Rollout**: Feature flags allow controlled deployment
3. **Comprehensive Testing**: Multiple validation layers ensure reliability
4. **Quick Rollback**: Clear procedures for immediate issue resolution
5. **Monitoring**: Detailed metrics tracking for early issue detection

**Timeline Summary:**
- **Day 1**: Preparation and database enhancement
- **Day 2-3**: Stripe configuration and backend integration
- **Day 4-5**: Testing and validation
- **Week 1**: Gradual rollout with intensive monitoring
- **Week 2-4**: Full deployment with standard monitoring

This plan ensures a successful integration while maintaining the highest standards of data integrity and system reliability.
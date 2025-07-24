# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Stripe Subscription Trial**: Implemented proper Stripe subscription model with 14-day free trial
  - Updated checkout flow to create subscriptions instead of one-time payments
  - Added `trial_period_days: 14` to checkout session creation
  - Enhanced webhook handling for subscription lifecycle events
  - Added support for `customer.subscription.trial_will_end`, `customer.subscription.created`, `customer.subscription.deleted`, and `invoice.payment_failed` webhooks
  - Updated frontend UI to clearly display trial status and benefits
  - Improved subscription status logic in authStore to handle trial periods correctly
  - Added `trialDays` property to Stripe product configuration
  - Enhanced trial status display in StartTrialPage and SubscriptionPage

### Technical Details
- Modified `supabase/functions/stripe-checkout/index.ts` to create subscription checkout sessions with trial periods
- Enhanced `supabase/functions/stripe-webhook/index.ts` with comprehensive subscription event handling
- Updated `src/store/authStore.ts` subscription status determination logic for trial periods
- Improved UI components to better communicate trial benefits and status
- Added proper handling for subscription status transitions (trialing → active → past_due → canceled)

### Benefits
- Users can now start using the platform immediately with a true 14-day free trial
- Payment method is authorized (not charged) during signup for seamless trial-to-paid conversion
- Automatic billing occurs after trial expires unless cancelled
- Better user experience with clear trial status communication
- Robust webhook handling ensures accurate subscription state synchronization

### Fixed
- **CRITICAL**: Fixed hasActiveSubscription logic for trialing users with payment setup
- Trial users who have provided payment details (customer_id present) now correctly have hasActiveSubscription set to true
- This resolves authentication flow issues where users with active trials and payment setup were incorrectly blocked from dashboard access
- Prevents infinite redirect loops and ensures proper access control for trial users who have completed payment setup

### Added
- **Database Schema**: Added `reports` table to store inspection report metadata
  - Table includes `id`, `inspection_id`, `report_url`, `report_type`, `generated_at`, `created_at`, `updated_at` columns
  - Added proper indexes for `inspection_id` and `generated_at` for efficient querying
  - Enabled Row Level Security (RLS) with policy for team member access
  - Added `updated_at` trigger for automatic timestamp updates
  - This resolves the 400 error when accessing the Reports page and enables PDF report storage/retrieval

### Fixed
- **CRITICAL**: Fixed hasActiveSubscription logic to correctly return false for trial users without customer_id
- Trial users without payment setup (customer_id is null) now have hasActiveSubscription set to false
- Added needsPaymentSetup property to all set() calls in authStore to ensure proper redirection logic
- Enhanced console logging to track needsPaymentSetup calculation and inclusion in store state
- Removed handleAuthError call from initialize() catch block to prevent infinite redirect loops
- This ensures new users are properly redirected to /start-trial page instead of accessing dashboard

### Fixed
- Fixed hasActiveSubscription logic to require customer_id for trial users
- Trial users without payment setup (customer_id is null) now correctly have hasActiveSubscription set to false
- This ensures new users are properly redirected to /start-trial page instead of accessing dashboard
- Added needsPaymentSetup property to authStore set() call to enable proper redirection logic
- Moved /start-trial route outside of AuthLayout to prevent authenticated user redirect issues
- Enhanced debug logging to track subscription status determination and route guard behavior

### Fixed
### Fixed
- Fixed redirect logic for trialing users with NULL customer_id to properly route to StartTrialPage
- This ensures new users complete the payment setup flow before accessing the main application

### Fixed
- Fixed StartTrialPage redirect logic to prevent trial users from being immediately redirected to dashboard
- Modified redirect condition in StartTrialPage to only redirect users with active paid subscriptions (`subscription_status === 'active'`)
- Trial users (`subscription_status === 'trialing'`) now remain on StartTrialPage to complete plan selection
- This resolves the regression where new users were bypassing the plan selection flow after email confirmation

### Fixed
- Fixed authentication flow to properly redirect new users to start-trial page after email confirmation
- Simplified subscription status logic in authStore to correctly identify new users vs. users requiring payment
- Removed overly restrictive `requiresPayment` logic that was blocking new users from accessing start-trial page
- AuthCallbackPage now consistently redirects to `/start-trial` after successful email confirmation
- New users (with no admin data or `subscription_status` of `not_started`) are no longer incorrectly flagged as requiring payment

### Fixed
- Fixed email confirmation redirect URL to properly route to `/auth/callback` instead of root path
- Ensured both `signUp` and `resendConfirmationEmail` functions use the correct `emailRedirectTo` URL
- This resolves the issue where clicking email confirmation links would redirect to the landing page instead of the AuthCallbackPage

### Fixed
- Fixed AuthCallbackPage error handling to prevent premature session clearing during PKCE flow
- Improved error handling for `flow_state_expired` errors during email confirmation
- Prevented `supabase.auth.signOut()` from being called when `getSession()` fails during callback, which was clearing necessary PKCE state from localStorage
- Enhanced AuthCallbackPage with comprehensive debugging and better PKCE flow handling
- Added explicit code exchange attempt using `exchangeCodeForSession()` method
- Improved error messages for different types of authentication failures
- Added debug information display in development mode

### Technical Details
- Modified `src/pages/auth/AuthCallbackPage.tsx` to handle session errors more gracefully
- Added better error logging to distinguish between different types of authentication failures
- Improved retry mechanism for authentication callback timeouts
- Implemented explicit PKCE code exchange before falling back to session retrieval
- Added localStorage verification for PKCE verifier presence
- Enhanced user experience with specific error messages for expired confirmation links

### Known Issues
- ~~Email confirmation links may contain duplicate `type=signup` parameters~~ - FIXED
- Investigation ongoing for persistent PKCE flow issues despite code exchange improvements

## [Previous Versions]
- Initial project setup and core functionality implementation
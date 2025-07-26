# Changelog

All notable changes to this project will be documented in this file.

## Core Application Functions

### User Management System
1. **User Role Hierarchy**: The system supports different user types with distinct access levels:
   - **Owners**: Full administrative access, can manage company settings, billing, and all users
   - **Admins**: Administrative access to manage properties, templates, and inspections
   - **Members**: Invited users with limited access and specific role-based permissions

2. **Onboarding Flow**: Structured user onboarding process ensures proper payment setup:
   - User registers and receives email confirmation
   - After email confirmation, user is redirected to start-trial page
   - User must enter card details and complete payment setup
   - Dashboard access is granted only after successful payment method authorization
   - This ensures all trial users have valid payment methods for seamless conversion

3. **Trial and Billing System**: Fair and transparent billing model:
   - 14-day free trial period with full feature access
   - Payment method is authorized (not charged) during trial signup
   - Clients are only charged after the 14-day trial period expires
   - Users can cancel anytime before trial ends to avoid charges
   - Automatic conversion to paid subscription if not cancelled

### Technical Implementation
- Row Level Security (RLS) policies enforce role-based access control
- Comprehensive user session validation and authentication flows
- Stripe integration with proper trial period handling and webhook processing
- Automated user profile and company record creation via database triggers

## [Unreleased]

### Added
- **Storage Infrastructure**: Created Supabase storage buckets for file management
  - `inspection-photos` bucket for storing inspection images (5MB limit, public access)
  - `inspection-reports` bucket for storing PDF reports (50MB limit, authenticated access)
  - Implemented Row Level Security policies for organization-based file access
  - Support for JPEG, PNG, WebP images and PDF documents
  - Proper file organization with inspection-based folder structure

### Fixed
- **CRITICAL**: Fixed email confirmation redirect URLs to consistently use production URL (app.scopostay.com)
- Updated signUp and resendConfirmationEmail functions to use getSiteUrl() instead of window.location.origin
- This ensures email confirmation links always point to the correct production domain regardless of environment
- Resolves issues where email confirmation links might point to localhost during development

### Fixed
- **CRITICAL**: Fixed email confirmation redirect flow to properly route new users to start-trial page
- Updated email confirmation URLs to use current site origin instead of hardcoded production URL
- Enhanced AuthCallbackPage navigation with replace: true to prevent back button issues
- Improved logging in authStore to better track subscription state determination
- This ensures new users who confirm their email are correctly redirected to /start-trial instead of login page

### Fixed
- **CRITICAL**: Fixed trial user redirect logic to properly route new users to start-trial page
- Trial users with NULL customer_id (haven't completed payment setup) now correctly have needsPaymentSetup=true
- This ensures new users are redirected to /start-trial instead of accessing dashboard prematurely
- Enhanced logging to track subscription state determination for better debugging
- Fixed edge case where trialing users without payment setup were incorrectly granted dashboard access

### Fixed
- **CRITICAL**: Fixed new user redirect flow to properly route to start-trial page after email confirmation
- Removed dev mode override that was incorrectly setting needsPaymentSetup to false for all users
- New users who confirm their email will now be correctly redirected to /start-trial instead of dashboard
- This ensures proper subscription setup flow for all new signups regardless of environment

### Added
- **Email Automation System**: Implemented scheduled trial expiration reminder emails using Amazon SES
  - Created `send-trial-reminder` Supabase Edge Function for automated email delivery
  - Added `trial_reminder_7day_sent` tracking column to `admin` table to prevent duplicate emails
  - Integrated Amazon SES SDK for reliable transactional email delivery
  - Implemented comprehensive email template with HTML and text versions
  - Added external scheduler support (cron-job.org, GitHub Actions, Vercel Cron)
  - Built-in error handling, retry logic, and comprehensive logging
  - Supports both development and production environments with proper email verification

### Technical Details
- New Edge Function: `supabase/functions/send-trial-reminder/index.ts`
- Database migration: `add_trial_reminder_tracking.sql` adds tracking column and index
- AWS SES integration with proper IAM permissions and security best practices
- Scheduled execution via external cron services (daily at 9 AM UTC)
- Comprehensive setup documentation in `SCHEDULED_FUNCTION_SETUP.md`
- Email templates include company branding and clear call-to-action buttons
- Function processes users whose trial ends in exactly 7 days and haven't received reminder yet
- Automatic database flag updates to prevent duplicate email sends
- Built-in rate limiting and delays to respect SES sending limits

### Benefits
- Proactive customer engagement 7 days before trial expiration
- Reduces involuntary churn by giving users advance notice
- Professional HTML email templates with responsive design
- Scalable architecture that can be extended for other email automations
- Comprehensive error handling and monitoring capabilities
- Zero impact on existing subscription functionality

### Added
- **Email Automation System**: Implemented scheduled trial expiration reminder emails using Amazon SES
  - Created `send-trial-reminder` Supabase Edge Function for automated email delivery
  - Added `trial_reminder_7day_sent` tracking column to `admin` table to prevent duplicate emails
  - Integrated Amazon SES SDK for reliable transactional email delivery
  - Implemented comprehensive email template with HTML and text versions
  - Added external scheduler support (cron-job.org, GitHub Actions, Vercel Cron)
  - Built-in error handling, retry logic, and comprehensive logging
  - Supports both development and production environments with proper email verification

### Technical Details
- New Edge Function: `supabase/functions/send-trial-reminder/index.ts`
- Database migration: `add_trial_reminder_tracking.sql` adds tracking column and index
- AWS SES integration with proper IAM permissions and security best practices
- Scheduled execution via external cron services (daily at 9 AM UTC)
- Comprehensive setup documentation in `SCHEDULED_FUNCTION_SETUP.md`
- Email templates include company branding and clear call-to-action buttons
- Function processes users whose trial ends in exactly 7 days and haven't received reminder yet
- Automatic database flag updates to prevent duplicate email sends
- Built-in rate limiting and delays to respect SES sending limits

### Benefits
- Proactive customer engagement 7 days before trial expiration
- Reduces involuntary churn by giving users advance notice
- Professional HTML email templates with responsive design
- Scalable architecture that can be extended for other email automations
- Comprehensive error handling and monitoring capabilities
- Zero impact on existing subscription functionality

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
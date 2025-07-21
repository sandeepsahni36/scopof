## [Unreleased]

### Added
- **ACCESS RESTRICTED PAGE**: Added dedicated page for non-admin members when company subscription is inactive
- Created AccessRestrictedPage component with clear messaging for members to contact their administrator
- Enhanced user experience by providing role-specific messaging based on admin status
- Added proper routing logic to differentiate between admin and member access restrictions
- Implemented user-friendly interface with company information and support contact details

### Fixed
- **MEMBER ACCESS CONTROL**: Enhanced ProtectedRoute to handle different user roles during subscription restrictions
- **ADMIN ROUTE PROTECTION**: Improved AdminRoute component with better authentication and role checking
- **ROLE-BASED REDIRECTS**: Implemented different redirect paths for admins vs members when payment is required
- Non-admin members are now directed to access restricted page instead of subscription management
- Admins continue to be directed to subscription required page where they can upgrade the plan
- Enhanced user experience by providing appropriate messaging based on user role and permissions
- **TRIAL RESTRICTION**: Disabled further trial access once trial is completed or expired
- **ROUTE PROTECTION**: Protected StartTrialPage route to prevent access by users with active subscriptions
- **AUTOMATIC REDIRECTS**: Users with active subscriptions are automatically redirected to dashboard from trial page
- **EXPIRED TRIAL HANDLING**: Users with expired trials are redirected to subscription required page instead of trial page
- **SUBSCRIPTION FLOW**: Streamlined user flow to prevent confusion between trial and paid subscription states

### Fixed
- **CRITICAL**: Fixed infinite recursion in admin table RLS policies causing 500 errors
- **CRITICAL**: Resolved "infinite recursion detected in policy for relation \"admin\"" error
- **CRITICAL**: Fixed authentication failures preventing users from accessing admin data
- **CRITICAL**: Implemented non-recursive admin RLS policies while maintaining security
- **CRITICAL**: Restored ability for users to access their company data and subscription status
- **CRITICAL**: Fixed Stripe checkout failures caused by admin data retrieval errors
- **CRITICAL**: Fixed infinite recursion in team_members table RLS policies
- **CRITICAL**: Resolved circular dependencies between admin and team_members RLS policies
- **CRITICAL**: Eliminated "infinite recursion detected in policy for relation" errors during authentication
- **CRITICAL**: Implemented non-recursive team_members RLS policies using direct auth.uid() checks
- **CRITICAL**: Fixed authentication store initialization failures caused by RLS policy conflicts
- **CRITICAL**: Restored proper access control for team member data without circular references

### Security
- **Admin RLS Policy Security Fix**: Completely rewrote admin table RLS policies to eliminate recursion
- Enhanced policy structure to prevent circular dependencies while maintaining access control
- Maintained owner and team member access levels without recursive policy evaluations
- Fixed authentication flow by ensuring admin data can be properly retrieved
- **Team Members RLS Policy Security Fix**: Completely rewrote team_members table RLS policies to eliminate recursion
- Enhanced policy structure to prevent circular dependencies with admin table policies
- Implemented direct auth.uid() checks to avoid recursive policy evaluations
- Maintained proper role-based access control without creating infinite loops
- Fixed policy conflicts that were causing database query failures during authentication

### Database
- **Critical RLS Fix**: Replaced recursive admin policies with direct auth.uid() checks
- Enhanced policy structure to prevent infinite loops during admin data queries
- Improved database query performance by removing recursive policy evaluations
- Added proper access control checks that don't reference the same table being queried
- **Critical Team Members RLS Fix**: Replaced recursive team_members policies with non-circular implementations
- Enhanced policy structure to prevent infinite loops during team member data queries
- Implemented direct subqueries to admin table that don't create circular dependencies
- Improved database query performance by eliminating recursive policy evaluations
- Added proper access control checks that maintain security without causing recursion

### Fixed
- **STRIPE CHECKOUT DEBUGGING**: Added comprehensive logging to stripe-checkout function for existing customer troubleshooting
- Enhanced error tracking for expired trial users attempting to resubscribe
- Added detailed logging for customer verification and checkout session creation process
- Improved error messages and debugging information for Stripe integration issues
- Added verification step for existing Stripe customers to ensure they haven't been deleted
- Enhanced logging for admin record updates and database operations during checkout process

### Fixed
- **STRIPE CHECKOUT DEBUGGING**: Added comprehensive logging to stripe-checkout function for existing customer troubleshooting
- Enhanced error tracking for expired trial users attempting to resubscribe
- Added detailed logging for customer verification and checkout session creation process
- Improved error messages and debugging information for Stripe integration issues
- Added verification step for existing Stripe customers to ensure they haven't been deleted
- Enhanced logging for admin record updates and database operations during checkout process
- **CRITICAL**: Fixed infinite recursion in RLS policies for team_members table
- **CRITICAL**: Resolved 500 errors when accessing templates and properties pages
- **CRITICAL**: Fixed overly permissive admin_select_all policy that allowed all authenticated users to access all admin records
- **CRITICAL**: Eliminated circular dependencies in team_members RLS policies that were causing database query failures
- **CRITICAL**: Implemented non-recursive RLS policies for admin and team_members tables while maintaining proper role-based access control

### Security
- **RLS Policy Security Enhancement**: Replaced broad admin_select_all policy with restrictive admin_select_authorized policy
- Enhanced team_members table security by implementing proper access control without recursion
- Maintained owner and team member access levels while preventing unauthorized data access
- Fixed potential security vulnerability where all authenticated users could query admin records

### Database
- **Critical RLS Fix**: Completely rewrote admin and team_members RLS policies to eliminate recursion
- Enhanced policy structure to prevent circular dependencies while maintaining functionality
- Improved database query performance by removing recursive policy evaluations
- Added proper access control checks that don't reference the same table being queried

### Added
- **REPORT SERVICE TEAMS FEATURE**: Added comprehensive report recipient management system
- Created `report_service_teams` table to store company-specific team designations and email addresses
- Added `report_recipient_id` column to `template_items` table for linking items to specific report recipients
- Implemented proper foreign key relationships with CASCADE delete for admin and SET NULL for recipient deletion
- Added Row Level Security (RLS) policies to ensure only authorized users can manage report service teams
- Created database indexes for optimal performance when querying report service teams and template items
- Added automated `updated_at` trigger for report service teams table to track modifications
- Enhanced template system to support dropdown-based report recipient selection instead of manual email entry
- **CRITICAL FIX**: Corrected user registration flow to prevent bypassing trial setup
- Email verification trigger no longer automatically starts trial or creates Stripe records
- New users now properly redirected to start-trial page after email verification
- Subscription status remains 'not_started' until user completes payment setup
- Stripe customer and subscription records only created when user initiates actual payment
- Fixed authentication flow to ensure all new users go through proper trial setup process
- Database triggers updated to maintain 'not_started' status until payment is initiated
- Removed automatic trial activation from email verification to enforce proper payment flow
- **CRITICAL FIX**: Fixed email verification URL malformation issue
- Removed redundant `type: 'signup'` parameter from resendConfirmationEmail function
- Email verification links now generate clean URLs without duplicate parameters
- Resolved Supabase log errors showing malformed redirect URLs with duplicate type parameters
- Improved email verification flow reliability and user experience
- **TEMPLATE SYSTEM ENHANCEMENT**: Removed category dropdown from template creation interface
- Simplified template creation workflow by eliminating category selection requirement
- Updated template creation and editing forms to focus on core template functionality
- Removed category-related logic from template detail page for cleaner user experience
- Modified template API functions to no longer require or process category information
- Streamlined template management interface for improved usability and reduced complexity
- **TEMPLATE SECTIONS FEATURE**: Added hierarchical section support to template system
- Implemented "Section" item type that can contain unlimited child items (text, choice, photo)
- Added section naming functionality for better organization of template items
- Enhanced template builder UI with collapsible sections and nested item management
- Updated database schema to support parent-child relationships between template items
- Added drag-and-drop ordering within sections for improved template organization
- Implemented visual hierarchy with indentation and section expansion/collapse controls
- Enhanced template creation workflow with section-based organization capabilities
- **ENHANCED LOGGING**: Added comprehensive logging for Stripe webhook processing
- Added detailed logging for checkout session completion events
- Added logging for subscription updates and status changes
- Added logging for invoice payment events
- Enhanced error logging with detailed context information
- Added logging for customer creation and subscription lifecycle events
- **AUTHENTICATION LOGGING**: Added detailed logging for authentication state management
- Added logging for user session validation and profile fetching
- Added logging for admin status and subscription data retrieval
- Enhanced subscription status determination with detailed logging
- Added logging for trial expiration detection and enforcement
- Improved error logging for authentication state initialization
- **STRIPE INTEGRATION FIX**: Fixed critical issues with Stripe checkout and webhook functions
- Fixed error in stripe-checkout function when creating customer records
- Removed hardcoded ID generation for stripe_customers table to use database defaults
- Added proper trimming of webhook secret to prevent signature verification failures
- Enhanced error handling and logging for Stripe integration
- Fixed webhook signature verification by properly handling whitespace in secrets
- **STRIPE CUSTOMER PORTAL**: Added Stripe Customer Portal integration
- Created new edge function for generating Stripe Customer Portal sessions
- Added client-side utility function to access the Customer Portal
- Integrated Customer Portal with "Manage Billing" and "Add Payment Method" buttons
- Implemented proper return URL handling for seamless user experience
- **PAYMENT METHOD TRACKING**: Enhanced payment method tracking in subscriptions
- Added code to retrieve and store payment method details (brand and last4)
- Implemented payment method retrieval from multiple sources (subscription, payment intent, customer)
- Updated subscription record with payment method details for better user experience
- Added visual display of payment method information in the subscription page

### Changed
- **Report Management Enhancement**: Replaced manual email entry with structured team designation system
- Template items with reporting enabled now reference specific team members instead of free-form email addresses
- Enhanced data integrity by linking report recipients to validated company team members
- Improved user experience with dropdown selection for report recipients during template creation
- Enhanced user registration trigger to create only essential records initially
- Email verification process now redirects users to start-trial page instead of dashboard
- Subscription flow requires explicit plan selection before trial activation
- Stripe integration now properly handles trial-to-paid conversion workflow
- Authentication state management improved to handle subscription status transitions
- User onboarding flow enhanced to ensure proper payment setup completion
- Database schema optimized for better subscription status tracking and management
- Email verification URL generation improved to prevent parameter duplication
- Template creation interface simplified by removing category selection complexity
- Template management workflow streamlined for better user experience and efficiency
- Template item structure enhanced to support hierarchical organization with sections
- Template builder interface redesigned to accommodate section-based item grouping
- Database schema extended to support parent-child relationships in template items
- **Subscription Status Logic**: Completely revised subscription status determination
- Improved trial expiration detection with more robust date comparison
- Enhanced active subscription detection with proper status hierarchy
- Improved payment requirement determination with clearer logic flow
- Added explicit handling for NULL trial dates in subscription status checks
- Added dev mode override for payment requirements during development
- **Stripe Integration**: Improved Stripe checkout and webhook functions
- Enhanced error handling and logging in Stripe functions
- Removed hardcoded ID generation in favor of database defaults
- Added proper trimming of webhook secret to prevent signature verification failures
- Improved customer creation and management process
- **Subscription Management UI**: Enhanced subscription management interface
- Added functional "Manage Billing" button that opens Stripe Customer Portal
- Improved "Add Payment Method" button to direct users to Stripe Customer Portal
- Enhanced payment method display with brand and last4 information
- Improved subscription status indicators and messaging

### Fixed
- **CRITICAL**: Fixed potential data inconsistency in report recipient management
- **CRITICAL**: Resolved foreign key constraint issues when deleting team members or admin records
- **CRITICAL**: Fixed report recipient validation to ensure only valid team members can be selected
- **CRITICAL**: Fixed trial bypass vulnerability in user registration flow
- **CRITICAL**: Resolved authentication loop when users tried to access dashboard without payment
- **CRITICAL**: Fixed subscription status detection and enforcement throughout application
- **CRITICAL**: Corrected email verification redirect flow to prevent unauthorized dashboard access
- **CRITICAL**: Fixed Stripe customer creation timing to prevent orphaned records
- **CRITICAL**: Resolved email verification URL malformation causing broken confirmation links
- **CRITICAL**: Fixed duplicate parameter issue in email confirmation URLs
- **CRITICAL**: Resolved Supabase authentication errors related to malformed redirect URLs
- **CRITICAL**: Fixed trial expiration bypass vulnerability allowing unauthorized access
- **CRITICAL**: Resolved RLS policy conflicts causing 500 errors in admin data queries
- **CRITICAL**: Fixed NULL trial dates handling in admin table for proper subscription flow
- **CRITICAL**: Corrected policy naming conflicts preventing migration application
- **CRITICAL**: Enhanced authentication store logic to properly enforce trial expiration
- **CRITICAL**: Fixed Stripe checkout function error when creating customer records
- **CRITICAL**: Fixed webhook signature verification failures due to whitespace in secret
- **CRITICAL**: Fixed missing payment method details in subscription records
- **CRITICAL**: Added proper error handling for Stripe Customer Portal session creation
- Fixed template creation workflow by removing unnecessary category selection step
- Resolved template editing interface complexity by streamlining form fields
- Fixed template API functions to handle simplified data structure without categories
- Corrected template management interface to focus on essential functionality only
- Fixed template item hierarchy handling in database operations
- Resolved section expansion/collapse state management in template builder
- Fixed template item ordering within sections and across different hierarchy levels
- Corrected template data transformation between flat and hierarchical structures
- Fixed non-functional "Manage Billing" and "Add Payment Method" buttons in subscription page

### Security
- **Report Service Teams Security**: Implemented comprehensive access control for report recipient management
- Enhanced RLS policies to ensure only company admins can manage their team designations
- Secured report recipient selection to prevent unauthorized access to other companies' team information
- Added proper validation for report recipient assignments during template creation and editing
- **Critical Security Fix**: Prevented unauthorized access to dashboard without payment setup
- Enhanced authentication flow security to ensure all users complete proper trial setup
- Secured payment flow to prevent bypassing subscription requirements
- Database triggers now maintain proper security boundaries during user registration
- Improved session validation to prevent unauthorized access to premium features
- **Email Security Enhancement**: Fixed email verification URL generation to prevent malformed links
- Secured email verification process against URL manipulation attacks
- Enhanced email confirmation flow security with proper parameter validation
- **Template Security Enhancement**: Improved template access control with hierarchical item support
- Enhanced template creation security by validating section-item relationships
- Secured template modification operations to prevent unauthorized hierarchy manipulation
- Added proper validation for section naming and item organization within templates
- **Critical Trial Security Fix**: Completely rewrote RLS policies to prevent trial bypass
- Enhanced policy structure to properly validate subscription status and trial expiration
- Implemented comprehensive role-based access control across all database tables
- Fixed policy conflicts and naming issues that were causing authentication errors
- Added robust trial expiration enforcement at the database level
- **Stripe Integration Security**: Enhanced security of Stripe integration
- Improved webhook signature verification with proper secret handling
- Added comprehensive logging for all Stripe operations for better audit trails
- Enhanced error handling to prevent security issues during payment processing
- **Customer Portal Security**: Implemented secure access to Stripe Customer Portal
- Added proper authentication checks before creating Customer Portal sessions
- Ensured only authorized users can access their own billing information
- Implemented secure return URL handling to prevent open redirects

### Database
- **Report Service Teams Schema**: Added new `report_service_teams` table with proper constraints and relationships
- Enhanced `template_items` table with `report_recipient_id` foreign key for structured report recipient management
- Implemented proper CASCADE and SET NULL behaviors for data integrity during deletions
- Added database indexes for efficient querying of report service teams and template item relationships
- Created comprehensive RLS policies for secure access control of report recipient data
- Updated user registration triggers to create minimal initial records
- Modified email verification triggers to maintain 'not_started' subscription status
- Enhanced subscription status tracking with proper state transitions
- Improved database constraints for subscription and trial management
- Added proper foreign key relationships for Stripe customer data
- Enhanced database schema to support hierarchical template items with parent-child relationships
- Added new columns (parent_id, section_name) to template_items table for section functionality
- Implemented database constraints to ensure proper section hierarchy and prevent circular references
- Added indexes for efficient querying of hierarchical template item structures
- Enhanced template item ordering system to work within section-based organization
- **Critical Schema Fix**: Modified admin table to make trial_started_at and trial_ends_at nullable
- Updated handle_new_user function to set NULL trial dates for new users with 'not_started' status
- Fixed user_admin_status view to properly handle NULL trial dates
- Completely rewrote all RLS policies with improved conflict handling and naming
- Enhanced policy structure to prevent unauthorized access after trial expiration
- Added comprehensive postgres policies for system operations
- **Stripe Integration Database**: Enhanced Stripe-related tables
- Added IDENTITY columns for automatic ID generation in Stripe tables
- Added unique constraint on checkout_session_id in stripe_orders table
- Updated stripe_subscriptions table to store payment method details
- Improved database schema for better Stripe integration

### Performance
- **Report Management Performance**: Optimized database queries for report service team lookups
- Enhanced template creation performance by reducing redundant email validation operations
- Improved report recipient selection with efficient dropdown population from database
- Optimized authentication state management for faster session validation
- Improved subscription status checking to reduce unnecessary API calls
- Enhanced email verification process to minimize redirect delays
- Streamlined user onboarding flow for better performance and user experience
- Optimized template creation interface by removing unnecessary category loading operations
- Improved template management performance by simplifying data structure and API calls
- Enhanced template builder performance with efficient section state management
- Optimized hierarchical template item queries with proper database indexing
- **Database Performance**: Improved RLS policy efficiency with better query optimization
- Enhanced policy structure to reduce database load during authentication checks
- Optimized subscription status queries with proper indexing and view updates
- **Stripe Integration Performance**: Improved performance of Stripe functions
- Reduced unnecessary database operations in checkout and webhook functions
- Enhanced error handling to prevent performance degradation during failures

### UI/UX
- **Report Recipient Management**: Enhanced template creation with intuitive dropdown selection for report recipients
- Improved data consistency by replacing free-form email entry with structured team member selection
- Added clear visual indicators for report-enabled template items with designated recipients
- Enhanced user onboarding flow with clearer trial setup process
- Improved subscription status indicators throughout the application
- Better error messaging for authentication and payment-related issues
- Streamlined email verification experience with proper redirect handling
- Simplified template creation interface by removing category selection complexity
- Enhanced template management workflow for improved user experience and efficiency
- **Template Builder Enhancement**: Added intuitive section-based template organization
- Implemented collapsible sections with visual hierarchy indicators
- Added drag-and-drop functionality for organizing items within sections
- Enhanced template builder with clear visual separation between sections and items
- Improved template creation workflow with section naming and item grouping capabilities
- Added expansion/collapse controls for better management of complex templates
- **Subscription Management**: Enhanced subscription management interface
- Added functional "Manage Billing" button that opens Stripe Customer Portal
- Improved "Add Payment Method" button to direct users to Stripe Customer Portal
- Enhanced payment method display with brand and last4 information
- Improved subscription status indicators and messaging

## [0.1.0] - 2025-01-15

### Added
- Initial project setup with React, TypeScript, and Vite
- Supabase authentication integration
- User registration and login functionality
- Email confirmation workflow
- Dashboard layout with sidebar navigation
- Property management system foundation
- Template management system
- Admin panel structure
- Subscription management with Stripe integration
- Row Level Security (RLS) policies for data protection
- User role system (owner, admin, member)
- Team member management
- Trial period functionality
- Responsive design with Tailwind CSS
- Landing page with pricing tiers
- Email templates for user confirmation

### Security
- Implemented comprehensive RLS policies
- Secure user authentication flow
- Protected admin routes
- Data isolation between organizations

### Infrastructure
- Database schema with proper relationships
- Automated user record creation via triggers
- Stripe integration for subscription management
- Email confirmation system

## Why This Feature Was Implemented

**Business Requirement**: The user specifically requested inspector details functionality to support professional property inspection workflows that require:

1. **Inspector Accountability**: Track who conducted each inspection for quality control and liability purposes
2. **Dual Signature Support**: Different signature requirements based on inspection type (check-in vs check-out)
3. **Professional Reporting**: Include both inspector and guest information in generated PDF reports
4. **Audit Trail**: Maintain complete records of who performed inspections and when
5. **Enhanced User Experience**: Larger signature areas for improved usability and signature quality

**Technical Implementation**: This required:
- Database schema updates to store inspector information
- Enhanced signature capture system with conditional validation
- Updated PDF generation to include inspector details
- Backward compatibility for existing inspections
- Improved signature canvas sizing for better user experience

**Business Impact**: This feature enables:
- Professional inspection workflows with proper accountability
- Legal compliance through comprehensive signature capture
- Enhanced reporting with complete inspector and guest information
- Quality control through inspector tracking and identification
- Improved user experience with larger, more usable signature areas

**Template Sections Feature**: The user requested the ability to organize template items into sections for better structure and organization:

1. **Improved Organization**: Group related inspection items under named sections
2. **Hierarchical Structure**: Support unlimited items within each section
3. **Enhanced User Experience**: Collapsible sections for better template management
4. **Flexible Design**: Ability to mix sections with standalone items
5. **Professional Templates**: Create more structured and professional inspection templates

**Technical Implementation**: This required:
- Database schema changes to support parent-child relationships
- Enhanced template builder UI with section management
- Hierarchical data handling in API functions
- Visual hierarchy with expansion/collapse controls
- Proper ordering system within sections

**Business Impact**: This feature enables:
- More organized and professional inspection templates
- Better user experience when creating and managing complex templates
- Improved inspection workflow with logical grouping of related items
- Enhanced template reusability across different property types
- Clearer inspection reports with section-based organization

**Report Service Teams Feature**: The user requested a structured approach to managing report recipients instead of manual email entry:

1. **Structured Team Management**: Replace free-form email entry with organized team designation system
2. **Data Consistency**: Ensure all report recipients are valid and properly managed company team members
3. **Enhanced Security**: Prevent unauthorized access to reporting functionality through proper validation
4. **Improved User Experience**: Dropdown selection instead of manual email typing reduces errors
5. **Professional Workflow**: Maintain organized contact lists for different types of maintenance and reporting needs

**Technical Implementation**: This required:
- New database table for storing company-specific team designations and emails
- Foreign key relationships to ensure data integrity
- Enhanced template item structure to reference specific team members
- Row Level Security policies for secure access control
- Updated template creation interface with dropdown selection

**Business Impact**: This feature enables:
- Consistent and reliable report recipient management
- Reduced errors in maintenance communication
- Better organization of company team structures
- Enhanced data integrity and security
- Improved workflow efficiency for property management companies

**Critical Trial Expiration Fix**: The user reported a critical security vulnerability where users could bypass trial expiration:

1. **Security Vulnerability**: Users with expired trials could still access the dashboard and premium features
2. **Database Issues**: RLS policy conflicts were causing 500 errors when fetching admin data
3. **Authentication Flow**: Trial dates were not being properly set to NULL for new users
4. **Policy Conflicts**: Existing RLS policies had naming conflicts preventing proper migration

**Technical Implementation**: This required:
- Complete rewrite of all RLS policies with proper conflict handling
- Database schema changes to make trial dates nullable
- Enhanced authentication store logic to enforce trial expiration
- Updated user registration triggers to set proper trial status
- Comprehensive policy naming and structure improvements

**Business Impact**: This feature enables:
- Secure trial enforcement preventing unauthorized access
- Reliable database operations without RLS policy conflicts
- Proper subscription flow requiring payment before access
- Enhanced security across all database operations
- Improved user experience with proper trial management

**Stripe Integration Fix**: The user reported issues with the Stripe integration:

1. **Checkout Error**: The stripe-checkout function was failing when creating customer records
2. **Webhook Verification**: The webhook signature verification was failing due to whitespace in the secret
3. **Database Errors**: Hardcoded IDs were causing conflicts with database-generated IDs

**Technical Implementation**: This required:
- Removing hardcoded ID generation in favor of database defaults
- Adding proper trimming of webhook secret to prevent signature verification failures
- Enhancing error handling and logging for better troubleshooting
- Improving customer creation and management process

**Business Impact**: This feature enables:
- Reliable payment processing for new and existing users
- Proper subscription management and status tracking
- Enhanced security through proper webhook verification
- Better audit trails through comprehensive logging
- Improved user experience with fewer payment-related errors
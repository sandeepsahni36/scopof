# scopoStay - Property Inspection Platform

## Recent Updates

### Template Category System Implementation
- **Added visual template organization** with drag-and-drop category management
- **Category Cards**: Light blue folder-style cards for organizing templates (furnished, unfurnished, holiday home, etc.)
- **Drag-and-Drop Interface**: Templates can be dragged between categories for easy organization
- **Enhanced Checklist Builder**: Property checklist creation now shows templates grouped by category
- **Dual Organization**: Both visual grouping and filter-based category selection available
- **Database Integration**: Template category assignments are persisted and don't affect existing checklists
- **User Experience**: Intuitive folder-based organization similar to file management systems

### Invitation System Implementation
- **Added invitation token system** for secure team member invitations
- **Database Schema**: Created `invitations` table with proper RLS policies
- **Automated Role Assignment**: Database trigger automatically assigns roles when invited users sign up
- **Email Integration**: Uses Resend service with `no-reply@scopostay.com` for invitation emails
- **Frontend Components**: 
  - Updated `InviteMemberModal` to handle invitation creation and email sending
  - Created `InvitationAcceptPage` for invitation acceptance workflow
  - Enhanced `AdminSettingsPage` to show pending invitations
- **Security**: Proper RLS policies ensure only authorized users can manage invitations
- **User Experience**: Streamlined invitation flow with automatic team assignment

### Key Features
- **Token-based invitations** with 7-day expiration
- **Role-specific access** (admin vs member permissions)
- **Automatic cleanup** of expired invitations
- **Email templates** with company branding
- **Real-time invitation status** tracking
- **Visual template organization** with category-based grouping
- **Drag-and-drop template management** for intuitive organization
- **Enhanced checklist building** with categorized template selection

### Technical Implementation
- **Database Function**: `handle_new_invited_user()` for automatic role assignment
- **Database Trigger**: `on_auth_user_created_assign_role` on auth.users table
- **RLS Policies**: Secure access control for invitation management
- **Frontend Integration**: Seamless invitation workflow with existing auth system
- **Template Categories**: Visual organization system with drag-and-drop functionality
- **Category Management**: Create, organize, and manage template categories
- **Enhanced UX**: Improved template discovery and organization in checklist builder

## Project Overview

scopoStay is a comprehensive property inspection platform designed for short-term rental companies and real estate agents. The platform features AI-powered damage detection, customizable inspection templates, automated reporting, and team collaboration tools.

### Core Features
- Property management and inspection workflows
- Customizable inspection templates with drag-and-drop builder
- Photo capture and AI damage detection
- Automated PDF report generation with company branding
- Team member management with role-based access control
- Subscription management with Stripe integration
- Real-time collaboration and notification system

### Technology Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Payment Processing**: Stripe with subscription management
- **Email Service**: Resend for transactional emails
- **File Storage**: MinIO for scalable file storage
- **State Management**: Zustand for client-side state

### Getting Started
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env` example)
4. Run development server: `npm run dev`
5. Connect to Supabase and run migrations

### Environment Variables
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RESEND_API_KEY=your_resend_api_key
VITE_DEV_MODE=false
```

### Database Schema
The application uses a comprehensive PostgreSQL schema with proper RLS policies:
- **User Management**: profiles, admin, team_members, invitations
- **Property Management**: properties, property_checklists
- **Inspection System**: templates, template_items, inspections, inspection_items
- **Reporting**: reports, report_service_teams
- **Subscription**: stripe_customers, stripe_subscriptions, stripe_orders
- **Storage**: file_metadata, storage_usage, storage_quotas

### Deployment
The application is designed for deployment on modern hosting platforms with:
- Static site generation for optimal performance
- Edge function support for serverless backend operations
- CDN integration for global content delivery
- Automated CI/CD pipeline support
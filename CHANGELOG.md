# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
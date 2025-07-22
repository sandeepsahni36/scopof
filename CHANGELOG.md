# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed
- Fixed AuthCallbackPage error handling to prevent premature session clearing during PKCE flow
- Improved error handling for `flow_state_expired` errors during email confirmation
- Prevented `supabase.auth.signOut()` from being called when `getSession()` fails during callback, which was clearing necessary PKCE state from localStorage

### Technical Details
- Modified `src/pages/auth/AuthCallbackPage.tsx` to handle session errors more gracefully
- Added better error logging to distinguish between different types of authentication failures
- Improved retry mechanism for authentication callback timeouts

### Known Issues
- Email confirmation links may contain duplicate `type=signup` parameters, which could contribute to PKCE flow issues
- Investigation ongoing for `422 Unprocessable Content` errors during token exchange

## [Previous Versions]
- Initial project setup and core functionality implementation
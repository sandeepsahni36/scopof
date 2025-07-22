# Supabase Configuration Required

## Authentication URL Configuration

To fix the email confirmation redirect issue, you need to update your Supabase project settings:

### 1. Go to Supabase Dashboard
- Navigate to your project: https://supabase.com/dashboard
- Select your project: `wqspdgmsqijucboobktd`

### 2. Update Authentication Settings
Go to **Authentication** → **URL Configuration** and ensure these settings:

#### Site URL
```
https://app.scopostay.com
```

#### Redirect URLs (add both)
```
https://app.scopostay.com/auth/callback
http://localhost:5173/auth/callback
```

### 3. Email Template Settings
Go to **Authentication** → **Email Templates** → **Confirm signup**

Make sure the template uses the correct redirect URL. The template should contain:
```html
<a href="{{ .ConfirmationURL }}">Confirm Email</a>
```

### 4. Test the Configuration
After making these changes:
1. Clear browser data (cookies, localStorage)
2. Register a new user
3. Check that the confirmation email link contains `/auth/callback`

### Expected Email Link Format
The confirmation email link should look like:
```
https://wqspdgmsqijucboobktd.supabase.co/auth/v1/verify?token=...&type=signup&redirect_to=https://app.scopostay.com/auth/callback
```

Note the `/auth/callback` at the end of the `redirect_to` parameter.
# Scheduled Function Setup Guide

## Overview
This guide explains how to set up the scheduled trial reminder function using Resend.com for email delivery.

## Prerequisites
- Resend.com account configured and verified
- Supabase project with Edge Functions enabled
- Domain verification in Resend.com (for production)

## Environment Variables Setup

### 1. Add Resend Credentials to Supabase
In your Supabase dashboard, go to **Settings** → **Environment Variables** and add:

```
RESEND_API_KEY=your_resend_api_key

**Security Note**: Use a Resend API key with minimal permissions (only send permissions).

### 2. Resend API Key Setup
Create a Resend API key with these permissions:

- **Send emails**: Required for sending trial reminder emails
- **Domain verification**: Ensure your sending domain is verified in Resend

## Database Migration

Run the migration to add trial reminder tracking:

```bash
# Apply the migration
psql -h your-db-host -U postgres -d your-db < supabase/migrations/add_trial_reminder_tracking.sql
```

Or execute in Supabase SQL Editor:
```sql
-- Copy contents of add_trial_reminder_tracking.sql and run
```

## Function Deployment

The Edge Function is automatically deployed when you connect to Supabase. The function is located at:
```
/functions/v1/send-trial-reminder
```

## External Scheduler Setup

### Option 1: cron-job.org (Recommended for simplicity)
1. Go to https://cron-job.org
2. Create a free account
3. Add a new cron job with these settings:
   - **URL**: `https://your-project-id.supabase.co/functions/v1/send-trial-reminder`
   - **Schedule**: `0 9 * * *` (daily at 9 AM UTC)
   - **Method**: POST
   - **Headers**: 
     ```
     Authorization: Bearer your_supabase_anon_key
     Content-Type: application/json
     ```
   - **Body**: `{}`

### Option 2: GitHub Actions (For more control)
Create `.github/workflows/trial-reminders.yml`:

```yaml
name: Send Trial Reminders
on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Send Trial Reminders
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{}' \
            "https://your-project-id.supabase.co/functions/v1/send-trial-reminder"
```

### Option 3: Vercel Cron (If using Vercel)
Create `api/cron/trial-reminders.js`:

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(
      `https://your-project-id.supabase.co/functions/v1/send-trial-reminder`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    const result = await response.json();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
- **Send emails**: Required for sending trial reminder emails
- **Domain verification**: Ensure your sending domain is verified in Resend

## Testing the Function

### Manual Test
You can manually trigger the function to test it:

```bash
curl -X POST \
  -H "Authorization: Bearer your_supabase_anon_key" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "https://your-project-id.supabase.co/functions/v1/send-trial-reminder"
```

### Test Data Setup
To test the function, create test users with trial end dates 7 days in the future:

```sql
-- Create a test user with trial ending in 7 days
UPDATE admin 
SET 
  trial_ends_at = (NOW() + INTERVAL '7 days'),
  subscription_status = 'trialing',
  trial_reminder_7day_sent = false
WHERE id = 'your-test-admin-id';
```

## Monitoring and Logs

### View Function Logs
In Supabase dashboard:
1. Go to **Edge Functions**
2. Select `send-trial-reminder`
3. View **Logs** tab for execution details

### Key Metrics to Monitor
- **Success Rate**: Percentage of emails sent successfully
- **Error Rate**: Failed email attempts
- **Processing Time**: Function execution duration
- **User Coverage**: Number of eligible users processed

## Troubleshooting

### Common Issues

1. **Resend Domain Verification**
   - Ensure your sending domain is verified in Resend
   - Check DNS records are properly configured

2. **Missing API Key**
   - Verify RESEND_API_KEY is set in Supabase environment variables
   - Check that `FROM_EMAIL` is verified in SES

3. **Database Query Errors**
   - Ensure the migration was applied successfully
   - Verify RLS policies allow the service role to read admin and profiles tables

4. **Email Delivery Issues**
   - Check Resend dashboard for delivery statistics
   - Verify sender email is verified in Resend
   - Check recipient email addresses are valid

### Debug Mode
Add `?debug=true` to the function URL for verbose logging:
```
https://your-project-id.supabase.co/functions/v1/send-trial-reminder?debug=true
```

## Security Considerations

1. **API Key Permissions**: Use minimal Resend API permissions (send only)
2. **Environment Variables**: Never commit Resend API keys to code
3. **Rate Limiting**: The function includes built-in delays to respect Resend limits
4. **Email Validation**: Validate email addresses before sending
5. **Unsubscribe Links**: Consider adding unsubscribe functionality for compliance

## Next Steps

After setting up the trial reminder function with Resend, you can extend this pattern for other email automations:
- Failed payment alerts
- Expiring card notifications  
- Invoice distribution
- Welcome emails
- Subscription cancellation confirmations

Each would follow the same pattern: Edge Function + External Scheduler + Resend.com.
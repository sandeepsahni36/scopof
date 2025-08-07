import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("=== TRIAL REMINDER EMAIL FUNCTION START ===");
    
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const fromEmail = Deno.env.get("FROM_EMAIL") || "noreply@scopostay.com";

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      console.error("Missing environment variables:", {
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseServiceKey,
        hasResendApiKey: !!resendApiKey
      });
      throw new Error("Missing required environment variables");
    }

    console.log("Environment variables validated successfully");

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Supabase client initialized");

    // Calculate the target date (7 days from now)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    const targetDateStart = new Date(targetDate);
    targetDateStart.setHours(0, 0, 0, 0);
    const targetDateEnd = new Date(targetDate);
    targetDateEnd.setHours(23, 59, 59, 999);

    console.log("Target date range for trial expiration:", {
      start: targetDateStart.toISOString(),
      end: targetDateEnd.toISOString()
    });

    // Query for users whose trial ends in 7 days and haven't received the reminder yet
    const { data: usersToRemind, error: queryError } = await supabase
      .from('admin')
      .select(`
        id,
        company_name,
        trial_ends_at,
        trial_reminder_7day_sent,
        subscription_tier,
        profiles (
          email,
          full_name
        )
      `)
      .eq('subscription_status', 'trialing')
      .gte('trial_ends_at', targetDateStart.toISOString())
      .lte('trial_ends_at', targetDateEnd.toISOString())
      .or('trial_reminder_7day_sent.is.null,trial_reminder_7day_sent.eq.false');

    if (queryError) {
      console.error("Error querying users for trial reminders:", queryError);
      throw queryError;
    }

    console.log(`Found ${usersToRemind?.length || 0} users to send trial reminders to`);

    if (!usersToRemind || usersToRemind.length === 0) {
      console.log("No users found who need trial reminders");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No users found who need trial reminders",
          processed: 0 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each user
    for (const user of usersToRemind) {
      try {
        console.log(`Processing trial reminder for user:`, {
          adminId: user.id,
          companyName: user.company_name,
          trialEndsAt: user.trial_ends_at,
          email: user.profiles?.email
        });

        if (!user.profiles?.email) {
          console.error(`No email found for user ${user.id}`);
          errors.push(`No email found for user ${user.id}`);
          errorCount++;
          continue;
        }

        // Calculate days remaining
        const trialEndDate = new Date(user.trial_ends_at);
        const daysRemaining = Math.ceil((trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

        // Construct email content
        const emailSubject = `Your Free Trial Ends Soon! – ${daysRemaining} Days Left`;
        const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trial Ending Soon</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .email-header {
            background-color: #2563EB;
            padding: 30px;
            text-align: center;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #ffffff;
            letter-spacing: 1px;
        }
        .email-body {
            padding: 40px 30px;
        }
        h1 {
            color: #2563EB;
            font-size: 24px;
            margin-bottom: 20px;
            font-weight: 500;
        }
        p {
            margin-bottom: 20px;
            font-size: 16px;
        }
        .cta-button {
            display: inline-block;
            background-color: #2563EB;
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 30px;
            border-radius: 4px;
            font-weight: 500;
            margin: 20px 0;
            transition: background-color 0.3s;
        }
        .cta-button:hover {
            background-color: #1D4ED8;
        }
        .trial-info {
            background-color: #FEF3C7;
            border: 1px solid #F59E0B;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .email-footer {
            padding: 20px 30px;
            text-align: center;
            color: #666666;
            font-size: 12px;
            border-top: 1px solid #eeeeee;
        }
        @media only screen and (max-width: 480px) {
            .email-body {
                padding: 30px 20px;
            }
            h1 {
                font-size: 22px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div class="logo">scopoStay</div>
        </div>
        <div class="email-body">
            <h1>Your Free Trial Ends in ${daysRemaining} Days</h1>
            
            <p>Hi ${user.profiles.full_name || 'there'},</p>
            
            <p>We hope you've been enjoying your free trial of scopoStay! This is a friendly reminder that your 14-day free trial for <strong>${user.company_name}</strong> will end on <strong>${trialEndDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.</p>

            <div class="trial-info">
                <h3 style="margin-top: 0; color: #92400E;">What happens next?</h3>
                <ul style="margin: 10px 0; padding-left: 20px; color: #92400E;">
                    <li>Your trial will automatically convert to a paid ${user.subscription_tier} subscription</li>
                    <li>You'll be charged monthly starting ${trialEndDate.toLocaleDateString()}</li>
                    <li>You can cancel anytime before then to avoid charges</li>
                    <li>All your data and settings will be preserved</li>
                </ul>
            </div>

            <p>If you're ready to continue with scopoStay, no action is needed – your subscription will activate automatically. If you'd like to make any changes to your plan or billing information, you can do so in your account settings.</p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="https://app.scopostay.com/dashboard/admin/subscription" class="cta-button">
                    Manage Your Subscription
                </a>
            </div>

            <p>If you have any questions or need assistance, our support team is here to help. Simply reply to this email or contact us through your dashboard.</p>

            <p>Thank you for choosing scopoStay!</p>
            
            <p>Best regards,<br>The scopoStay Team</p>
        </div>
        <div class="email-footer">
            <p>&copy; scopoStay. All rights reserved.</p>
            <p>If you no longer wish to receive these emails, you can <a href="#" style="color: #666666;">unsubscribe here</a>.</p>
        </div>
    </div>
</body>
</html>
        `;

        const emailText = `Your Free Trial Ends in ${daysRemaining} Days

Hi ${user.profiles.full_name || 'there'},

We hope you've been enjoying your free trial of scopoStay! This is a friendly reminder that your 14-day free trial for ${user.company_name} will end on ${trialEndDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

What happens next?
- Your trial will automatically convert to a paid ${user.subscription_tier} subscription
- You'll be charged monthly starting ${trialEndDate.toLocaleDateString()}
- You can cancel anytime before then to avoid charges
- All your data and settings will be preserved

If you're ready to continue with scopoStay, no action is needed – your subscription will activate automatically. If you'd like to make any changes to your plan or billing information, you can do so in your account settings.

Manage your subscription: https://app.scopostay.com/dashboard/admin/subscription

If you have any questions or need assistance, our support team is here to help. Simply reply to this email or contact us through your dashboard.

Thank you for choosing scopoStay!

Best regards,
The scopoStay Team

© scopoStay. All rights reserved.
If you no longer wish to receive these emails, you can unsubscribe here.`;

        // Send email using Resend API
        console.log(`Sending trial reminder email to: ${user.profiles.email}`);
        
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [user.profiles.email],
            subject: emailSubject,
            html: emailHtml,
            text: emailText,
            tags: [
              {
                name: 'category',
                value: 'trial-reminder'
              },
              {
                name: 'user_id',
                value: user.id
              }
            ]
          }),
        });

        if (!resendResponse.ok) {
          const errorData = await resendResponse.text();
          console.error(`Resend API error for ${user.profiles.email}:`, {
            status: resendResponse.status,
            statusText: resendResponse.statusText,
            error: errorData
          });
          throw new Error(`Resend API error: ${resendResponse.status} - ${errorData}`);
        }

        const result = await resendResponse.json();
        
        console.log(`Email sent successfully to ${user.profiles.email}:`, {
          emailId: result.id
        });

        // Update the database to mark reminder as sent
        const { error: updateError } = await supabase
          .from('admin')
          .update({ trial_reminder_7day_sent: true })
          .eq('id', user.id);

        if (updateError) {
          console.error(`Error updating trial_reminder_7day_sent flag for user ${user.id}:`, updateError);
          errors.push(`Failed to update database flag for user ${user.id}: ${updateError.message}`);
        } else {
          console.log(`Successfully updated trial_reminder_7day_sent flag for user ${user.id}`);
        }

        successCount++;
        
        // Add a small delay to avoid overwhelming Resend API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing trial reminder for user ${user.id}:`, error);
        errors.push(`Failed to send email to user ${user.id}: ${error.message}`);
        errorCount++;
      }
    }

    console.log("Trial reminder processing completed:", {
      totalUsers: usersToRemind.length,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Trial reminder processing completed`,
        stats: {
          totalUsers: usersToRemind.length,
          successCount,
          errorCount,
          errors: errors.length > 0 ? errors : undefined
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in trial reminder function:", {
      message: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
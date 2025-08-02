import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.0?target=deno";
import Stripe from "https://esm.sh/stripe@16.0.0?target=deno";

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
    console.log("=== EXPIRING CARD REMINDER EMAIL FUNCTION START ===");
    
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const fromEmail = Deno.env.get("FROM_EMAIL") || "noreply@scopostay.com";

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey || !resendApiKey) {
      console.error("Missing environment variables:", {
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseServiceKey,
        hasStripeKey: !!stripeSecretKey,
        hasResendApiKey: !!resendApiKey
      });
      throw new Error("Missing required environment variables");
    }

    console.log("Environment variables validated successfully");

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20",
    });

    console.log("Supabase and Stripe clients initialized");

    // Calculate the target date range (cards expiring in the next 30-60 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    console.log("Target date range for expiring cards:", {
      thirtyDaysFromNow: thirtyDaysFromNow.toISOString(),
      sixtyDaysFromNow: sixtyDaysFromNow.toISOString(),
      thirtyDaysAgo: thirtyDaysAgo.toISOString()
    });

    // Query for active subscriptions that might have expiring cards
    const { data: subscriptions, error: queryError } = await supabase
      .from('stripe_subscriptions')
      .select(`
        customer_id,
        subscription_id,
        payment_method_brand,
        payment_method_last4,
        last_card_expiring_reminder_sent_at,
        stripe_customers (
          user_id,
          profiles (
            email,
            full_name
          )
        )
      `)
      .in('status', ['active', 'trialing'])
      .not('payment_method_last4', 'is', null)
      .or(`last_card_expiring_reminder_sent_at.is.null,last_card_expiring_reminder_sent_at.lt.${thirtyDaysAgo.toISOString()}`);

    if (queryError) {
      console.error("Error querying subscriptions for expiring cards:", queryError);
      throw queryError;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions to check for expiring cards`);

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No subscriptions found to check for expiring cards");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No subscriptions found to check for expiring cards",
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
    let skippedCount = 0;
    const errors: string[] = [];

    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        console.log(`Processing expiring card check for customer:`, {
          customerId: subscription.customer_id,
          subscriptionId: subscription.subscription_id,
          paymentMethodBrand: subscription.payment_method_brand,
          paymentMethodLast4: subscription.payment_method_last4,
          email: subscription.stripe_customers?.profiles?.email
        });

        if (!subscription.stripe_customers?.profiles?.email) {
          console.error(`No email found for customer ${subscription.customer_id}`);
          errors.push(`No email found for customer ${subscription.customer_id}`);
          errorCount++;
          continue;
        }

        // Get the customer's default payment method from Stripe
        console.log(`Fetching payment methods for customer: ${subscription.customer_id}`);
        const customer = await stripe.customers.retrieve(subscription.customer_id, {
          expand: ['default_source']
        });

        if (customer.deleted) {
          console.log(`Customer ${subscription.customer_id} was deleted, skipping`);
          skippedCount++;
          continue;
        }

        let paymentMethod = null;
        let cardExpMonth = null;
        let cardExpYear = null;

        // Try to get the default payment method
        if (customer.invoice_settings?.default_payment_method) {
          try {
            paymentMethod = await stripe.paymentMethods.retrieve(
              customer.invoice_settings.default_payment_method as string
            );
            
            if (paymentMethod && paymentMethod.card) {
              cardExpMonth = paymentMethod.card.exp_month;
              cardExpYear = paymentMethod.card.exp_year;
            }
          } catch (error) {
            console.error(`Error retrieving payment method for customer ${subscription.customer_id}:`, error);
          }
        }

        // If no default payment method, try to get from subscription
        if (!paymentMethod && subscription.subscription_id) {
          try {
            const stripeSubscription = await stripe.subscriptions.retrieve(subscription.subscription_id);
            if (stripeSubscription.default_payment_method) {
              paymentMethod = await stripe.paymentMethods.retrieve(
                stripeSubscription.default_payment_method as string
              );
              
              if (paymentMethod && paymentMethod.card) {
                cardExpMonth = paymentMethod.card.exp_month;
                cardExpYear = paymentMethod.card.exp_year;
              }
            }
          } catch (error) {
            console.error(`Error retrieving payment method from subscription for customer ${subscription.customer_id}:`, error);
          }
        }

        if (!cardExpMonth || !cardExpYear) {
          console.log(`No card expiration data found for customer ${subscription.customer_id}, skipping`);
          skippedCount++;
          continue;
        }

        // Check if card is expiring within the next 30-60 days
        const cardExpirationDate = new Date(cardExpYear, cardExpMonth - 1, 1); // First day of expiration month
        const isExpiringInRange = cardExpirationDate >= thirtyDaysFromNow && cardExpirationDate <= sixtyDaysFromNow;

        if (!isExpiringInRange) {
          console.log(`Card for customer ${subscription.customer_id} is not expiring in target range, skipping`);
          skippedCount++;
          continue;
        }

        console.log(`Card expiring for customer ${subscription.customer_id}:`, {
          expMonth: cardExpMonth,
          expYear: cardExpYear,
          expirationDate: cardExpirationDate.toISOString()
        });

        // Construct email content
        const emailSubject = `Your Payment Method Expires Soon – Update Required`;
        const cardBrand = (subscription.payment_method_brand || 'card').charAt(0).toUpperCase() + 
                         (subscription.payment_method_brand || 'card').slice(1);
        const cardLast4 = subscription.payment_method_last4 || '****';
        const expirationMonth = cardExpMonth.toString().padStart(2, '0');
        const expirationYear = cardExpYear.toString();
        
        const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Method Expiring Soon</title>
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
        .card-info {
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
            <h1>Your Payment Method Expires Soon</h1>
            
            <p>Hi ${subscription.stripe_customers.profiles.full_name || 'there'},</p>
            
            <p>We wanted to let you know that the payment method on file for your scopoStay account is set to expire soon.</p>

            <div class="card-info">
                <h3 style="margin-top: 0; color: #92400E;">Payment Method Details</h3>
                <p style="margin: 10px 0; color: #92400E;">
                    <strong>${cardBrand} ending in ${cardLast4}</strong><br>
                    Expires: ${expirationMonth}/${expirationYear}
                </p>
            </div>

            <p>To ensure uninterrupted service, please update your payment method before it expires. You can easily update your payment information through your account settings.</p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="https://app.scopostay.com/dashboard/admin/subscription" class="cta-button">
                    Update Payment Method
                </a>
            </div>

            <p><strong>What happens if I don't update my payment method?</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Your subscription may be suspended if payment fails</li>
                <li>You'll lose access to your property management tools</li>
                <li>Your data will be preserved, but features will be restricted</li>
            </ul>

            <p>If you have any questions or need assistance updating your payment method, our support team is here to help. Simply reply to this email or contact us through your dashboard.</p>

            <p>Thank you for using scopoStay!</p>
            
            <p>Best regards,<br>The scopoStay Team</p>
        </div>
        <div class="email-footer">
            <p>&copy; ${new Date().getFullYear()} scopoStay. All rights reserved.</p>
            <p>If you no longer wish to receive these emails, you can <a href="#" style="color: #666666;">unsubscribe here</a>.</p>
        </div>
    </div>
</body>
</html>
        `;

        const emailText = `Your Payment Method Expires Soon

Hi ${subscription.stripe_customers.profiles.full_name || 'there'},

We wanted to let you know that the payment method on file for your scopoStay account is set to expire soon.

Payment Method Details:
${cardBrand} ending in ${cardLast4}
Expires: ${expirationMonth}/${expirationYear}

To ensure uninterrupted service, please update your payment method before it expires. You can easily update your payment information through your account settings.

Update your payment method: https://app.scopostay.com/dashboard/admin/subscription

What happens if I don't update my payment method?
- Your subscription may be suspended if payment fails
- You'll lose access to your property management tools
- Your data will be preserved, but features will be restricted

If you have any questions or need assistance updating your payment method, our support team is here to help. Simply reply to this email or contact us through your dashboard.

Thank you for using scopoStay!

Best regards,
The scopoStay Team

© ${new Date().getFullYear()} scopoStay. All rights reserved.
If you no longer wish to receive these emails, you can unsubscribe here.`;

        // Send email using Resend API
        console.log(`Sending expiring card email to: ${subscription.stripe_customers.profiles.email}`);
        
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [subscription.stripe_customers.profiles.email],
            subject: emailSubject,
            html: emailHtml,
            text: emailText,
            tags: [
              {
                name: 'category',
                value: 'expiring-card'
              },
              {
                name: 'customer_id',
                value: subscription.customer_id
              }
            ]
          }),
        });

        if (!resendResponse.ok) {
          const errorData = await resendResponse.text();
          console.error(`Resend API error for ${subscription.stripe_customers.profiles.email}:`, {
            status: resendResponse.status,
            statusText: resendResponse.statusText,
            error: errorData
          });
          throw new Error(`Resend API error: ${resendResponse.status} - ${errorData}`);
        }

        const result = await resendResponse.json();
        
        console.log(`Expiring card email sent successfully to ${subscription.stripe_customers.profiles.email}:`, {
          emailId: result.id
        });

        // Update the database to mark reminder as sent
        const { error: updateError } = await supabase
          .from('stripe_subscriptions')
          .update({ last_card_expiring_reminder_sent_at: new Date().toISOString() })
          .eq('customer_id', subscription.customer_id);

        if (updateError) {
          console.error(`Error updating last_card_expiring_reminder_sent_at flag for customer ${subscription.customer_id}:`, updateError);
          errors.push(`Failed to update database flag for customer ${subscription.customer_id}: ${updateError.message}`);
        } else {
          console.log(`Successfully updated last_card_expiring_reminder_sent_at flag for customer ${subscription.customer_id}`);
        }

        successCount++;
        
        // Add a small delay to avoid overwhelming Resend API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing expiring card reminder for customer ${subscription.customer_id}:`, error);
        errors.push(`Failed to send email to customer ${subscription.customer_id}: ${error.message}`);
        errorCount++;
      }
    }

    console.log("Expiring card reminder processing completed:", {
      totalSubscriptions: subscriptions.length,
      successCount,
      errorCount,
      skippedCount,
      errors: errors.length > 0 ? errors : undefined
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Expiring card reminder processing completed`,
        stats: {
          totalSubscriptions: subscriptions.length,
          successCount,
          errorCount,
          skippedCount,
          errors: errors.length > 0 ? errors : undefined
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in expiring card reminder function:", {
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
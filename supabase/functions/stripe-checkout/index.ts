import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.6";
import Stripe from "npm:stripe@12.18.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Helper function to determine tier from price ID
function getTierFromPriceId(priceId: string): string {
  // Map of price IDs to tiers
  const priceTierMap: Record<string, string> = {
    'price_1RJXjjCDShtAyWWlL0WQc0I8': 'enterprise',
    'price_1RJXjHCDShtAyWWllZtomnFA': 'professional',
    'price_1RJXhuCDShtAyWWl8VhTAtNj': 'starter',
  };
  
  return priceTierMap[priceId] || 'starter';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("=== STRIPE CHECKOUT SESSION START ===");
    console.log("Request method:", req.method);
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));
    
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      console.error("Missing environment variables:", {
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseServiceKey,
        hasStripeKey: !!stripeSecretKey
      });
      throw new Error("Missing environment variables");
    }

    console.log("Environment variables validated successfully");

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    console.log("Supabase and Stripe clients initialized");

    // Get the current user from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      throw new Error("No authorization header");
    }

    console.log("Authorization header found, extracting token");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Invalid user token:", userError);
      throw new Error("Invalid user token");
    }

    console.log("User authenticated:", { id: user.id, email: user.email });

    // Parse the request body
    console.log("Parsing request body...");
    const { price_id, mode, skip_trial, success_url, cancel_url } = await req.json();

    if (!price_id || !mode || !success_url || !cancel_url) {
      console.error("Missing required parameters:", {
        hasPriceId: !!price_id,
        hasMode: !!mode,
        hasSkipTrial: skip_trial !== undefined,
        hasSuccessUrl: !!success_url,
        hasCancelUrl: !!cancel_url
      });
      throw new Error("Missing required parameters");
    }

    console.log("Creating checkout session with parameters:", {
      priceId: price_id,
      mode: mode,
      skipTrial: skip_trial,
      successUrl: success_url,
      cancelUrl: cancel_url
    });

    // Get user's admin record
    console.log("Fetching admin record for user:", user.id);
    const { data: adminData, error: adminError } = await supabase
      .from("admin")
      .select("id, customer_id")
      .eq("owner_id", user.id)
      .single();

    if (adminError || !adminData) {
      console.error("Admin record not found:", adminError);
      throw new Error("Admin record not found");
    }

    console.log("Admin record found:", {
      adminId: adminData.id,
      hasCustomerId: !!adminData.customer_id
    });

    // Check if user already has a Stripe customer
    let customerId = adminData.customer_id;

    // If no customer exists, create one
    if (!customerId) {
      console.log("No customer ID found, creating new Stripe customer");
      
      console.log("Fetching user profile for customer creation...");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      } else {
        console.log("Profile fetched successfully:", {
          email: profile?.email,
          fullName: profile?.full_name
        });
      }

      console.log("Creating Stripe customer with profile:", {
        email: profile?.email || user.email,
        name: profile?.full_name || user.email
      });

      console.log("Calling Stripe API to create customer...");
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        name: profile?.full_name || user.email,
        metadata: {
          supabase_user_id: user.id,
          admin_id: adminData.id,
        },
      });

      customerId = customer.id;
      console.log("Stripe customer created:", customerId);

      // Update admin record with customer ID
      console.log("Updating admin record with customer ID");
      const { error: updateError } = await supabase
        .from("admin")
        .update({ customer_id: customerId })
        .eq("id", adminData.id);

      if (updateError) {
        console.error("Error updating admin record with customer ID:", updateError);
      } else {
        console.log("Admin record updated successfully with customer ID");
      }

      // Create customer record in our database using upsert to handle potential duplicates
      console.log("Creating customer record in database");
      const { error: insertError } = await supabase
        .from("stripe_customers")
        .upsert({
          user_id: user.id,
          customer_id: customerId,
        }, {
          onConflict: 'user_id'
        });

      if (insertError) {
        console.error("Error creating customer record:", insertError);
      } else {
        console.log("Customer record created/updated successfully in database");
      }
    } else {
      console.log("Using existing customer ID:", customerId);
      
      // Verify the customer still exists in Stripe
      console.log("Verifying existing customer in Stripe...");
      try {
        const existingCustomer = await stripe.customers.retrieve(customerId);
        if (existingCustomer.deleted) {
          console.error("Existing customer was deleted in Stripe:", customerId);
          throw new Error("Customer was deleted in Stripe");
        }
        console.log("Existing customer verified in Stripe:", {
          id: existingCustomer.id,
          email: existingCustomer.email,
          deleted: existingCustomer.deleted
        });
      } catch (stripeError) {
        console.error("Error verifying existing customer in Stripe:", stripeError);
        throw new Error(`Failed to verify existing customer: ${stripeError.message}`);
      }
    }

    // Determine tier from price ID
    const tier = getTierFromPriceId(price_id);
    console.log(`Determined tier from price ID: ${tier}`);

    // Determine trial period based on skip_trial flag
    const trialPeriodDays = skip_trial ? 0 : 14;
    console.log(`Trial period days: ${trialPeriodDays} (skip_trial: ${skip_trial})`);

    // Create checkout session with subscription trial
    console.log("Creating Stripe checkout session");
    console.log("Checkout session parameters:", {
      customer: customerId,
      priceId: price_id,
      mode: mode,
      successUrl: success_url,
      cancelUrl: cancel_url,
      userId: user.id,
      adminId: adminData.id,
      tier: tier,
      trialPeriodDays: trialPeriodDays,
      skipTrial: skip_trial
    });
    
    console.log("Calling Stripe API to create checkout session...");
    
    // Create subscription checkout session with trial
    const sessionParams: any = {
      customer: customerId,
      mode: mode,
      success_url: `${success_url}`,
      cancel_url: `${cancel_url}`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      payment_method_collection: "always",
      subscription_data: {
        trial_period_days: trialPeriodDays,
        metadata: {
          user_id: user.id,
          admin_id: adminData.id,
          tier: tier,
          skip_trial: skip_trial ? 'true' : 'false',
        },
      },
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        admin_id: adminData.id,
        tier: tier, // Add tier to metadata
        skip_trial: skip_trial ? 'true' : 'false',
      },
    };

    console.log(`Creating subscription checkout session with ${trialPeriodDays}-day trial period`);
    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log("Checkout session created successfully:", {
      sessionId: session.id,
      sessionUrl: session.url
    });

    // Return the session URL
    return new Response(
      JSON.stringify({ session_url: session.url }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
    
    console.log("=== STRIPE CHECKOUT SESSION SUCCESS ===");
  } catch (error) {
    console.error("Error creating checkout session:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
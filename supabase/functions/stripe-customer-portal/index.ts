import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.6";
import Stripe from "npm:stripe@12.18.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
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

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Get the current user from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Invalid user token:", userError);
      throw new Error("Invalid user token");
    }

    console.log("User authenticated:", { id: user.id, email: user.email });

    // Parse the request body
    const { return_url } = await req.json();

    if (!return_url) {
      console.error("Missing return_url parameter");
      throw new Error("Missing return_url parameter");
    }

    console.log("Creating customer portal session with return URL:", return_url);

    // Get user's admin record to find customer_id
    const { data: adminData, error: adminError } = await supabase
      .from("admin")
      .select("customer_id")
      .eq("owner_id", user.id)
      .single();

    if (adminError || !adminData || !adminData.customer_id) {
      console.error("Customer ID not found for user:", {
        userId: user.id,
        error: adminError,
        adminData
      });
      throw new Error("Customer ID not found");
    }

    console.log("Found customer ID:", adminData.customer_id);

    // Create a billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: adminData.customer_id,
      return_url: return_url,
    });

    console.log("Billing portal session created:", {
      sessionId: session.id,
      url: session.url
    });

    // Return the session URL
    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error creating customer portal session:", {
      message: error.message,
      stack: error.stack
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
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.6";
import Stripe from "npm:stripe@12.18.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, stripe-signature, x-client-info, apikey",
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
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey || !stripeWebhookSecret) {
      console.error("Missing environment variables:", {
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseServiceKey,
        hasStripeKey: !!stripeSecretKey,
        hasWebhookSecret: !!stripeWebhookSecret
      });
      throw new Error("Missing environment variables");
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Get the signature from the headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("No Stripe signature provided in request headers");
      throw new Error("No signature provided");
    }

    // Get the raw request body
    const body = await req.text();

    // CRITICAL FIX: Trim the webhook secret to remove any whitespace
    const trimmedWebhookSecret = stripeWebhookSecret.trim();
    console.log("Webhook secret length after trimming:", trimmedWebhookSecret.length);

    // Verify the webhook signature
    let event;
    try {
      // Use the async version of constructEvent for Deno environment
      event = await stripe.webhooks.constructEventAsync(body, signature, trimmedWebhookSecret);
      console.log("Webhook signature verified successfully");
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing webhook event: ${event.type}`, {
      eventId: event.id,
      eventType: event.type,
      timestamp: new Date().toISOString()
    });

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        
        console.log("Checkout session completed:", {
          sessionId: session.id,
          customerId: session.customer,
          adminId: session.metadata?.admin_id,
          paymentStatus: session.payment_status,
          amountTotal: session.amount_total,
          currency: session.currency
        });
        
        // Ensure we have the necessary data
        if (!session.customer || !session.metadata?.admin_id) {
          console.error("Missing required data in checkout session:", {
            hasCustomer: !!session.customer,
            hasAdminId: !!session.metadata?.admin_id
          });
          throw new Error("Missing customer or admin_id in session metadata");
        }

        // Get customer data
        const customer = await stripe.customers.retrieve(session.customer as string);
        if (customer.deleted) {
          console.error("Customer was deleted:", session.customer);
          throw new Error("Customer was deleted");
        }

        // Get tier from metadata or determine from price ID
        const tier = session.metadata?.tier || 'starter';
        console.log(`Using tier from metadata: ${tier}`);

        console.log("Updating admin record with trial information:", {
          adminId: session.metadata.admin_id,
          status: "trialing",
          tier: tier,
          trialStarted: new Date().toISOString(),
          trialEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });

        // Update admin record with subscription status
        const { data: adminUpdateData, error: adminUpdateError } = await supabase
          .from("admin")
          .update({
            subscription_status: "trialing",
            subscription_tier: tier,
            trial_started_at: new Date().toISOString(),
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("id", session.metadata.admin_id)
          .select();

        if (adminUpdateError) {
          console.error("Error updating admin record:", adminUpdateError);
          throw adminUpdateError;
        }

        console.log("Admin record updated successfully:", {
          adminId: session.metadata.admin_id,
          updatedData: adminUpdateData
        });

        console.log("Creating order record:", {
          sessionId: session.id,
          customerId: session.customer,
          paymentIntentId: session.payment_intent || "",
          amountTotal: session.amount_total || 0
        });

        // Create order record using upsert to handle potential duplicates
        const { data: orderData, error: orderError } = await supabase
          .from("stripe_orders")
          .upsert({
            checkout_session_id: session.id,
            payment_intent_id: session.payment_intent || "",
            customer_id: session.customer,
            amount_subtotal: session.amount_subtotal || 0,
            amount_total: session.amount_total || 0,
            currency: session.currency || "usd",
            payment_status: session.payment_status || "unpaid",
            status: "completed",
          }, {
            onConflict: 'checkout_session_id'
          })
          .select();

        if (orderError) {
          console.error("Error creating order record:", orderError);
          throw orderError;
        }

        console.log("Order record created successfully:", {
          orderId: orderData[0]?.id
        });

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        
        console.log("Subscription updated:", {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          priceId: subscription.items.data[0]?.price.id
        });
        
        // Ensure we have the necessary data
        if (!subscription.customer) {
          console.error("Missing customer in subscription:", subscription.id);
          throw new Error("Missing customer in subscription");
        }

        // Get customer data from our database
        const { data: customerData, error: customerError } = await supabase
          .from("stripe_customers")
          .select("user_id")
          .eq("customer_id", subscription.customer)
          .single();

        if (customerError || !customerData) {
          console.error(`Customer not found in database:`, {
            stripeCustomerId: subscription.customer,
            error: customerError
          });
          throw new Error(`Customer not found: ${subscription.customer}`);
        }

        console.log("Found customer in database:", {
          stripeCustomerId: subscription.customer,
          supabaseUserId: customerData.user_id
        });

        // Get admin data
        const { data: adminData, error: adminError } = await supabase
          .from("admin")
          .select("id")
          .eq("owner_id", customerData.user_id)
          .single();

        if (adminError || !adminData) {
          console.error(`Admin not found for user:`, {
            userId: customerData.user_id,
            error: adminError
          });
          throw new Error(`Admin not found for user: ${customerData.user_id}`);
        }

        console.log("Found admin record:", {
          adminId: adminData.id,
          userId: customerData.user_id
        });

        // Get tier from price ID
        const priceId = subscription.items.data[0]?.price.id;
        const tier = priceId ? getTierFromPriceId(priceId) : 'starter';
        console.log(`Determined tier from price ID: ${tier}`);

        // Get payment method details if available
        let paymentMethodBrand = null;
        let paymentMethodLast4 = null;

        // Check if subscription has a default payment method
        if (subscription.default_payment_method) {
          try {
            console.log("Fetching payment method details:", subscription.default_payment_method);
            const paymentMethod = await stripe.paymentMethods.retrieve(
              subscription.default_payment_method as string
            );
            
            if (paymentMethod && paymentMethod.card) {
              paymentMethodBrand = paymentMethod.card.brand;
              paymentMethodLast4 = paymentMethod.card.last4;
              console.log("Payment method details retrieved:", {
                brand: paymentMethodBrand,
                last4: paymentMethodLast4
              });
            }
          } catch (error) {
            console.error("Error retrieving payment method:", error);
            // Continue without payment method details
          }
        } else {
          // Try to get the default payment method from the customer
          try {
            console.log("Fetching customer's default payment method");
            const customer = await stripe.customers.retrieve(subscription.customer as string, {
              expand: ['default_source']
            });
            
            if (!customer.deleted && customer.invoice_settings?.default_payment_method) {
              const paymentMethod = await stripe.paymentMethods.retrieve(
                customer.invoice_settings.default_payment_method as string
              );
              
              if (paymentMethod && paymentMethod.card) {
                paymentMethodBrand = paymentMethod.card.brand;
                paymentMethodLast4 = paymentMethod.card.last4;
                console.log("Payment method details retrieved from customer:", {
                  brand: paymentMethodBrand,
                  last4: paymentMethodLast4
                });
              }
            }
          } catch (error) {
            console.error("Error retrieving customer's payment method:", error);
            // Continue without payment method details
          }
        }

        console.log("Updating subscription record:", {
          customerId: subscription.customer,
          subscriptionId: subscription.id,
          priceId: subscription.items.data[0]?.price.id,
          status: subscription.status,
          paymentMethodBrand,
          paymentMethodLast4
        });

        // Update subscription record using upsert to handle potential duplicates
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from("stripe_subscriptions")
          .upsert({
            customer_id: subscription.customer as string,
            subscription_id: subscription.id,
            price_id: subscription.items.data[0]?.price.id,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
            status: subscription.status,
            payment_method_brand: paymentMethodBrand,
            payment_method_last4: paymentMethodLast4
          }, {
            onConflict: "customer_id",
          })
          .select();

        if (subscriptionError) {
          console.error("Error updating subscription record:", subscriptionError);
          throw subscriptionError;
        }

        console.log("Subscription record updated successfully:", {
          subscriptionId: subscriptionData[0]?.id
        });

        console.log("Updating admin record with subscription status:", {
          adminId: adminData.id,
          status: subscription.status,
          tier: tier
        });

        // Update admin record with subscription status
        const { data: adminUpdateData, error: adminUpdateError } = await supabase
          .from("admin")
          .update({
            subscription_status: subscription.status,
            subscription_tier: tier,
          })
          .eq("id", adminData.id)
          .select();

        if (adminUpdateError) {
          console.error("Error updating admin record:", adminUpdateError);
          throw adminUpdateError;
        }

        console.log("Admin record updated successfully:", {
          adminId: adminData.id,
          updatedData: adminUpdateData
        });

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        
        console.log("Invoice payment succeeded:", {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription,
          amount: invoice.amount_paid,
          status: invoice.status
        });
        
        // Only process subscription invoices
        if (invoice.subscription) {
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          
          console.log("Retrieved subscription details:", {
            subscriptionId: subscription.id,
            status: subscription.status,
            priceId: subscription.items.data[0]?.price.id
          });
          
          // Get customer data from our database
          const { data: customerData, error: customerError } = await supabase
            .from("stripe_customers")
            .select("user_id")
            .eq("customer_id", invoice.customer)
            .single();

          if (customerError || !customerData) {
            console.error(`Customer not found in database:`, {
              stripeCustomerId: invoice.customer,
              error: customerError
            });
            throw new Error(`Customer not found: ${invoice.customer}`);
          }

          console.log("Found customer in database:", {
            stripeCustomerId: invoice.customer,
            supabaseUserId: customerData.user_id
          });

          // Get admin data
          const { data: adminData, error: adminError } = await supabase
            .from("admin")
            .select("id")
            .eq("owner_id", customerData.user_id)
            .single();

          if (adminError || !adminData) {
            console.error(`Admin not found for user:`, {
              userId: customerData.user_id,
              error: adminError
            });
            throw new Error(`Admin not found for user: ${customerData.user_id}`);
          }

          console.log("Found admin record:", {
            adminId: adminData.id,
            userId: customerData.user_id
          });

          // Get payment method details if available
          let paymentMethodBrand = null;
          let paymentMethodLast4 = null;

          if (invoice.payment_intent) {
            try {
              console.log("Fetching payment intent details:", invoice.payment_intent);
              const paymentIntent = await stripe.paymentIntents.retrieve(
                invoice.payment_intent as string
              );
              
              if (paymentIntent.payment_method) {
                const paymentMethod = await stripe.paymentMethods.retrieve(
                  paymentIntent.payment_method as string
                );
                
                if (paymentMethod && paymentMethod.card) {
                  paymentMethodBrand = paymentMethod.card.brand;
                  paymentMethodLast4 = paymentMethod.card.last4;
                  console.log("Payment method details retrieved from payment intent:", {
                    brand: paymentMethodBrand,
                    last4: paymentMethodLast4
                  });
                }
              }
            } catch (error) {
              console.error("Error retrieving payment method from payment intent:", error);
              // Continue without payment method details
            }
          }

          // Get tier from price ID
          const priceId = subscription.items.data[0]?.price.id;
          const tier = priceId ? getTierFromPriceId(priceId) : 'starter';
          console.log(`Determined tier from price ID: ${tier}`);

          // Update subscription record with payment method details
          if (paymentMethodBrand && paymentMethodLast4) {
            console.log("Updating subscription record with payment method details:", {
              customerId: invoice.customer,
              paymentMethodBrand,
              paymentMethodLast4
            });

            const { error: updateError } = await supabase
              .from("stripe_subscriptions")
              .update({
                payment_method_brand: paymentMethodBrand,
                payment_method_last4: paymentMethodLast4
              })
              .eq("customer_id", invoice.customer);

            if (updateError) {
              console.error("Error updating subscription payment method details:", updateError);
              // Continue despite error
            } else {
              console.log("Subscription payment method details updated successfully");
            }
          }

          console.log("Updating admin record with active status:", {
            adminId: adminData.id,
            status: "active",
            tier: tier
          });

          // Update admin record with active status
          const { data: adminUpdateData, error: adminUpdateError } = await supabase
            .from("admin")
            .update({
              subscription_status: "active",
              subscription_tier: tier,
            })
            .eq("id", adminData.id)
            .select();

          if (adminUpdateError) {
            console.error("Error updating admin record:", adminUpdateError);
            throw adminUpdateError;
          }

          console.log("Admin record updated successfully:", {
            adminId: adminData.id,
            updatedData: adminUpdateData
          });
        }
        
        break;
      }

      // Add logging for other event types
      case "customer.subscription.created":
        console.log("New subscription created:", {
          subscriptionId: event.data.object.id,
          customerId: event.data.object.customer,
          status: event.data.object.status
        });
        break;

      case "customer.subscription.deleted":
        console.log("Subscription deleted:", {
          subscriptionId: event.data.object.id,
          customerId: event.data.object.customer,
          status: event.data.object.status
        });
        break;

      case "customer.created":
        console.log("Customer created:", {
          customerId: event.data.object.id,
          email: event.data.object.email
        });
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    console.log(`Successfully processed webhook event: ${event.type}`);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing webhook:", {
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
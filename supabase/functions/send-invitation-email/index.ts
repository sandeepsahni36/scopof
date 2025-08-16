import { createClient } from "npm:@supabase/supabase-js@2.39.6";

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
    console.log("=== SEND INVITATION EMAIL FUNCTION START ===");
    
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";

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

    // Parse request body
    const { 
      email, 
      invitationUrl, 
      inviterName, 
      companyName, 
      role 
    } = await req.json();

    if (!email || !invitationUrl || !inviterName || !companyName || !role) {
      throw new Error("Missing required parameters");
    }

    console.log("Sending invitation email:", {
      to: email,
      inviterName,
      companyName,
      role
    });

    const emailSubject = `You're invited to join ${companyName} on scopoStay`;
    
    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Team Invitation</title>
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
            border-radius: 8px;
            font-weight: 500;
            margin: 20px 0;
            transition: background-color 0.3s;
        }
        .cta-button:hover {
            background-color: #1D4ED8;
        }
        .invitation-info {
            background-color: #F0F9FF;
            border: 1px solid #0EA5E9;
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
            <h1>🎉 You're Invited to Join ${companyName}</h1>
            
            <p>Hi there,</p>
            
            <p><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on scopoStay as a <strong>${role}</strong>.</p>

            <div class="invitation-info">
                <h3 style="margin-top: 0; color: #0369A1;">What is scopoStay?</h3>
                <p style="margin: 10px 0; color: #0369A1;">
                    scopoStay is a comprehensive property inspection platform designed for short-term rental companies and real estate agents. 
                    With AI-powered damage detection, customizable inspection templates, and automated reporting, 
                    scopoStay helps you maintain property standards and streamline your inspection workflow.
                </p>
            </div>

            <p>As a <strong>${role}</strong>, you'll have access to:</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
                ${role === 'admin' ? `
                <li>Full property management capabilities</li>
                <li>Create and manage inspection templates</li>
                <li>Access to all company settings</li>
                <li>Generate and download inspection reports</li>
                <li>Manage team members and permissions</li>
                ` : `
                <li>Perform property inspections</li>
                <li>Access assigned properties and templates</li>
                <li>Generate inspection reports</li>
                <li>View inspection history</li>
                `}
            </ul>

            <p>To get started, click the button below to create your account:</p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${invitationUrl}" class="cta-button">
                    Accept Invitation & Create Account
                </a>
            </div>

            <p><strong>Important:</strong> This invitation link will expire in 7 days. If you have any questions or need assistance, please contact ${inviterName} or our support team.</p>

            <p>We're excited to have you join the team!</p>
            
            <p>Best regards,<br>The scopoStay Team</p>
        </div>
        <div class="email-footer">
            <p>&copy; ${new Date().getFullYear()} scopoStay. All rights reserved.</p>
            <p>This invitation was sent by ${inviterName} from ${companyName}.</p>
        </div>
    </div>
</body>
</html>
    `;

    const emailText = `You're Invited to Join ${companyName} on scopoStay

Hi there,

${inviterName} has invited you to join ${companyName} on scopoStay as a ${role}.

What is scopoStay?
scopoStay is a comprehensive property inspection platform designed for short-term rental companies and real estate agents. With AI-powered damage detection, customizable inspection templates, and automated reporting, scopoStay helps you maintain property standards and streamline your inspection workflow.

As a ${role}, you'll have access to:
${role === 'admin' ? `
- Full property management capabilities
- Create and manage inspection templates
- Access to all company settings
- Generate and download inspection reports
- Manage team members and permissions
` : `
- Perform property inspections
- Access assigned properties and templates
- Generate inspection reports
- View inspection history
`}

To get started, visit this link to create your account:
${invitationUrl}

Important: This invitation link will expire in 7 days. If you have any questions or need assistance, please contact ${inviterName} or our support team.

We're excited to have you join the team!

Best regards,
The scopoStay Team

© ${new Date().getFullYear()} scopoStay. All rights reserved.
This invitation was sent by ${inviterName} from ${companyName}.`;

    // Send email using Resend API
    console.log(`Sending invitation email to: ${email}`);
    
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'no-reply@scopostay.com',
        to: [email],
        subject: emailSubject,
        html: emailHtml,
        text: emailText,
        tags: [
          {
            name: 'category',
            value: 'team-invitation'
          },
          {
            name: 'role',
            value: role
          }
        ]
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error(`Resend API error:`, {
        status: resendResponse.status,
        statusText: resendResponse.statusText,
        error: errorData
      });
      throw new Error(`Failed to send invitation email: ${resendResponse.status} - ${errorData}`);
    }

    const result = await resendResponse.json();
    console.log(`Invitation email sent successfully:`, {
      emailId: result.id,
      to: email
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation email sent successfully",
        emailId: result.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in send invitation email function:", {
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
import { supabase, validateUserSession, handleAuthError, devModeEnabled } from './supabase';
import { v4 as uuidv4 } from 'uuid';

export interface Invitation {
  id: string;
  email: string;
  token: string;
  invitedBy: string;
  adminId: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Mock data for dev mode
const MOCK_INVITATIONS: Invitation[] = [];

let mockInvitationsState = [...MOCK_INVITATIONS];

export async function createInvitation(
  email: string,
  role: 'admin' | 'member',
  adminId: string
): Promise<{ invitation: Invitation; invitationUrl: string } | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Creating mock invitation');
      const token = uuidv4();
      const newInvitation: Invitation = {
        id: `mock-invitation-${Date.now()}`,
        email,
        token,
        invitedBy: user.id,
        adminId: 'dev-company-id',
        role,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      mockInvitationsState.push(newInvitation);
      
      const invitationUrl = `${window.location.origin}/invite/accept?token=${token}`;
      return { invitation: newInvitation, invitationUrl };
    }

    // Generate unique token
    const token = uuidv4();

    // Create invitation record
    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert([{
        email,
        token,
        invited_by: user.id,
        admin_id: adminId,
        role,
        status: 'pending',
      }])
      .select()
      .single();

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return null;
      }
      throw error;
    }

    // Transform to our interface
    const invitationData: Invitation = {
      id: invitation.id,
      email: invitation.email,
      token: invitation.token,
      invitedBy: invitation.invited_by,
      adminId: invitation.admin_id,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expires_at,
      acceptedAt: invitation.accepted_at,
      createdAt: invitation.created_at,
      updatedAt: invitation.updated_at,
    };

    const invitationUrl = `${window.location.origin}/invite/accept?token=${token}`;

    return { invitation: invitationData, invitationUrl };
  } catch (error: any) {
    console.error('Error creating invitation:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  try {
    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Getting mock invitation by token');
      const invitation = mockInvitationsState.find(i => i.token === token && i.status === 'pending');
      return invitation || null;
    }

    // Query invitation by token (this will work for unauthenticated users due to RLS policy)
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - invitation not found or expired
        return null;
      }
      throw error;
    }

    // Transform to our interface
    return {
      id: invitation.id,
      email: invitation.email,
      token: invitation.token,
      invitedBy: invitation.invited_by,
      adminId: invitation.admin_id,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expires_at,
      acceptedAt: invitation.accepted_at,
      createdAt: invitation.created_at,
      updatedAt: invitation.updated_at,
    };
  } catch (error: any) {
    console.error('Error getting invitation by token:', error);
    throw error;
  }
}

export async function getInvitations(): Promise<Invitation[] | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Returning mock invitations');
      return mockInvitationsState;
    }

    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return null;
      }
      throw error;
    }

    // Transform to our interface
    return invitations.map(invitation => ({
      id: invitation.id,
      email: invitation.email,
      token: invitation.token,
      invitedBy: invitation.invited_by,
      adminId: invitation.admin_id,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expires_at,
      acceptedAt: invitation.accepted_at,
      createdAt: invitation.created_at,
      updatedAt: invitation.updated_at,
    }));
  } catch (error: any) {
    console.error('Error fetching invitations:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function cancelInvitation(invitationId: string): Promise<boolean> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Cancelling mock invitation');
      const invitationIndex = mockInvitationsState.findIndex(i => i.id === invitationId);
      if (invitationIndex === -1) {
        throw new Error('Invitation not found');
      }
      
      mockInvitationsState[invitationIndex].status = 'cancelled';
      mockInvitationsState[invitationIndex].updatedAt = new Date().toISOString();
      return true;
    }

    const { error } = await supabase
      .from('invitations')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return false;
      }
      throw error;
    }

    return true;
  } catch (error: any) {
    console.error('Error cancelling invitation:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return false;
    }
    
    throw error;
  }
}

export async function sendInvitationEmail(
  email: string,
  invitationUrl: string,
  inviterName: string,
  companyName: string,
  role: 'admin' | 'member'
): Promise<boolean> {
  try {
    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Mock invitation email sent');
      console.log('Invitation details:', { email, invitationUrl, inviterName, companyName, role });
      return true;
    }

    // Get Resend API key from environment
    const resendApiKey = import.meta.env.VITE_RESEND_API_KEY || 're_demo_key_placeholder';
    if (!resendApiKey) {
      throw new Error('Resend API key not configured');
    }

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

    return true;
  } catch (error: any) {
    console.error('Error sending invitation email:', error);
    throw error;
  }
}
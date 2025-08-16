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

    // Call the Edge Function to send the invitation email
    const { data, error } = await supabase.functions.invoke('send-invitation-email', {
      body: {
        email,
        invitationUrl,
        inviterName,
        companyName,
        role,
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Failed to send invitation email');
    }

    console.log('Invitation email sent successfully via Edge Function:', data);
    return true;
  } catch (error: any) {
    console.error('Error sending invitation email:', error);
    throw error;
  }
}
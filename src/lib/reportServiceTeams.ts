import { supabase, validateUserSession, handleAuthError, devModeEnabled } from './supabase';

// Types for report service teams
export interface ReportServiceTeam {
  id: string;
  adminId: string;
  designation: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

// Mock data for dev mode
const MOCK_REPORT_SERVICE_TEAMS: ReportServiceTeam[] = [
  {
    id: 'mock-team-1',
    adminId: 'dev-company-id',
    designation: 'Admin',
    email: 'admin@example.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-team-2',
    adminId: 'dev-company-id',
    designation: 'Operations Manager',
    email: 'operations@example.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-team-3',
    adminId: 'dev-company-id',
    designation: 'Cleaning Team',
    email: 'cleaning@example.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let mockReportServiceTeamsState = [...MOCK_REPORT_SERVICE_TEAMS];

export async function getReportServiceTeams(): Promise<ReportServiceTeam[] | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Returning mock report service teams');
      return mockReportServiceTeamsState;
    }

    const { data, error } = await supabase
      .from('report_service_teams')
      .select('*')
      .order('designation');

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return null;
      }
      throw error;
    }

    // Transform data to match our interface
    return data.map(team => ({
      id: team.id,
      adminId: team.admin_id,
      designation: team.designation,
      email: team.email,
      createdAt: team.created_at,
      updatedAt: team.updated_at,
    }));
  } catch (error: any) {
    console.error('Error fetching report service teams:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function createReportServiceTeam(teamData: {
  designation: string;
  email: string;
}): Promise<ReportServiceTeam | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Creating mock report service team');
      const newTeam: ReportServiceTeam = {
        id: `mock-team-${Date.now()}`,
        adminId: 'dev-company-id',
        designation: teamData.designation,
        email: teamData.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      mockReportServiceTeamsState.push(newTeam);
      return newTeam;
    }

    // Get user's admin ID from user_admin_status view
    const { data: adminData, error: adminError } = await supabase
      .from('user_admin_status')
      .select('admin_id')
      .eq('profile_id', user.id)
      .single();

    if (adminError || !adminData || !adminData.admin_id) {
      throw new Error('User is not associated with any company');
    }

    const { data, error } = await supabase
      .from('report_service_teams')
      .insert([{
        admin_id: adminData.admin_id,
        designation: teamData.designation,
        email: teamData.email,
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

    // Transform data to match our interface
    return {
      id: data.id,
      adminId: data.admin_id,
      designation: data.designation,
      email: data.email,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error: any) {
    console.error('Error creating report service team:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function updateReportServiceTeam(
  id: string,
  teamData: {
    designation: string;
    email: string;
  }
): Promise<ReportServiceTeam | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Updating mock report service team:', id);
      const teamIndex = mockReportServiceTeamsState.findIndex(t => t.id === id);
      if (teamIndex === -1) {
        throw new Error('Report service team not found');
      }
      
      const updatedTeam = {
        ...mockReportServiceTeamsState[teamIndex],
        designation: teamData.designation,
        email: teamData.email,
        updatedAt: new Date().toISOString(),
      };
      
      mockReportServiceTeamsState[teamIndex] = updatedTeam;
      return updatedTeam;
    }

    const { data, error } = await supabase
      .from('report_service_teams')
      .update({
        designation: teamData.designation,
        email: teamData.email,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return null;
      }
      throw error;
    }

    // Transform data to match our interface
    return {
      id: data.id,
      adminId: data.admin_id,
      designation: data.designation,
      email: data.email,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error: any) {
    console.error('Error updating report service team:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function deleteReportServiceTeam(id: string): Promise<boolean> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Deleting mock report service team:', id);
      const teamIndex = mockReportServiceTeamsState.findIndex(t => t.id === id);
      if (teamIndex === -1) {
        throw new Error('Report service team not found');
      }
      
      mockReportServiceTeamsState.splice(teamIndex, 1);
      return true;
    }

    const { error } = await supabase
      .from('report_service_teams')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return false;
      }
      throw error;
    }

    return true;
  } catch (error: any) {
    console.error('Error deleting report service team:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return false;
    }
    
    throw error;
  }
}
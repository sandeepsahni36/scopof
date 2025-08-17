/*
  # Fix Invited User Team Membership

  This migration manually creates the missing team member record for the invited user
  who is experiencing authentication issues.

  1. Check if user exists in profiles table
  2. Find the invitation record for this user
  3. Create the missing team member record
  4. Update invitation status to accepted
*/

-- First, let's check if the user exists and get their details
DO $$
DECLARE
    user_id UUID := '07bb4b87-98fe-48a2-a041-6db3456357c7';
    user_email TEXT;
    invitation_record RECORD;
    admin_id_to_use UUID;
BEGIN
    -- Check if user exists in profiles
    SELECT email INTO user_email 
    FROM profiles 
    WHERE id = user_id;
    
    IF user_email IS NULL THEN
        RAISE NOTICE 'User % not found in profiles table', user_id;
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found user: % with email: %', user_id, user_email;
    
    -- Find the invitation record for this user
    SELECT * INTO invitation_record
    FROM invitations 
    WHERE email = user_email 
    AND status = 'pending'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF invitation_record IS NULL THEN
        RAISE NOTICE 'No pending invitation found for email: %', user_email;
        
        -- Try to find any invitation (including accepted ones)
        SELECT * INTO invitation_record
        FROM invitations 
        WHERE email = user_email 
        ORDER BY created_at DESC 
        LIMIT 1;
        
        IF invitation_record IS NULL THEN
            RAISE NOTICE 'No invitation found at all for email: %', user_email;
            RETURN;
        ELSE
            RAISE NOTICE 'Found invitation with status: % for email: %', invitation_record.status, user_email;
            admin_id_to_use := invitation_record.admin_id;
        END IF;
    ELSE
        RAISE NOTICE 'Found pending invitation for email: % with admin_id: %', user_email, invitation_record.admin_id;
        admin_id_to_use := invitation_record.admin_id;
    END IF;
    
    -- Check if team member record already exists
    IF EXISTS (
        SELECT 1 FROM team_members 
        WHERE profile_id = user_id AND admin_id = admin_id_to_use
    ) THEN
        RAISE NOTICE 'Team member record already exists for user: %', user_id;
        RETURN;
    END IF;
    
    -- Create the team member record
    INSERT INTO team_members (admin_id, profile_id, role)
    VALUES (admin_id_to_use, user_id, invitation_record.role)
    ON CONFLICT (admin_id, profile_id) DO NOTHING;
    
    RAISE NOTICE 'Created team member record for user: % with role: %', user_id, invitation_record.role;
    
    -- Update invitation status to accepted if it was pending
    IF invitation_record.status = 'pending' THEN
        UPDATE invitations 
        SET status = 'accepted', accepted_at = NOW()
        WHERE id = invitation_record.id;
        
        RAISE NOTICE 'Updated invitation status to accepted for user: %', user_id;
    END IF;
    
    RAISE NOTICE 'Successfully fixed team membership for user: %', user_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error fixing team membership for user %: %', user_id, SQLERRM;
END $$;
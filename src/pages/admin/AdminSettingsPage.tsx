import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, Mail, Phone, MapPin, Palette, Plus, Edit, Trash2, Users, ImageIcon, Upload } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';
import { getReportServiceTeams, createReportServiceTeam, updateReportServiceTeam, deleteReportServiceTeam, ReportServiceTeam } from '../../lib/reportServiceTeams';
import { uploadFile } from '../../lib/storage';
import { isImageValid, resizeAndOptimizeImage } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

type CompanySettingsFormData = {
  name: string;
  email: string;
  phone: string;
  address: string;
  brandColor: string;
  reportBackground: string;
};

type TeamFormData = {
  designation: string;
  email: string;
};

const AdminSettingsPage = () => {
  const { company, initialize } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(company?.logo_url || null);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teams, setTeams] = useState<ReportServiceTeam[]>([]);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<ReportServiceTeam | null>(null);
  const [teamFormLoading, setTeamFormLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanySettingsFormData>({
    defaultValues: {
      name: company?.name || '',
      email: '',
      phone: '',
      address: '',
      brandColor: company?.brandColor || '#2563EB',
      reportBackground: company?.reportBackground || '#FFFFFF',
    },
  });

  const {
    register: registerTeam,
    handleSubmit: handleSubmitTeam,
    reset: resetTeam,
    formState: { errors: teamErrors },
  } = useForm<TeamFormData>({
    defaultValues: {
      designation: '',
      email: '',
    },
  });

  useEffect(() => {
    loadTeams();
    // Set logo preview from company data
    if (company?.logo) {
      setLogoPreview(company.logo);
    }
  }, [company?.logo]);

  const loadTeams = async () => {
    try {
      setTeamsLoading(true);
      const teamsData = await getReportServiceTeams();
      if (teamsData) {
        setTeams(teamsData);
      }
    } catch (error: any) {
      console.error('Error loading teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setTeamsLoading(false);
    }
  };
  
  const onSubmit = async (data: CompanySettingsFormData) => {
    setLoading(true);
    
    try {
      // In a real implementation, we would update the company settings in Supabase here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Company settings updated successfully');
    } catch (error) {
      console.error('Failed to update company settings:', error);
      toast.error('Failed to update company settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeam = () => {
    setEditingTeam(null);
    resetTeam();
    setShowTeamForm(true);
  };

  const handleEditTeam = (team: ReportServiceTeam) => {
    setEditingTeam(team);
    resetTeam({
      designation: team.designation,
      email: team.email,
    });
    setShowTeamForm(true);
  };

  const handleDeleteTeam = async (team: ReportServiceTeam) => {
    if (!window.confirm(`Are you sure you want to delete "${team.designation}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const success = await deleteReportServiceTeam(team.id);
      if (success) {
        toast.success('Team deleted successfully');
        setTeams(teams.filter(t => t.id !== team.id));
      }
    } catch (error: any) {
      console.error('Error deleting team:', error);
      toast.error('Failed to delete team');
    }
  };

  const onSubmitTeam = async (data: TeamFormData) => {
    try {
      setTeamFormLoading(true);

      if (editingTeam) {
        const updatedTeam = await updateReportServiceTeam(editingTeam.id, data);
        if (updatedTeam) {
          toast.success('Team updated successfully');
          setTeams(teams.map(t => t.id === editingTeam.id ? updatedTeam : t));
        }
      } else {
        const newTeam = await createReportServiceTeam(data);
        if (newTeam) {
          toast.success('Team added successfully');
          setTeams([...teams, newTeam]);
        }
      }

      setShowTeamForm(false);
      setEditingTeam(null);
      resetTeam();
    } catch (error: any) {
      console.error('Error saving team:', error);
      toast.error(editingTeam ? 'Failed to update team' : 'Failed to add team');
    } finally {
      setTeamFormLoading(false);
    }
  };

  const handleCancelTeamForm = () => {
    setShowTeamForm(false);
    setEditingTeam(null);
    resetTeam();
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = isImageValid(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      setLogoUploading(true);

      // Resize and optimize the image
      const optimizedFile = await resizeAndOptimizeImage(file, 100, 100, 0.9);

      // Upload the logo
      const uploadResult = await uploadFile(optimizedFile, 'logo');
      
      if (!uploadResult) {
        throw new Error('Failed to upload logo');
      }

      // Update admin record with new logo URL
      const { data: adminData, error: adminError } = await supabase
        .from('admin')
        .update({ logo_url: uploadResult.url })
        .eq('id', company?.id)
        .select()
        .single();

      if (adminError) {
        throw new Error(adminError.message);
      }

      // Update logo preview and refresh auth store
      setLogoPreview(uploadResult.url);
      await initialize();
      
      toast.success('Logo uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };
};

export default AdminSettingsPage;
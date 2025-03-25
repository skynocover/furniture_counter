'use server';
import supabaseAdmin from './supabase-server';
import { Database } from '../types/supabase';

// 添加项目相关操作
export const adminGetProjects = async () => {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }

  return data as Database['public']['Tables']['projects']['Row'][];
};

export const adminGetProjectById = async (id: number) => {
  const { data, error } = await supabaseAdmin.from('projects').select('*').eq('id', id).single();

  if (error) {
    console.error('Error fetching project by id:', error);
    throw error;
  }

  return data as Database['public']['Tables']['projects']['Row'];
};

export const adminAddProject = async (
  project: Omit<
    Database['public']['Tables']['projects']['Insert'],
    'id' | 'created_at' | 'updated_at'
  >,
) => {
  const { data, error } = await supabaseAdmin.from('projects').insert([project]).select();

  if (error) {
    console.error('Error adding project:', error);
    throw error;
  }

  return data[0] as Database['public']['Tables']['projects']['Row'];
};

export const adminUpdateProject = async (
  id: number,
  updates: Partial<Database['public']['Tables']['projects']['Update']>,
) => {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating project:', error);
    throw error;
  }

  return data[0] as Database['public']['Tables']['projects']['Row'];
};

export const adminDeleteProject = async (id: number) => {
  const { error } = await supabaseAdmin.from('projects').delete().eq('id', id);

  if (error) {
    console.error('Error deleting project:', error);
    throw error;
  }

  return true;
};

// 添加房间相关操作
export const adminGetRooms = async (projectId?: number) => {
  let query = supabaseAdmin.from('rooms').select('*');

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching rooms:', error);
    throw error;
  }

  return data as Database['public']['Tables']['rooms']['Row'][];
};

export const adminGetRoomById = async (id: number) => {
  const { data, error } = await supabaseAdmin.from('rooms').select('*').eq('id', id).single();

  if (error) {
    console.error('Error fetching room by id:', error);
    throw error;
  }

  return data as Database['public']['Tables']['rooms']['Row'];
};

export const adminAddRoom = async (
  room: Omit<Database['public']['Tables']['rooms']['Insert'], 'id' | 'created_at'>,
) => {
  const { data, error } = await supabaseAdmin.from('rooms').insert([room]).select();

  if (error) {
    console.error('Error adding room:', error);
    throw error;
  }

  return data[0] as Database['public']['Tables']['rooms']['Row'];
};

export const adminUpdateRoom = async (
  id: number,
  updates: Partial<Database['public']['Tables']['rooms']['Update']>,
) => {
  const { data, error } = await supabaseAdmin.from('rooms').update(updates).eq('id', id).select();

  if (error) {
    console.error('Error updating room:', error);
    throw error;
  }

  return data[0] as Database['public']['Tables']['rooms']['Row'];
};

export const adminDeleteRoom = async (id: number) => {
  const { error } = await supabaseAdmin.from('rooms').delete().eq('id', id);

  if (error) {
    console.error('Error deleting room:', error);
    throw error;
  }

  return true;
};

import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/types';
import { create } from 'zustand';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface UserState {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    try {
      set({ isLoading: true, error: null });
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        set({ profile: null, isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Fallback: This logic should ideally match the profile creation logic in ProfileView 
        // but as a safety net in the global store.
        const { data: newData, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata.full_name,
            avatar_url: user.user_metadata.avatar_url,
            role: 'buyer'
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        set({ profile: newData, isLoading: false });
      } else {
        set({ profile: data, isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    try {
      set({ isLoading: true, error: null });
      const profile = get().profile;
      if (!profile) throw new Error('No profile loaded');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;
      set({ profile: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true });
      await supabase.auth.signOut();
      set({ profile: null, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  }
}));

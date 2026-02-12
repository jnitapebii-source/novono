import { SiteConfig, LinkItem, DEFAULT_CONFIG } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---

// PREENCHA COM SUAS CHAVES DO SUPABASE
const SUPABASE_URL = "https://dcrqjcjxxesrlmdwnnfm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjcnFqY2p4eGVzcmxtZHdubmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg2NTMsImV4cCI6MjA4NDM4NDY1M30.rEfzrUVthCv9RI7D018pSczn5E41SHRp3TpaDh5HZ70";

// --- CLIENT INIT ---
let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_URL.startsWith('http')) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn("Supabase credentials not configured in storageService.ts");
}

// --- AUTHENTICATION ---

export const login = async (email: string, password: string) => {
  if (!supabase) throw new Error("Supabase não configurado");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const logout = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};

export const getSession = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
};

// --- DATABASE INTERFACE ---

export const getConfig = async (): Promise<SiteConfig> => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('site_config')
        .select('*')
        .eq('id', 'main')
        .single();
      
      if (data) {
        return { imageUrl: data.image_url, caption: data.caption };
      }
    } catch (e) {
      console.error("Error fetching config", e);
    }
  } 
  // Fallback or Default
  const stored = localStorage.getItem('linkflow_config');
  return stored ? JSON.parse(stored) : DEFAULT_CONFIG;
};

export const saveConfig = async (config: SiteConfig): Promise<void> => {
  if (supabase) {
    // Map camelCase to snake_case for DB
    const dbPayload = {
      id: 'main',
      image_url: config.imageUrl,
      caption: config.caption
    };
    const { error } = await supabase.from('site_config').upsert(dbPayload);
    if (error) throw error;
  } else {
    localStorage.setItem('linkflow_config', JSON.stringify(config));
  }
};

export const getLinkQueue = async (): Promise<LinkItem[]> => {
  if (supabase) {
    const { data, error } = await supabase
      .from('link_queue')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error(error);
      return [];
    }

    // Map snake_case to camelCase
    return (data || []).map((item: any) => ({
      id: item.id,
      url: item.url,
      createdAt: item.created_at
    }));
  } else {
    const stored = localStorage.getItem('linkflow_queue');
    return stored ? JSON.parse(stored) : [];
  }
};

export const addLinkToQueue = async (url: string): Promise<LinkItem[]> => {
  if (supabase) {
    const { error } = await supabase
      .from('link_queue')
      .insert([{ url: url, created_at: Date.now() }]);
    
    if (error) throw error;
    return getLinkQueue();
  } else {
    // Local Mock
    const current = await getLinkQueue();
    const newItem = { id: crypto.randomUUID(), url, createdAt: Date.now() };
    const updated = [...current, newItem];
    localStorage.setItem('linkflow_queue', JSON.stringify(updated));
    return updated;
  }
};

export const removeLinkFromQueue = async (id: string): Promise<LinkItem[]> => {
  if (supabase) {
    const { error } = await supabase.from('link_queue').delete().eq('id', id);
    if (error) throw error;
    return getLinkQueue();
  } else {
    const current = await getLinkQueue();
    const updated = current.filter(i => i.id !== id);
    localStorage.setItem('linkflow_queue', JSON.stringify(updated));
    return updated;
  }
};

export const clearQueue = async (): Promise<void> => {
   if (supabase) {
     // Note: Delete all without where clause usually requires explicit enable in Supabase
     // Doing it one by one or using a not-null filter is safer for client side
     const { error } = await supabase.from('link_queue').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
     if (error) throw error;
   } else {
      localStorage.removeItem('linkflow_queue');
   }
};

export const consumeNextLink = async (): Promise<string | null> => {
  if (supabase) {
    // 1. Get the oldest link
    const { data: list, error: fetchError } = await supabase
      .from('link_queue')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchError || !list || list.length === 0) return null;

    const linkToConsume = list[0];

    // 2. Delete it
    const { error: deleteError } = await supabase
      .from('link_queue')
      .delete()
      .eq('id', linkToConsume.id);

    if (deleteError) {
      console.error("Failed to delete consumed link", deleteError);
      // Determine if we should still return it or fail. 
      // If delete failed, user might see it again. 
      // For now, return it to ensure user flow works.
    }

    return linkToConsume.url;
  } else {
    const current = await getLinkQueue();
    if (current.length === 0) return null;
    const nextLink = current[0];
    const updated = current.slice(1);
    localStorage.setItem('linkflow_queue', JSON.stringify(updated));
    return nextLink.url;
  }
};
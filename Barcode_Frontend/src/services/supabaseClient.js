import { createClient } from '@supabase/supabase-js';

const getEnvOrStorage = (primaryKey, secondaryKeys = []) => {
  const allKeys = [primaryKey, ...secondaryKeys];
  for (const key of allKeys) {
    const envValue = import.meta.env[key];
    if (envValue && !envValue.includes('your-project-ref') && !envValue.includes('your-anon-key')) {
      return envValue;
    }
    const stored = localStorage.getItem(key);
    if (stored) return stored;
  }
  return '';
};

export const getSupabaseConfig = () => {
  const url = getEnvOrStorage('VITE_SUPABASE_URL', ['SUPABASE_URL']);
  const anonKey = getEnvOrStorage('VITE_SUPABASE_ANON_KEY', [
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_ANON_KEY'
  ]);
  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey && url.startsWith('http') && anonKey.length > 5)
  };
};

let currentClient = null;

export const getSupabaseClient = () => {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) {
    // Return dummy or unconfigured client object to prevent crashes
    return null;
  }
  if (!currentClient) {
    currentClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  }
  return currentClient;
};

export const updateSupabaseCredentials = (url, anonKey) => {
  if (url) localStorage.setItem('VITE_SUPABASE_URL', url.trim());
  if (anonKey) localStorage.setItem('VITE_SUPABASE_ANON_KEY', anonKey.trim());
  currentClient = null;
  window.location.reload();
};

export const clearSupabaseCredentials = () => {
  localStorage.removeItem('VITE_SUPABASE_URL');
  localStorage.removeItem('VITE_SUPABASE_ANON_KEY');
  currentClient = null;
  window.location.reload();
};

export const supabase = getSupabaseClient();


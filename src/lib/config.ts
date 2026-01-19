// Environment configuration
export const config = {
  // API Configuration
  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000'),
  
  // Debug settings
  DEBUG: import.meta.env.VITE_DEBUG === 'true',
  LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || (import.meta.env.DEV ? 'debug' : 'error'),
  
  // Supabase configuration
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  
  // Feature flags
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_ERROR_REPORTING: import.meta.env.VITE_ENABLE_ERROR_REPORTING !== 'false',
  
  // Performance settings
  MAX_RETRIES: parseInt(import.meta.env.VITE_MAX_RETRIES || '3'),
  BATCH_SIZE: parseInt(import.meta.env.VITE_BATCH_SIZE || '50'),
};

export default config;
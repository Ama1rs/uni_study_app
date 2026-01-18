// Sync types - temporary manual definitions
export interface DeviceIdentity {
  device_id: string;
  device_name?: string;
  platform: string;
  created_at?: string;
  last_seen_at?: string;
  is_active: boolean;
}

export interface SyncState {
  is_sync_enabled: boolean;
  supabase_user_id?: string;
  last_synced_at?: string;
  sync_protocol_version: number;
  is_premium_active: boolean;
  device_id?: string;
}

export interface DeviceRegistration {
  device_id: string;
  device_name: string;
  platform: string;
  user_id: string;
}

// Migration types
export interface MigrationProgress {
  phase: string;
  completed_steps: string[];
  total_steps: number;
  bytes_uploaded: number;
  conflicts_detected: number;
  estimated_time_remaining?: number;
  progress_percentage: number;
}

export interface MigrationEligibility {
  is_eligible: boolean;
  reasons: string[];
  data_size_estimate: number;
  requires_premium: boolean;
}

export interface MigrationConflict {
  id: string;
  table_name: string;
  record_id: string;
  local_data: string;
  cloud_data: string;
  conflict_type: string;
  resolution?: string;
}
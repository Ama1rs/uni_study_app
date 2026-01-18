import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { SyncManager, SyncProgress } from '@/lib/syncManager';
import { SyncState } from '@/types/sync';

export function SyncStatus() {
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const syncManager = SyncManager.getInstance();

  useEffect(() => {
    loadSyncState();

    // Listen to sync progress
    const unsubscribe = syncManager.onProgress((progress) => {
      setSyncProgress(progress);
      if (progress.phase === 'complete') {
        setTimeout(() => {
          setSyncProgress(null);
          loadSyncState();
        }, 2000);
      }
    });

    return unsubscribe;
  }, []);

  const loadSyncState = async () => {
    try {
      const state = await invoke<SyncState>('get_sync_state');
      setSyncState(state);
    } catch (error) {
      console.error('Failed to load sync state:', error);
    }
  };

  const handleManualSync = async () => {
    const result = await syncManager.sync();
    if (!result.success) {
      console.error('Sync failed:', result.error);
      // Could show toast/notification here
    }
  };

  const handleToggleSync = async () => {
    if (!syncState) return;

    try {
      if (syncState.is_sync_enabled) {
        await syncManager.disableSync();
      } else {
        // Enable sync (requires user ID)
        const userId = syncState.supabase_user_id;
        if (userId) {
          await syncManager.enableSync(userId);
        }
      }
      await loadSyncState();
    } catch (error) {
      console.error('Failed to toggle sync:', error);
    }
  };

  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    
    const date = new Date(dateStr);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  return (
    <div className="border border-border rounded-xl p-4 bg-bg-surface/50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${
            syncState?.is_sync_enabled 
              ? 'bg-green-500' 
              : 'bg-gray-400'
          }`} />
          <span className="text-sm font-medium text-text-primary">
            {syncState?.is_sync_enabled ? 'Sync Enabled' : 'Local Only'}
          </span>
          {syncState?.last_synced_at && (
            <span className="text-xs text-text-secondary">
              Last sync: {formatLastSync(syncState.last_synced_at)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Manual sync button */}
          <button
            onClick={handleManualSync}
            disabled={!!syncProgress}
            className="px-3 py-1.5 text-xs rounded-lg bg-accent text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {syncProgress ? 'Syncing...' : 'Sync Now'}
          </button>

          {/* Toggle sync button */}
          <button
            onClick={handleToggleSync}
            disabled={!!syncProgress}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              syncState?.is_sync_enabled
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {syncState?.is_sync_enabled ? 'Disable' : 'Enable'}
          </button>

          {/* Expand/collapse button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sync progress */}
      {syncProgress && (
        <div className="mt-4 p-3 rounded-lg bg-bg-base/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium capitalize text-text-primary">
              {syncProgress.phase}
            </span>
            <span className="text-xs text-text-secondary">
              {syncProgress.progress}%
            </span>
          </div>
          <div className="w-full h-2 bg-bg-border rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${syncProgress.progress}%` }}
            />
          </div>
          <p className="text-xs text-text-secondary mt-1">{syncProgress.message}</p>
        </div>
      )}

      {/* Expanded details */}
      {isExpanded && syncState && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-text-secondary">Protocol Version:</span>
              <span className="ml-2 text-text-primary font-medium">
                {syncState.sync_protocol_version}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">Premium Status:</span>
              <span className={`ml-2 font-medium ${
                syncState.is_premium_active ? 'text-green-500' : 'text-text-secondary'
              }`}>
                {syncState.is_premium_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">User ID:</span>
              <span className="ml-2 text-text-primary font-mono text-xs">
                {syncState.supabase_user_id ? 
                  `${syncState.supabase_user_id.slice(0, 8)}...` : 
                  'Not connected'
                }
              </span>
            </div>
            <div>
              <span className="text-text-secondary">Device ID:</span>
              <span className="ml-2 text-text-primary font-mono text-xs">
                {syncState.device_id ? 
                  `${syncState.device_id.slice(0, 8)}...` : 
                  'Unknown'
                }
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleManualSync}
              disabled={!!syncProgress}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-bg-base border border-border hover:border-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Force Re-sync
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
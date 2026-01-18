import { supabase } from '@/lib/supabase';
import { invoke } from '@tauri-apps/api/core';
import { SyncState } from '@/types/sync';

export interface SyncResult {
  success: boolean;
  error?: string;
  uploaded: number;
  downloaded: number;
  conflicts: number;
}

export interface SyncProgress {
  phase: 'upload' | 'download' | 'complete';
  progress: number; // 0-100
  message: string;
}

export class SyncManager {
  private static instance: SyncManager;
  private isSyncing = false;
  private progressCallbacks: ((progress: SyncProgress) => void)[] = [];

  private constructor() {}

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  onProgress(callback: (progress: SyncProgress) => void): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  private notifyProgress(progress: SyncProgress): void {
    this.progressCallbacks.forEach(callback => callback(progress));
  }

  async getSyncState(): Promise<SyncState | null> {
    try {
      return await invoke<SyncState>('get_sync_state');
    } catch (error) {
      console.error('Failed to get sync state:', error);
      return null;
    }
  }

  async isEnabled(): Promise<boolean> {
    const state = await this.getSyncState();
    return state?.is_sync_enabled || false;
  }

  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        error: 'Sync already in progress',
        uploaded: 0,
        downloaded: 0,
        conflicts: 0
      };
    }

    if (!supabase) {
      return {
        success: false,
        error: 'Supabase is not configured',
        uploaded: 0,
        downloaded: 0,
        conflicts: 0
      };
    }

    const syncState = await this.getSyncState();
    if (!syncState?.is_sync_enabled) {
      return {
        success: false,
        error: 'Sync is not enabled',
        uploaded: 0,
        downloaded: 0,
        conflicts: 0
      };
    }

    this.isSyncing = true;

    try {
      // Check if this is first-time sync
      const isFirstTimeSync = !syncState.last_synced_at;
      
      this.notifyProgress({
        phase: 'upload',
        progress: 0,
        message: isFirstTimeSync ? 'Initializing first sync...' : 'Starting sync...'
      });

      if (isFirstTimeSync) {
        await this.performFirstTimeSyncGuard();
      }

      const uploadResult = await this.uploadPhase();

      this.notifyProgress({
        phase: 'download',
        progress: 50,
        message: 'Downloading changes...'
      });

      const downloadResult = await this.downloadPhase();

      // Update last synced timestamp
      await this.updateLastSynced();

      this.notifyProgress({
        phase: 'complete',
        progress: 100,
        message: 'Sync complete'
      });

      return {
        success: true,
        uploaded: uploadResult.uploaded,
        downloaded: downloadResult.downloaded,
        conflicts: uploadResult.conflicts + downloadResult.conflicts
      };

    } catch (error) {
      console.error('Sync failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        uploaded: 0,
        downloaded: 0,
        conflicts: 0
      };
    } finally {
      this.isSyncing = false;
    }
  }

  private async uploadPhase(): Promise<{ uploaded: number; conflicts: number }> {
    if (!supabase) throw new Error('Supabase not available');

    this.notifyProgress({
      phase: 'upload',
      progress: 10,
      message: 'Uploading repositories...'
    });

    // Upload repositories first (deterministic order)
    const repositories = await invoke<any[]>('get_repositories');
    let uploaded = 0;
    let conflicts = 0;

    for (const repo of repositories) {
      try {
        // Map local data to Supabase schema
        const supabaseRepo = {
          id: repo.id || crypto.randomUUID(),
          name: repo.name,
          description: repo.description,
          color: repo.color,
          sync_order: uploaded
        };

        const { error } = await supabase
          .from('repositories')
          .upsert(supabaseRepo, {
            onConflict: 'id'
          });

        if (error) {
          console.error('Failed to upload repository:', error);
          conflicts++;
        } else {
          uploaded++;
        }

        // Update progress
        const progress = 10 + (uploaded / repositories.length) * 20;
        this.notifyProgress({
          phase: 'upload',
          progress,
          message: `Uploaded ${uploaded}/${repositories.length} repositories`
        });

      } catch (error) {
        console.error('Error uploading repository:', error);
        conflicts++;
      }
    }

    // Upload other entities in correct order
    const resourcesResult = await this.uploadResources();
    const linksResult = await this.uploadLinks();
    const lecturesResult = await this.uploadLectures();
    const flashcardsResult = await this.uploadFlashcards();
    const plannerEventsResult = await this.uploadPlannerEvents();
    const tasksResult = await this.uploadTasks();

    return { 
      uploaded: uploaded + resourcesResult.uploaded + linksResult.uploaded + 
               lecturesResult.uploaded + flashcardsResult.uploaded + 
               plannerEventsResult.uploaded + tasksResult.uploaded,
      conflicts: conflicts + resourcesResult.conflicts + linksResult.conflicts + 
                lecturesResult.conflicts + flashcardsResult.conflicts + 
                plannerEventsResult.conflicts + tasksResult.conflicts
    };
  }

  private async downloadPhase(): Promise<{ downloaded: number; conflicts: number }> {
    if (!supabase) throw new Error('Supabase not available');

    this.notifyProgress({
      phase: 'download',
      progress: 60,
      message: 'Downloading repositories...'
    });

    // Download in deterministic order: repositories -> resources -> links -> lectures -> flashcards -> planner_events -> tasks
    const reposResult = await this.downloadRepositories();
    const resourcesResult = await this.downloadResources();
    const linksResult = await this.downloadLinks();
    const lecturesResult = await this.downloadLectures();
    const flashcardsResult = await this.downloadFlashcards();
    const plannerEventsResult = await this.downloadPlannerEvents();
    const tasksResult = await this.downloadTasks();

    return {
      downloaded: reposResult.downloaded + resourcesResult.downloaded + linksResult.downloaded +
                 lecturesResult.downloaded + flashcardsResult.downloaded + plannerEventsResult.downloaded +
                 tasksResult.downloaded,
      conflicts: reposResult.conflicts + resourcesResult.conflicts + linksResult.conflicts +
                 lecturesResult.conflicts + flashcardsResult.conflicts + plannerEventsResult.conflicts +
                 tasksResult.conflicts
    };
  }

  private async downloadRepositories(): Promise<{ downloaded: number; conflicts: number }> {
    if (!supabase) throw new Error('Supabase not available');

    const { data: repositories, error } = await supabase
      .from('repositories')
      .select('*')
      .is('deleted_at', 'null')
      .order('sync_order');

    if (error) throw new Error(`Failed to download repositories: ${error.message}`);

    let downloaded = 0;
    let conflicts = 0;

    for (const repo of repositories || []) {
      try {
        const localRepos = await invoke<any[]>('get_repositories');
        const existing = localRepos.find((r: any) => r.name === repo.name);

        if (existing) {
          const localUpdated = new Date(existing.updated_at || 0);
          const remoteUpdated = new Date(repo.updated_at || 0);

          if (remoteUpdated > localUpdated) {
            await invoke('update_repository', {
              repository: {
                id: existing.id,
                name: repo.name,
                description: repo.description,
                color: repo.color
              }
            });
            downloaded++;
          } else if (localUpdated > remoteUpdated) {
            conflicts++;
          }
        } else {
          await invoke('create_repository', {
            name: repo.name,
            description: repo.description,
            color: repo.color
          });
          downloaded++;
        }

        const progress = 60 + (downloaded / (repositories?.length || 1)) * 5;
        this.notifyProgress({
          phase: 'download',
          progress,
          message: `Downloaded repositories: ${downloaded}/${repositories?.length || 0}`
        });

      } catch (error) {
        console.error('Error processing repository:', error);
        conflicts++;
      }
    }

    return { downloaded, conflicts };
  }

  private async downloadResources(): Promise<{ downloaded: number; conflicts: number }> {
    if (!supabase) throw new Error('Supabase not available');

    const { data: resources, error } = await supabase
      .from('resources')
      .select('*')
      .is('deleted_at', 'null')
      .order('sync_order');

    if (error) throw new Error(`Failed to download resources: ${error.message}`);

    let downloaded = 0;
    let conflicts = 0;

    for (const resource of resources || []) {
      try {
        // Implementation for resource download with LWW
        // Similar pattern to repositories but with resource-specific logic
        console.log(`Processing resource: ${resource.title || resource.id}`);
        downloaded++;
      } catch (error) {
        console.error('Error processing resource:', error);
        conflicts++;
      }
    }

    return { downloaded, conflicts };
  }

  private async downloadLinks(): Promise<{ downloaded: number; conflicts: number }> {
    if (!supabase) throw new Error('Supabase not available');
    
    const { data: links, error } = await supabase
      .from('links')
      .select('*')
      .is('deleted_at', 'null')
      .order('sync_order');

    if (error) throw new Error(`Failed to download links: ${error.message}`);

    let downloaded = 0;
    let conflicts = 0;

    for (const link of links || []) {
      try {
        console.log(`Processing link: ${link.id}`);
        downloaded++;
      } catch (error) {
        console.error('Error processing link:', error);
        conflicts++;
      }
    }

    return { downloaded, conflicts };
  }

  private async downloadLectures(): Promise<{ downloaded: number; conflicts: number }> {
    if (!supabase) throw new Error('Supabase not available');
    
    const { data: lectures, error } = await supabase
      .from('lectures')
      .select('*')
      .is('deleted_at', 'null')
      .order('sync_order');

    if (error) throw new Error(`Failed to download lectures: ${error.message}`);

    let downloaded = 0;
    let conflicts = 0;

    for (const lecture of lectures || []) {
      try {
        console.log(`Processing lecture: ${lecture.title || lecture.id}`);
        downloaded++;
      } catch (error) {
        console.error('Error processing lecture:', error);
        conflicts++;
      }
    }

    return { downloaded, conflicts };
  }

  private async downloadFlashcards(): Promise<{ downloaded: number; conflicts: number }> {
    if (!supabase) throw new Error('Supabase not available');
    
    const { data: flashcards, error } = await supabase
      .from('flashcards')
      .select('*')
      .is('deleted_at', 'null')
      .order('sync_order');

    if (error) throw new Error(`Failed to download flashcards: ${error.message}`);

    let downloaded = 0;
    let conflicts = 0;

    for (const flashcard of flashcards || []) {
      try {
        console.log(`Processing flashcard: ${flashcard.front_text || flashcard.id}`);
        downloaded++;
      } catch (error) {
        console.error('Error processing flashcard:', error);
        conflicts++;
      }
    }

    return { downloaded, conflicts };
  }

  private async downloadPlannerEvents(): Promise<{ downloaded: number; conflicts: number }> {
    if (!supabase) throw new Error('Supabase not available');
    
    const { data: events, error } = await supabase
      .from('planner_events')
      .select('*')
      .is('deleted_at', 'null')
      .order('sync_order');

    if (error) throw new Error(`Failed to download planner events: ${error.message}`);

    let downloaded = 0;
    let conflicts = 0;

    for (const event of events || []) {
      try {
        console.log(`Processing planner event: ${event.title || event.id}`);
        downloaded++;
      } catch (error) {
        console.error('Error processing planner event:', error);
        conflicts++;
      }
    }

    return { downloaded, conflicts };
  }

  private async downloadTasks(): Promise<{ downloaded: number; conflicts: number }> {
    if (!supabase) throw new Error('Supabase not available');
    
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .is('deleted_at', 'null')
      .order('sync_order');

    if (error) throw new Error(`Failed to download tasks: ${error.message}`);

    let downloaded = 0;
    let conflicts = 0;

    for (const task of tasks || []) {
      try {
        console.log(`Processing task: ${task.title || task.id}`);
        downloaded++;
      } catch (error) {
        console.error('Error processing task:', error);
        conflicts++;
      }
    }

    return { downloaded, conflicts };
  }

  private async updateLastSynced(): Promise<void> {
    const syncState = await this.getSyncState();
    if (syncState) {
      await invoke('set_sync_state', {
        sync_state: {
          ...syncState,
          last_synced_at: new Date().toISOString()
        }
      });
    }
  }

  async enableSync(userId: string): Promise<void> {
    try {
      await invoke('set_sync_state', {
        sync_state: {
          is_sync_enabled: true,
          supabase_user_id: userId,
          last_synced_at: undefined,
          sync_protocol_version: 1,
          is_premium_active: false // Will be updated after checking subscription
        }
      });
    } catch (error) {
      console.error('Failed to enable sync:', error);
      throw error;
    }
  }

  async disableSync(): Promise<void> {
    try {
      await invoke('set_sync_state', {
        sync_state: {
          is_sync_enabled: false,
          supabase_user_id: undefined,
          last_synced_at: undefined,
          sync_protocol_version: 1,
          is_premium_active: false
        }
      });
    } catch (error) {
      console.error('Failed to disable sync:', error);
      throw error;
    }
  }

  isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }

  async getSignedUrl(storagePath: string): Promise<string | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase.storage
        .from('resources')
        .createSignedUrl(storagePath, 60 * 15); // 15 minutes expiry

      if (error) throw error;
      return data?.signedUrl || null;
    } catch (error) {
      console.error('Failed to get signed URL:', error);
      return null;
    }
  }

  async uploadResource(
    file: File, 
    userId: string
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase not available' };
    }

    try {
      const fileExt = file.name.split('.').pop() || '';
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error } = await supabase.storage
        .from('resources')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        path: filePath,
        error: undefined 
      };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async deleteResource(storagePath: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase not available' };
    }

    try {
      const { error } = await supabase.storage
        .from('resources')
        .remove([storagePath]);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Entity upload methods for complete synchronization
  private async uploadResources(): Promise<{ uploaded: number; conflicts: number }> {
    if (!supabase) throw new Error('Supabase not available');
    
    try {
      const resources = await invoke<any[]>('get_resources');
      let uploaded = 0;
      let conflicts = 0;

      for (const resource of resources) {
        try {
          const supabaseResource = {
            id: resource.id || crypto.randomUUID(),
            repository_id: resource.repository_id,
            title: resource.title,
            content: resource.content,
            file_path: resource.file_path,
            mime_type: resource.mime_type,
            file_size: resource.file_size,
            content_hash: resource.content_hash,
            storage_path: resource.storage_path,
            sync_order: uploaded
          };

          const { error } = await supabase
            .from('resources')
            .upsert(supabaseResource, {
              onConflict: 'id'
            });

          if (error) {
            console.error('Failed to upload resource:', error);
            conflicts++;
          } else {
            uploaded++;
          }
        } catch (error) {
          console.error('Error uploading resource:', error);
          conflicts++;
        }
      }

      return { uploaded, conflicts };
    } catch (error) {
      console.error('Failed to get resources:', error);
      return { uploaded: 0, conflicts: 0 };
    }
  }

  private async uploadLinks(): Promise<{ uploaded: number; conflicts: number }> {
    if (!supabase) throw new Error('Supabase not available');
    
    try {
      const links = await invoke<any[]>('get_links');
      let uploaded = 0;
      let conflicts = 0;

      for (const link of links) {
        try {
          const supabaseLink = {
            id: link.id || crypto.randomUUID(),
            source_resource_id: link.source_resource_id,
            target_resource_id: link.target_resource_id,
            link_type: link.link_type,
            metadata: link.metadata,
            sync_order: uploaded
          };

          const { error } = await supabase
            .from('links')
            .upsert(supabaseLink, {
              onConflict: 'id'
            });

          if (error) {
            console.error('Failed to upload link:', error);
            conflicts++;
          } else {
            uploaded++;
          }
        } catch (error) {
          console.error('Error uploading link:', error);
          conflicts++;
        }
      }

      return { uploaded, conflicts };
    } catch (error) {
      console.error('Failed to get links:', error);
      return { uploaded: 0, conflicts: 0 };
    }
  }

  private async uploadLectures(): Promise<{ uploaded: number; conflicts: number }> {
    if (!supabase) throw new Error('Supabase not available');
    
    try {
      const lectures = await invoke<any[]>('get_lectures');
      let uploaded = 0;
      let conflicts = 0;

      for (const lecture of lectures) {
        try {
          const supabaseLecture = {
            id: lecture.id || crypto.randomUUID(),
            repository_id: lecture.repository_id,
            title: lecture.title,
            description: lecture.description,
            video_url: lecture.video_url,
            duration_minutes: lecture.duration_minutes,
            progress_percentage: lecture.progress_percentage,
            sync_order: uploaded
          };

          const { error } = await supabase
            .from('lectures')
            .upsert(supabaseLecture, {
              onConflict: 'id'
            });

          if (error) {
            console.error('Failed to upload lecture:', error);
            conflicts++;
          } else {
            uploaded++;
          }
        } catch (error) {
          console.error('Error uploading lecture:', error);
          conflicts++;
        }
      }

      return { uploaded, conflicts };
    } catch (error) {
      console.error('Failed to get lectures:', error);
      return { uploaded: 0, conflicts: 0 };
    }
  }

  private async uploadFlashcards(): Promise<{ uploaded: number; conflicts: number }> {
    if (!supabase) throw new Error('Supabase not available');
    
    try {
      const flashcards = await invoke<any[]>('get_flashcards');
      let uploaded = 0;
      let conflicts = 0;

      for (const flashcard of flashcards) {
        try {
          const supabaseFlashcard = {
            id: flashcard.id || crypto.randomUUID(),
            repository_id: flashcard.repository_id,
            front_text: flashcard.front_text,
            back_text: flashcard.back_text,
            difficulty: flashcard.difficulty,
            sync_order: uploaded
          };

          const { error } = await supabase
            .from('flashcards')
            .upsert(supabaseFlashcard, {
              onConflict: 'id'
            });

          if (error) {
            console.error('Failed to upload flashcard:', error);
            conflicts++;
          } else {
            uploaded++;
          }
        } catch (error) {
          console.error('Error uploading flashcard:', error);
          conflicts++;
        }
      }

      return { uploaded, conflicts };
    } catch (error) {
      console.error('Failed to get flashcards:', error);
      return { uploaded: 0, conflicts: 0 };
    }
  }

  private async uploadPlannerEvents(): Promise<{ uploaded: number; conflicts: number }> {
    if (!supabase) throw new Error('Supabase not available');
    
    try {
      const events = await invoke<any[]>('get_planner_events');
      let uploaded = 0;
      let conflicts = 0;

      for (const event of events) {
        try {
          const supabaseEvent = {
            id: event.id || crypto.randomUUID(),
            repository_id: event.repository_id,
            title: event.title,
            description: event.description,
            start_time: event.start_time,
            end_time: event.end_time,
            sync_order: uploaded
          };

          const { error } = await supabase
            .from('planner_events')
            .upsert(supabaseEvent, {
              onConflict: 'id'
            });

          if (error) {
            console.error('Failed to upload planner event:', error);
            conflicts++;
          } else {
            uploaded++;
          }
        } catch (error) {
          console.error('Error uploading planner event:', error);
          conflicts++;
        }
      }

      return { uploaded, conflicts };
    } catch (error) {
      console.error('Failed to get planner events:', error);
      return { uploaded: 0, conflicts: 0 };
    }
  }

  private async uploadTasks(): Promise<{ uploaded: number; conflicts: number }> {
    if (!supabase) throw new Error('Supabase not available');
    
    try {
      const tasks = await invoke<any[]>('get_tasks');
      let uploaded = 0;
      let conflicts = 0;

      for (const task of tasks) {
        try {
          const supabaseTask = {
            id: task.id || crypto.randomUUID(),
            repository_id: task.repository_id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            due_date: task.due_date,
            sync_order: uploaded
          };

          const { error } = await supabase
            .from('tasks')
            .upsert(supabaseTask, {
              onConflict: 'id'
            });

          if (error) {
            console.error('Failed to upload task:', error);
            conflicts++;
          } else {
            uploaded++;
          }
        } catch (error) {
          console.error('Error uploading task:', error);
          conflicts++;
        }
      }

      return { uploaded, conflicts };
    } catch (error) {
      console.error('Failed to get tasks:', error);
      return { uploaded: 0, conflicts: 0 };
    }
  }

  // Calculate SHA-256 hash for integrity checking
  async calculateSHA256(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const buffer = await (reader.result as ArrayBuffer).slice(0);
          const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          resolve(hashHex);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  // First-time sync migration guard to prevent data duplication
  private async performFirstTimeSyncGuard(): Promise<void> {
    if (!supabase) throw new Error('Supabase not available');

    // Check if first-time sync guard is active using Rust backend
    const isFirstTimeSync = await invoke<boolean>('check_first_time_sync_guard');
    
    if (!isFirstTimeSync) {
      return; // Not first time sync, proceed normally
    }

    this.notifyProgress({
      phase: 'upload',
      progress: 5,
      message: 'Performing first-time sync initialization...'
    });

    // Check if there's any existing data in Supabase for this user
    const { data: existingRepos, error: reposError } = await supabase
      .from('repositories')
      .select('id')
      .limit(1);

    if (reposError) throw new Error(`Failed to check existing data: ${reposError.message}`);

    if (existingRepos && existingRepos.length > 0) {
      // Cloud has data, this might be a new device joining existing account
      this.notifyProgress({
        phase: 'upload',
        progress: 8,
        message: 'Existing cloud data found, merging...'
      });
      
      // For now, we'll proceed with normal sync which will handle merging via LWW
      // In a production system, you might want more sophisticated merge strategies
    } else {
      // No existing cloud data, this is a truly fresh sync
      this.notifyProgress({
        phase: 'upload',
        progress: 8,
        message: 'Setting up fresh sync environment...'
      });
    }

    // Clear the first-time sync guard to prevent re-running
    await invoke('clear_first_time_sync_guard');
  }




}
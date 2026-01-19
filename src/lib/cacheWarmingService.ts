import { CachedInvoke } from '@/lib/cachedInvoke';
import logger from '@/lib/logger';

export class CacheWarmingService {
  private static instance: CacheWarmingService;
  private warmingInterval: NodeJS.Timeout | null = null;
  private isWarming = false;

  static getInstance(): CacheWarmingService {
    if (!CacheWarmingService.instance) {
      CacheWarmingService.instance = new CacheWarmingService();
    }
    return CacheWarmingService.instance;
  }

  // Start cache warming service
  start(): void {
    if (this.warmingInterval) {
      return;
    }

    logger.info('[CacheWarming] Starting cache warming service');

    // Initial cache warming
    this.warmCache();

    // Periodic cache warming every 15 minutes
    this.warmingInterval = setInterval(() => {
      this.warmCache();
    }, 15 * 60 * 1000);
  }

  // Stop cache warming service
  stop(): void {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = null;
      logger.info('[CacheWarming] Stopped cache warming service');
    }
  }

  // Warm cache with critical data
  private async warmCache(): Promise<void> {
    if (this.isWarming) {
      logger.debug('[CacheWarming] Cache warming already in progress');
      return;
    }

    this.isWarming = true;

    try {
      logger.info('[CacheWarming] Warming cache with critical data');

      // Core application data
      await this.warmCoreData();

      // Conditional data based on user state
      await this.warmConditionalData();

      // Repository-specific data if repositories exist
      await this.warmRepositoryData();

      logger.info('[CacheWarming] Cache warming completed');
    } catch (error) {
      logger.warn('[CacheWarming] Cache warming failed:', error);
    } finally {
      this.isWarming = false;
    }
  }

  // Warm core application data
  private async warmCoreData(): Promise<void> {
    try {
      await CachedInvoke.prefetch([
        { command: 'get_current_user' },
        { command: 'get_user_profile' },
        { command: 'get_onboarding_state' },
        { command: 'get_repositories' },
        { command: 'get_resources', args: { repositoryId: null } },
      ]);
    } catch (error) {
      logger.warn('[CacheWarming] Failed to warm core data:', error);
    }
  }

  // Warm conditional data based on user state
  private async warmConditionalData(): Promise<void> {
    try {
      // Check if user has certain features enabled
      const [profile, onboarding] = await Promise.allSettled([
        CachedInvoke.invoke('get_user_profile'),
        CachedInvoke.invoke('get_onboarding_state')
      ]);

      const userProfile = profile.status === 'fulfilled' ? profile.value : null;
      const onboardingState = onboarding.status === 'fulfilled' ? onboarding.value.value : null;

      if (userProfile) {
        // Warm academic data if user has academic profile
        if (userProfile.university && userProfile.program) {
          await CachedInvoke.prefetch([
            { command: 'get_semesters' },
            { command: 'get_courses' },
            { command: 'get_grades' }
          ]);
        }

        // Warm finance data if enabled
        if (userProfile.finance_enabled) {
          await CachedInvoke.prefetch([
            { command: 'get_finance_summary' },
            { command: 'get_finance_transactions' },
            { command: 'get_finance_budgets' }
          ]);
        }
      }

      // Warm flashcard data if user has resources
      if (onboardingState?.completed) {
        await CachedInvoke.prefetch([
          { command: 'get_flashcards' },
          { command: 'get_study_sessions' }
        ]);
      }
    } catch (error) {
      logger.warn('[CacheWarming] Failed to warm conditional data:', error);
    }
  }

  // Warm repository-specific data
  private async warmRepositoryData(): Promise<void> {
    try {
      const repositories = await CachedInvoke.invoke('get_repositories');
      
      if (!repositories || repositories.length === 0) {
        return;
      }

      // Warm data for each repository (limit to first 3 to avoid overwhelming)
      const repositoriesToWarm = repositories.slice(0, 3);

      for (const repo of repositoriesToWarm) {
        try {
          await CachedInvoke.prefetch([
            { command: 'get_resources', args: { repositoryId: repo.id } },
            { command: 'get_lectures', args: { repositoryId: repo.id } },
            { command: 'get_flashcards', args: { repositoryId: repo.id } },
            { command: 'get_links', args: { repositoryId: repo.id } }
          ]);
        } catch (error) {
          logger.warn(`[CacheWarming] Failed to warm repository ${repo.id}:`, error);
        }
      }
    } catch (error) {
      logger.warn('[CacheWarming] Failed to warm repository data:', error);
    }
  }

  // Warm specific endpoint immediately
  async warmEndpoint(command: string, args?: any): Promise<void> {
    try {
      logger.debug(`[CacheWarming] Warming endpoint: ${command}`);
      await CachedInvoke.invoke(command, args, { backgroundRefresh: false });
    } catch (error) {
      logger.warn(`[CacheWarming] Failed to warm endpoint ${command}:`, error);
    }
  }

  // Warm multiple endpoints
  async warmEndpoints(endpoints: Array<{ command: string; args?: any }>): Promise<void> {
    try {
      await Promise.allSettled(
        endpoints.map(({ command, args }) =>
          CachedInvoke.invoke(command, args, { backgroundRefresh: false })
            .catch(error => logger.warn(`[CacheWarming] Failed to warm ${command}:`, error))
        )
      );
    } catch (error) {
      logger.warn('[CacheWarming] Failed to warm endpoints:', error);
    }
  }

  // Get warming status
  getWarmingStatus(): {
    isWarming: boolean;
    hasWarmingInterval: boolean;
  } {
    return {
      isWarming: this.isWarming,
      hasWarmingInterval: this.warmingInterval !== null
    };
  }

  // Force immediate cache warming
  async forceWarmCache(): Promise<void> {
    await this.warmCache();
  }
}

// Export singleton instance
export const cacheWarmingService = CacheWarmingService.getInstance();
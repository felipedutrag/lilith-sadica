import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export const AppStateService = {
  async getState<T>(key: string): Promise<T | null> {
    const { data, error } = await supabase
      .from('app_state')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') { // Not found is not an error for us
        logger.error({ error, key }, '[AppStateService] Error getting state');
      }
      return null;
    }
    return data.value as T;
  },

  async setState(key: string, value: any): Promise<void> {
    const { error } = await supabase
      .from('app_state')
      .upsert({ key, value, updated_at: new Date().toISOString() });

    if (error) {
      logger.error({ error, key }, '[AppStateService] Error setting state');
    }
  },

  async getAnalyticsConfig<T>(key: string): Promise<T | null> {
    const { data, error } = await supabase
      .from('analytics_config')
      .select('config')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        logger.error({ error, key }, '[AppStateService] Error getting analytics config');
      }
      return null;
    }
    return data.config as T;
  },

  async setAnalyticsConfig(key: string, config: any): Promise<void> {
    const { error } = await supabase
      .from('analytics_config')
      .upsert({ key, config, updated_at: new Date().toISOString() });

    if (error) {
      logger.error({ error, key }, '[AppStateService] Error setting analytics config');
    }
  }
};

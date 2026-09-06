import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface Todo {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'doing' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_at: string | null;
  created_at: string;
  notified_tg: boolean;
}

export interface DashboardNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
}

export const TodoService = {
  async getTodos(): Promise<Todo[]> {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ error }, '[TodoService] Error fetching todos');
      return [];
    }
    return data || [];
  },

  async saveTodo(todo: Partial<Todo> & { title: string }): Promise<Todo | null> {
    const payload = {
      title: todo.title,
      description: todo.description || '',
      status: todo.status || 'pending',
      priority: todo.priority || 'medium',
      due_at: todo.due_at || null,
      notified_tg: todo.notified_tg || false,
    };

    let result;
    if (todo.id) {
      result = await supabase
        .from('todos')
        .update(payload)
        .eq('id', todo.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('todos')
        .insert([payload])
        .select()
        .single();
    }

    if (result.error) {
      logger.error({ error: result.error }, '[TodoService] Error saving todo');
      return null;
    }
    return result.data;
  },

  async deleteTodo(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error({ error }, '[TodoService] Error deleting todo');
      return false;
    }
    return true;
  },

  async getNotifications(): Promise<DashboardNotification[]> {
    const { data, error } = await supabase
      .from('dashboard_notifications')
      .select('*')
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      logger.error({ error }, '[TodoService] Error fetching notifications');
      return [];
    }
    return data || [];
  },

  async addNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<DashboardNotification | null> {
    const { data, error } = await supabase
      .from('dashboard_notifications')
      .insert([{ message, type, read: false }])
      .select()
      .single();

    if (error) {
      logger.error({ error }, '[TodoService] Error adding notification');
      return null;
    }
    return data;
  },

  async markNotificationsAsRead(): Promise<void> {
    const { error } = await supabase
      .from('dashboard_notifications')
      .update({ read: true })
      .eq('read', false);

    if (error) {
      logger.error({ error }, '[TodoService] Error marking notifications as read');
    }
  }
};

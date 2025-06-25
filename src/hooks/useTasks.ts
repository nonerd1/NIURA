import { useState, useEffect, useCallback } from 'react';
import { tasksService, Task, CreateTaskRequest, UpdateTaskRequest, TaskFilters, TaskStats } from '../services/tasksService';

interface UseTasksReturn {
  // Data
  tasks: Task[];
  pendingTasks: Task[];
  completedTasks: Task[];
  
  // Actions
  createTask: (taskData: CreateTaskRequest) => Promise<Task | null>;
  updateTask: (taskData: UpdateTaskRequest) => Promise<Task | null>;
  deleteTask: (taskId: string) => Promise<boolean>;
  toggleTaskCompletion: (taskId: string, completed?: boolean, taskObject?: Task) => Promise<boolean>;
  refreshTasks: () => Promise<void>;
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Filters
  filters: TaskFilters;
  setFilters: (filters: TaskFilters) => void;
  
  // Statistics
  stats: TaskStats;
}

export const useTasks = (initialFilters?: TaskFilters): UseTasksReturn => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<TaskFilters>(initialFilters || {});

  // Load tasks from backend
  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const tasksData = await tasksService.getTasks(filters);
      setTasks(tasksData);
      setError(null);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setError('Failed to load tasks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Create a new task
  const createTask = useCallback(async (taskData: CreateTaskRequest): Promise<Task | null> => {
    try {
      setError(null);
      
      const newTask = await tasksService.createTask(taskData);
      
      // Validate the task has a proper ID before adding to state
      if (newTask && newTask.id) {
        // Check for duplicate IDs in current tasks
        const existingTask = tasks.find(task => task.id === newTask.id);
        if (existingTask) {
          console.warn('Task with duplicate ID detected, generating new ID');
          // Generate a new unique ID if there's a collision
          newTask.id = `${newTask.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        }
        
        // Add to local state
        setTasks(prev => [...prev, newTask]);
        
        return newTask;
      } else {
        throw new Error('Created task is missing required ID');
      }
    } catch (err: any) {
      console.error('Error creating task:', err);
      setError(err.message || 'Failed to create task');
      
      // If backend creation fails, create a local-only task for better UX
      if (taskData.title.trim()) {
        const localTask: Task = {
          id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: taskData.title,
          description: taskData.description || '',
          completed: false,
          priority: taskData.priority || 'medium',
          category: taskData.category || 'work',
          due_date: taskData.due_date,
          estimated_duration: taskData.estimated_duration,
          actual_duration: undefined,
          session_id: taskData.session_id,
          tags: taskData.tags || [],
          notes: taskData.notes || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: undefined,
          _backendId: undefined // Mark as local-only
        };
        
        // Add local task to state
        setTasks(prev => [...prev, localTask]);
        
        console.log('Created local-only task:', localTask);
        return localTask;
      }
      
      return null;
    }
  }, [tasks]);

  // Update an existing task
  const updateTask = useCallback(async (taskData: UpdateTaskRequest): Promise<Task | null> => {
    try {
      setError(null);
      
      const updatedTask = await tasksService.updateTask(taskData);
      
      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      ));
      
      return updatedTask;
    } catch (err: any) {
      console.error('Error updating task:', err);
      setError(err.message || 'Failed to update task');
      return null;
    }
  }, []);

  // Delete a task
  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      setError(null);
      
      console.log('🗑️ Hook: Starting task deletion for ID:', taskId);
      console.log('🗑️ Hook: Current tasks before deletion:', tasks.map(t => ({ id: t.id, title: t.title })));
      
      // Find the task object to get the backend ID
      const taskToDelete = tasks.find(task => task.id === taskId);
      console.log('🗑️ Hook: Task to delete:', taskToDelete ? { id: taskToDelete.id, title: taskToDelete.title, _backendId: taskToDelete._backendId } : 'NOT FOUND');
      
      // Check if this is a local-only task
      if (taskId.startsWith('local-')) {
        console.log('🗑️ Hook: Deleting local-only task');
        // Local-only task - just remove from state
        setTasks(prev => {
          const filtered = prev.filter(task => task.id !== taskId);
          console.log('🗑️ Hook: Local deletion - tasks after filter:', filtered.map(t => ({ id: t.id, title: t.title })));
          return filtered;
        });
        console.log('Deleted local-only task:', taskId);
        return true;
      }
      
      console.log('🗑️ Hook: Attempting backend deletion...');
      // Try to delete from backend, passing the task object for _backendId
      const success = await tasksService.deleteTask(taskId, taskToDelete);
      console.log('🗑️ Hook: Backend deletion result:', success);
      
      if (success) {
        console.log('🗑️ Hook: Backend deletion successful, updating local state...');
        // Remove from local state
        setTasks(prev => {
          const filtered = prev.filter(task => task.id !== taskId);
          console.log('🗑️ Hook: Tasks before deletion:', prev.map(t => ({ id: t.id, title: t.title })));
          console.log('🗑️ Hook: Tasks after deletion:', filtered.map(t => ({ id: t.id, title: t.title })));
          console.log('🗑️ Hook: Successfully removed task with ID:', taskId);
          return filtered;
        });
        console.log('🗑️ Hook: State update completed');
      } else {
        console.log('🗑️ Hook: Backend deletion failed');
      }
      
      return success;
    } catch (err: any) {
      console.error('🗑️ Hook: Error deleting task:', err);
      
      // If backend deletion fails but it's a task that exists locally, 
      // still remove it from local state for better UX
      if (err.message?.includes('locally generated') || err.message?.includes('cannot be deleted')) {
        console.log('🗑️ Hook: Removing from local state due to backend limitation');
        setTasks(prev => prev.filter(task => task.id !== taskId));
        console.log('Removed task from local state due to backend limitation:', taskId);
        return true;
      }
      
      setError(err.message || 'Failed to delete task');
      return false;
    }
  }, [tasks]);

  // Toggle task completion
  const toggleTaskCompletion = useCallback(async (taskId: string, completed?: boolean, taskObject?: Task): Promise<boolean> => {
    try {
      setError(null);
      
      // Find the current task
      const currentTask = tasks.find(task => task.id === taskId);
      if (!currentTask) {
        console.error('Task not found in hook. Available tasks:', tasks.map(t => ({ id: t.id, title: t.title })));
        throw new Error('Task not found');
      }
      
      console.log('Before toggle - Current task:', { id: currentTask.id, completed: currentTask.completed, title: currentTask.title });
      
      // Toggle completion status, passing the task object to avoid "Task not found" errors
      const targetCompleted = completed !== undefined ? completed : !currentTask.completed;
      const targetTask = taskObject || currentTask;
      
      console.log('Toggling to completed:', targetCompleted);
      
      const updatedTask = await tasksService.toggleTaskCompletion(taskId, targetCompleted, targetTask);
      
      console.log('Received updated task from service:', { id: updatedTask.id, completed: updatedTask.completed, title: updatedTask.title });
      
      // Update local state
      setTasks(prev => {
        const newTasks = prev.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        );
        console.log('Updated tasks array. Task with ID', updatedTask.id, 'now has completed:', newTasks.find(t => t.id === updatedTask.id)?.completed);
        return newTasks;
      });
      
      return true;
    } catch (err: any) {
      console.error('Error toggling task completion:', err);
      setError(err.message || 'Failed to update task');
      return false;
    }
  }, [tasks]);

  // Refresh tasks
  const refreshTasks = useCallback(async () => {
    await loadTasks();
  }, [loadTasks]);

  // Set filters
  const setFilters = useCallback((newFilters: TaskFilters) => {
    setFiltersState(newFilters);
  }, []);

  // Get pending tasks
  const pendingTasks = useCallback(() => {
    return tasks.filter(task => !task.completed);
  }, [tasks])();

  // Get completed tasks
  const completedTasks = useCallback(() => {
    return tasks.filter(task => task.completed);
  }, [tasks])();

  // Calculate statistics
  const stats = useCallback(() => {
    return tasksService.calculateTaskStats(tasks);
  }, [tasks])();

  return {
    // Data
    tasks,
    pendingTasks,
    completedTasks,
    
    // Actions
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    refreshTasks,
    
    // State
    isLoading,
    error,
    
    // Filters
    filters,
    setFilters,
    
    // Statistics
    stats,
  };
}; 
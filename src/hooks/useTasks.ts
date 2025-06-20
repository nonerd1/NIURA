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
  toggleTaskCompletion: (taskId: string) => Promise<boolean>;
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
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Loading tasks...', filters);
      
      const tasksData = await tasksService.getTasks(filters);
      setTasks(tasksData);
      
      console.log('Tasks loaded successfully:', tasksData);
    } catch (err: any) {
      console.error('Error loading tasks:', err);
      setError(err.message || 'Failed to load tasks');
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
      
      // Add to local state
      setTasks(prev => [...prev, newTask]);
      
      return newTask;
    } catch (err: any) {
      console.error('Error creating task:', err);
      setError(err.message || 'Failed to create task');
      return null;
    }
  }, []);

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
      
      const success = await tasksService.deleteTask(taskId);
      
      if (success) {
        // Remove from local state
        setTasks(prev => prev.filter(task => task.id !== taskId));
      }
      
      return success;
    } catch (err: any) {
      console.error('Error deleting task:', err);
      setError(err.message || 'Failed to delete task');
      return false;
    }
  }, []);

  // Toggle task completion
  const toggleTaskCompletion = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Find the current task
      const currentTask = tasks.find(task => task.id === taskId);
      if (!currentTask) {
        throw new Error('Task not found');
      }
      
      // Toggle completion status
      const updatedTask = await tasksService.toggleTaskCompletion(taskId, !currentTask.completed);
      
      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      ));
      
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
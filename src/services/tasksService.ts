import { apiClient } from './apiClient';
import { apiConfig } from '../config/amplify';

// Task Types
export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category?: 'work' | 'personal' | 'study' | 'health' | 'custom';
  due_date?: string; // ISO date string
  estimated_duration?: number; // in minutes
  actual_duration?: number; // in minutes
  session_id?: string; // Associated session ID
  tags?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  _backendId?: string | number; // Optional backend ID for operations
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  category?: 'work' | 'personal' | 'study' | 'health' | 'custom';
  due_date?: string;
  estimated_duration?: number;
  session_id?: string;
  tags?: string[];
  notes?: string;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  id: string;
  completed?: boolean;
  actual_duration?: number;
  completed_at?: string;
}

export interface TasksResponse {
  success: boolean;
  tasks: Task[];
  total_count?: number;
  message?: string;
}

export interface TaskResponse {
  success: boolean;
  task: Task;
  message?: string;
}

export interface DeleteTaskResponse {
  success: boolean;
  message?: string;
}

export interface TaskFilters {
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  category?: 'work' | 'personal' | 'study' | 'health' | 'custom';
  session_id?: string;
  due_date?: string;
  search?: string; // Search in title and description
}

export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
  averageDuration: number;
  totalTimeSpent: number;
}

// Backend response interfaces
interface TaskApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

class TasksService {
  
  // Type guard to check if response is a Task
  private isTask(obj: any): obj is Task {
    return obj && typeof obj === 'object' && 'title' in obj && 'id' in obj && 'completed' in obj;
  }

  // Type guard to check if response has data property
  private hasDataProperty(obj: any): obj is TaskApiResponse<Task> {
    return obj && typeof obj === 'object' && 'data' in obj;
  }

  // Type guard to check if response has task property
  private hasTaskProperty(obj: any): obj is TaskResponse {
    return obj && typeof obj === 'object' && 'task' in obj;
  }
  
  // Create Task - POST /api/tasks
  async createTask(taskData: CreateTaskRequest): Promise<Task> {
    try {
      console.log('Creating task...', taskData);
      
      // Transform frontend data to backend format
      const backendData = {
        label: taskData.title, // Backend expects 'label' instead of 'title'
        description: taskData.description || taskData.title, // Backend requires description
        priority: taskData.priority || 'medium',
        category: taskData.category || 'work',
        completed: false, // New tasks are always incomplete
        due_date: taskData.due_date,
        estimated_duration: taskData.estimated_duration,
        session_id: taskData.session_id,
        tags: taskData.tags,
        notes: taskData.notes
      };
      
      console.log('Sending to backend:', backendData);
      
      const response = await apiClient.post<any>(
        apiConfig.endpoints.createTask,
        backendData
      );
      
      console.log('Backend response:', response.data);
      
      // Handle the specific backend response format: {message: "Task added", task: id}
      if (response.data && response.data.task && response.data.message === "Task added") {
        // Backend returned just the ID, create a proper task object
        const taskId = response.data.task;
        const createdTask: Task = {
          id: taskId.toString(), // Convert to string for consistency
          title: taskData.title,
          description: taskData.description || taskData.title,
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
          _backendId: taskId // Store the numeric backend ID
        };
        
        console.log('Task created successfully:', createdTask);
        return createdTask;
      }
      
      // Handle other response formats (fallback)
      let task: Task;
      if (this.isTask(response.data)) {
        task = response.data;
      } else if (this.hasDataProperty(response.data)) {
        task = response.data.data;
      } else if (this.hasTaskProperty(response.data)) {
        task = response.data.task;
      } else {
        // Transform the response to match our Task interface
        task = this.transformBackendTask(response.data);
      }
      
      console.log('Task created successfully:', task);
      return task;
    } catch (error: any) {
      console.error('Error creating task:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create task');
    }
  }

  // Update Task - PUT /api/tasks/{id}
  async updateTask(taskData: UpdateTaskRequest): Promise<Task> {
    try {
      console.log('Updating task...', taskData);
      
      const endpoint = apiConfig.endpoints.updateTask.replace('{id}', taskData.id);
      const { id, ...updateData } = taskData;
      
      // Add completion timestamp if marking as completed
      if (updateData.completed === true) {
        updateData.completed_at = new Date().toISOString();
      }
      
      const response = await apiClient.put<any>(
        endpoint,
        updateData
      );
      
      // Handle different response formats
      let task: Task;
      if (this.isTask(response.data)) {
        task = response.data;
      } else if (this.hasDataProperty(response.data)) {
        task = response.data.data;
      } else if (this.hasTaskProperty(response.data)) {
        task = response.data.task;
      } else {
        throw new Error('Invalid response format');
      }
      
      console.log('Task updated successfully:', task);
      return task;
    } catch (error: any) {
      console.error('Error updating task:', error);
      throw new Error(error.message || 'Failed to update task');
    }
  }

  // Delete Task - DELETE /api/tasks/{id}
  async deleteTask(taskId: string, task?: Task): Promise<boolean> {
    try {
      console.log('Deleting task...', taskId);
      console.log('Task object:', task);
      
      let backendTaskId: string | number;
      
      // Priority 1: If we have the task object with _backendId, use it
      if (task && task._backendId !== undefined && task._backendId !== null) {
        backendTaskId = task._backendId;
        console.log('Using backend ID from task object:', backendTaskId);
      } 
      // Priority 2: If taskId is numeric, use it directly
      else if (!isNaN(Number(taskId))) {
        backendTaskId = Number(taskId);
        console.log('Using numeric task ID directly:', backendTaskId);
      } 
      // Priority 3: Check if this is a local-only task (no backend ID available)
      else if (!task || task._backendId === undefined || task._backendId === null) {
        console.warn('Cannot delete task - no backend ID available:', taskId);
        throw new Error('This task exists only locally and cannot be deleted from the server.');
      }
      // Priority 4: Last resort - try to parse as number
      else {
        console.warn('Cannot determine backend ID for task:', taskId);
        throw new Error('Cannot delete this task - unable to determine backend ID.');
      }
      
      const endpoint = apiConfig.endpoints.deleteTask.replace('{id}', backendTaskId.toString());
      console.log('Deleting from endpoint:', endpoint);
      
      const response = await apiClient.delete<DeleteTaskResponse>(endpoint);
      
      console.log('Task deleted successfully from backend');
      return response.data.success;
    } catch (error: any) {
      console.error('Error deleting task:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete task');
    }
  }

  // Helper method to transform backend task data to frontend format
  private transformBackendTask(backendTask: any): Task {
    // Use the backend ID if it exists and is numeric, otherwise generate one
    let id: string;
    if (backendTask.id && !isNaN(Number(backendTask.id))) {
      id = backendTask.id.toString();
    } else if (backendTask.label) {
      // For string-based tasks, create a more unique ID to avoid collisions
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substr(2, 9);
      id = `${backendTask.label}-${timestamp}-${randomSuffix}`;
    } else {
      // Generate completely unique ID for tasks without labels
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substr(2, 9);
      id = `task-${timestamp}-${randomSuffix}`;
    }
    
    return {
      id: id,
      title: backendTask.label || backendTask.title || 'Untitled Task',
      description: backendTask.description || '',
      completed: backendTask.completed || false,
      priority: backendTask.priority || 'medium',
      category: backendTask.category || 'work',
      due_date: backendTask.due_date,
      estimated_duration: backendTask.estimated_duration,
      actual_duration: backendTask.actual_duration,
      session_id: backendTask.session_id,
      tags: backendTask.tags || [],
      notes: backendTask.notes || '',
      created_at: backendTask.created_at || new Date().toISOString(),
      updated_at: backendTask.updated_at || new Date().toISOString(),
      completed_at: backendTask.completed_at,
      // Store the original backend ID for operations if different from our ID
      ...(backendTask.id && backendTask.id !== id && { _backendId: backendTask.id })
    };
  }

  // Get Tasks - GET /api/tasks
  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    try {
      console.log('Fetching tasks...', filters);
      
      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      
      const url = queryParams.toString() 
        ? `${apiConfig.endpoints.getTasks}?${queryParams.toString()}`
        : apiConfig.endpoints.getTasks;
      
      const response = await apiClient.get<TasksResponse | Task[]>(url);
      
      // Handle different response formats
      const rawTasks = Array.isArray(response.data) 
        ? response.data 
        : (response.data as TasksResponse).tasks;
      
      // Transform backend data to frontend format
      const tasks = (rawTasks || []).map(task => this.transformBackendTask(task));
      
      console.log('Tasks fetched and transformed successfully:', tasks);
      return tasks;
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      throw new Error(error.message || 'Failed to fetch tasks');
    }
  }

  // Get tasks for a specific session
  async getTasksForSession(sessionId: string): Promise<Task[]> {
    return this.getTasks({ session_id: sessionId });
  }

  // Get pending tasks
  async getPendingTasks(): Promise<Task[]> {
    return this.getTasks({ completed: false });
  }

  // Get completed tasks
  async getCompletedTasks(): Promise<Task[]> {
    return this.getTasks({ completed: true });
  }

  // Toggle task completion
  async toggleTaskCompletion(taskId: string, completed: boolean): Promise<Task> {
    return this.updateTask({ 
      id: taskId, 
      completed,
      ...(completed && { actual_duration: this.calculateTaskDuration(taskId) })
    });
  }

  // Helper method to get task priority color
  getTaskPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FFB020';
      case 'low': return '#4CAF50';
      default: return '#757575';
    }
  }

  // Helper method to get task category color
  getTaskCategoryColor(category: string): string {
    switch (category) {
      case 'work': return '#2196F3';
      case 'personal': return '#9C27B0';
      case 'study': return '#FF9800';
      case 'health': return '#4CAF50';
      case 'custom': return '#607D8B';
      default: return '#757575';
    }
  }

  // Helper method to get task category icon
  getTaskCategoryIcon(category: string): string {
    switch (category) {
      case 'work': return 'briefcase';
      case 'personal': return 'account';
      case 'study': return 'book-open';
      case 'health': return 'heart';
      case 'custom': return 'cog';
      default: return 'clipboard-text';
    }
  }

  // Helper method to get task priority icon
  getTaskPriorityIcon(priority: string): string {
    switch (priority) {
      case 'high': return 'alert';
      case 'medium': return 'minus';
      case 'low': return 'arrow-down';
      default: return 'minus';
    }
  }

  // Helper method to format task duration
  formatTaskDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  }

  // Helper method to check if task is overdue
  isTaskOverdue(task: Task): boolean {
    if (!task.due_date || task.completed) return false;
    
    const dueDate = new Date(task.due_date);
    const now = new Date();
    return dueDate < now;
  }

  // Helper method to calculate task statistics
  calculateTaskStats(tasks: Task[]): TaskStats {
    if (tasks.length === 0) {
      return {
        total: 0,
        completed: 0,
        pending: 0,
        overdue: 0,
        completionRate: 0,
        averageDuration: 0,
        totalTimeSpent: 0
      };
    }

    const completed = tasks.filter(task => task.completed).length;
    const pending = tasks.filter(task => !task.completed).length;
    const overdue = tasks.filter(task => this.isTaskOverdue(task)).length;
    
    const completedTasks = tasks.filter(task => task.completed && task.actual_duration);
    const totalTimeSpent = completedTasks.reduce((sum, task) => sum + (task.actual_duration || 0), 0);
    const averageDuration = completedTasks.length > 0 ? totalTimeSpent / completedTasks.length : 0;

    return {
      total: tasks.length,
      completed,
      pending,
      overdue,
      completionRate: Math.round((completed / tasks.length) * 100),
      averageDuration: Math.round(averageDuration),
      totalTimeSpent
    };
  }

  // Helper method to calculate task duration (placeholder)
  private calculateTaskDuration(taskId: string): number {
    // This would typically calculate based on when the task was started
    // For now, return a default value
    return 30; // 30 minutes default
  }

  // Helper method to get default task categories
  getDefaultCategories(): Array<{ value: Task['category'], label: string, icon: string, color: string }> {
    return [
      { 
        value: 'work', 
        label: 'Work', 
        icon: 'briefcase', 
        color: '#2196F3' 
      },
      { 
        value: 'personal', 
        label: 'Personal', 
        icon: 'account', 
        color: '#9C27B0' 
      },
      { 
        value: 'study', 
        label: 'Study', 
        icon: 'book-open', 
        color: '#FF9800' 
      },
      { 
        value: 'health', 
        label: 'Health', 
        icon: 'heart', 
        color: '#4CAF50' 
      },
      { 
        value: 'custom', 
        label: 'Custom', 
        icon: 'cog', 
        color: '#607D8B' 
      }
    ];
  }

  // Helper method to get default task priorities
  getDefaultPriorities(): Array<{ value: Task['priority'], label: string, icon: string, color: string }> {
    return [
      { 
        value: 'high', 
        label: 'High Priority', 
        icon: 'alert', 
        color: '#FF6B6B' 
      },
      { 
        value: 'medium', 
        label: 'Medium Priority', 
        icon: 'minus', 
        color: '#FFB020' 
      },
      { 
        value: 'low', 
        label: 'Low Priority', 
        icon: 'arrow-down', 
        color: '#4CAF50' 
      }
    ];
  }
}

export const tasksService = new TasksService(); 
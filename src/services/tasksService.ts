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
  _backendLabel?: string; // Optional backend label for operations when ID is not available
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

// Backend task response (minimal format from current backend)
interface BackendTaskMinimal {
  label: string;
  description?: string;
  completed?: boolean;
  priority?: string;
  category?: string;
  due_date?: string;
  estimated_duration?: number;
  actual_duration?: number;
  session_id?: string;
  tags?: string[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
}

// Backend task response (complete format with ID)
interface BackendTaskComplete extends BackendTaskMinimal {
  id: number | string;
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
        description: taskData.description || '', // Send empty string instead of title
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
          description: taskData.description || '', // Only set description if provided
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
          _backendId: taskId, // Store the numeric backend ID
          _backendLabel: taskData.title // Store the original label for backend operations
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
      
      // Get the backend ID (numeric) for the URL path
      let backendId: number;
      if (!isNaN(Number(taskData.id))) {
        backendId = Number(taskData.id);
      } else {
        throw new Error('Invalid task ID format for backend update');
      }
      
      const endpoint = apiConfig.endpoints.updateTask.replace('{id}', backendId.toString());
      const { id, title, ...updateData } = taskData;
      
      // Transform frontend data to backend format
      const backendUpdateData = {
        ...updateData,
        label: title, // Backend expects 'label' instead of 'title'
        description: updateData.description || '', // Ensure description is included
      };
      
      // Add completion timestamp if marking as completed
      if (backendUpdateData.completed === true) {
        backendUpdateData.completed_at = new Date().toISOString();
      }
      
      console.log('Sending update to backend:', { endpoint, data: backendUpdateData });
      
      const response = await apiClient.put<any>(
        endpoint,
        backendUpdateData
      );
      
      console.log('Backend update response:', response.data);
      
      // Handle different response formats
      let task: Task;
      console.log('Checking response format. Response data:', response.data);
      console.log('Is Task?', this.isTask(response.data));
      console.log('Has data property?', this.hasDataProperty(response.data));
      console.log('Has task property?', this.hasTaskProperty(response.data));
      console.log('Is update confirmation?', response.data && response.data.message === "Task updated" && response.data.task);
      
      if (this.isTask(response.data)) {
        console.log('✅ Path 1: Response is a Task');
        task = response.data;
      } else if (this.hasDataProperty(response.data)) {
        console.log('✅ Path 2: Response has data property');
        task = response.data.data;
      } 
      // Handle the specific backend response format: {"message": "Task updated", "task": task.id}
      // CHECK THIS BEFORE hasTaskProperty because it's more specific
      else if (response.data && response.data.message === "Task updated" && response.data.task) {
        console.log('✅ Path 3: Backend returned update confirmation with ID:', response.data.task);
        // Backend only returned the ID, construct the updated task object from our data
        task = {
          id: taskData.id,
          title: title || 'Updated Task',
          description: updateData.description || '',
          completed: backendUpdateData.completed !== undefined ? backendUpdateData.completed : false,
          priority: updateData.priority || 'medium',
          category: updateData.category || 'work',
          due_date: updateData.due_date,
          estimated_duration: updateData.estimated_duration,
          actual_duration: updateData.actual_duration,
          session_id: updateData.session_id,
          tags: updateData.tags || [],
          notes: updateData.notes || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: backendUpdateData.completed_at,
          _backendId: backendId,
          _backendLabel: title || 'Updated Task'
        };
        console.log('Constructed updated task from backend confirmation:', { id: task.id, completed: task.completed, title: task.title });
      }
      else if (this.hasTaskProperty(response.data)) {
        console.log('✅ Path 4: Response has task property (generic)');
        task = response.data.task;
      } 
      else {
        console.log('✅ Path 5: Fallback - constructing task from our data');
        // If the response doesn't have the updated task, create it from our data
        // Make sure to use the UPDATED values, not the original task values
        task = {
          id: taskData.id,
          title: title || 'Updated Task',
          description: updateData.description || '',
          completed: backendUpdateData.completed !== undefined ? backendUpdateData.completed : false,
          priority: updateData.priority || 'medium',
          category: updateData.category || 'work',
          due_date: updateData.due_date,
          estimated_duration: updateData.estimated_duration,
          actual_duration: updateData.actual_duration,
          session_id: updateData.session_id,
          tags: updateData.tags || [],
          notes: updateData.notes || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: backendUpdateData.completed_at,
          _backendId: backendId,
          _backendLabel: title || 'Updated Task'
        };
      }
      
      console.log('Task updated successfully:', task);
      console.log('Final task completed status:', task.completed);
      return task;
    } catch (error: any) {
      console.error('Error updating task:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update task');
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
      console.log('Backend delete response:', response.data);
      
      // Handle the actual backend response format: {"message": "Task deleted"}
      if (response.data && response.data.message === "Task deleted") {
        console.log('✅ Backend confirmed task deletion');
        return true;
      }
      
      // Fallback: check for success field (in case backend format changes)
      if (response.data && response.data.success) {
        console.log('✅ Backend returned success field');
        return response.data.success;
      }
      
      // If we get here, the response format is unexpected
      console.warn('⚠️ Unexpected backend delete response format:', response.data);
      return true; // Assume success if we didn't get an error
    } catch (error: any) {
      console.error('Error deleting task:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete task');
    }
  }

  // Helper method to transform backend task data to frontend format
  private transformBackendTask(backendTask: any): Task {
    console.log('Transforming task:', { id: backendTask.id, label: backendTask.label });
    
    // ALWAYS use the backend ID as the frontend ID if it's numeric
    let id: string;
    let backendId: number | undefined;
    
    if (backendTask.id && !isNaN(Number(backendTask.id))) {
      // Backend has a numeric ID - use it directly
      backendId = Number(backendTask.id);
      id = backendId.toString(); // Use the numeric ID as string for frontend
      console.log('✅ Using backend numeric ID:', backendId, 'as frontend ID:', id);
    } else if (backendTask.label) {
      // Fallback: generate ID from label if backend ID is missing/invalid
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substr(2, 9);
      id = `${backendTask.label}-${timestamp}-${randomSuffix}`;
      console.warn('⚠️ Generated ID for task without valid backend ID:', id);
    } else {
      // Last resort: generate completely unique ID
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substr(2, 9);
      id = `task-${timestamp}-${randomSuffix}`;
      console.warn('⚠️ Generated fallback ID for task:', id);
    }
    
    const result = {
      id: id,
      title: backendTask.label || backendTask.title || 'Untitled Task',
      description: backendTask.description || undefined,
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
      _backendId: backendId, // Store the numeric backend ID for operations
      _backendLabel: backendTask.label // Store the original label for backend operations
    };
    
    console.log('Transformed result:', { id: result.id, _backendId: result._backendId, title: result.title });
    
    return result;
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
      
      console.log('=== BACKEND RESPONSE ===');
      console.log('Raw backend response:', JSON.stringify(response.data, null, 2));
      
      // Handle different response formats
      const rawTasks: (BackendTaskMinimal | BackendTaskComplete | Task)[] = Array.isArray(response.data) 
        ? response.data 
        : (response.data as TasksResponse).tasks;
      
      console.log('Extracted tasks:', JSON.stringify(rawTasks, null, 2));
      
      // Check if we have proper task data with IDs
      if (rawTasks && rawTasks.length > 0) {
        const firstTask = rawTasks[0] as any;
        
        // If tasks now have proper IDs, use the standard transformation
        if (firstTask.id !== undefined && firstTask.id !== null) {
          console.log('✅ Backend now returning tasks with IDs! Processing normally...');
          
          const tasks = rawTasks.map((task: any) => this.transformBackendTask(task));
          
          console.log('=== TRANSFORMED TASKS ===');
          tasks.forEach((task, index) => {
            console.log(`Task ${index + 1}:`, { 
              id: task.id, 
              _backendId: task._backendId, 
              title: task.title,
              hasNumericBackendId: !isNaN(Number(task._backendId))
            });
          });
          
          return tasks;
        }
        
        // Fallback: If still only labels, use the consistent ID generation
        else if (firstTask.label && !firstTask.id) {
          console.warn('⚠️ Backend still returning minimal task data. Using consistent ID generation...');
          
          const functionalTasks = (rawTasks as BackendTaskMinimal[]).map((task: BackendTaskMinimal, index: number) => {
            const consistentId = this.generateConsistentId(task.label, index);
            
            return {
              id: consistentId,
              title: task.label,
              description: task.description || '',
              completed: task.completed || false,
              priority: (task.priority as any) || 'medium',
              category: (task.category as any) || 'work',
              due_date: task.due_date,
              estimated_duration: task.estimated_duration,
              actual_duration: task.actual_duration,
              session_id: task.session_id,
              tags: task.tags || [],
              notes: task.notes || '',
              created_at: task.created_at || new Date().toISOString(),
              updated_at: task.updated_at || new Date().toISOString(),
              completed_at: task.completed_at,
              _backendId: undefined,
              _backendLabel: task.label
            };
          });
          
          console.log('Created functional tasks with consistent IDs');
          return functionalTasks;
        }
      }
      
      console.log('No tasks found or unexpected format');
      return [];
      
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      throw new Error(error.message || 'Failed to fetch tasks');
    }
  }

  // Helper method to generate consistent IDs for tasks without backend IDs
  private generateConsistentId(label: string, index: number): string {
    // Create a simple hash of the label to ensure consistency
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      const char = label.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `task-${Math.abs(hash)}-${index}`;
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
  async toggleTaskCompletion(taskId: string, completed: boolean, taskObject?: Task): Promise<Task> {
    try {
      console.log('Toggling task completion...', { taskId, completed, taskObject: taskObject ? { id: taskObject.id, _backendId: taskObject._backendId } : 'none' });
      
      let currentTask: Task;
      
      // If task object is provided, use it directly
      if (taskObject) {
        currentTask = taskObject;
        console.log('Using provided task object:', { id: currentTask.id, _backendId: currentTask._backendId, title: currentTask.title });
      } else {
        // Otherwise, try to find it in the current tasks list
        const tasks = await this.getTasks();
        const foundTask = tasks.find(task => task.id === taskId);
        
        if (!foundTask) {
          console.error('Task not found in tasks list. Available tasks:', tasks.map(t => ({ id: t.id, title: t.title, _backendId: t._backendId })));
          throw new Error('Task not found');
        }
        
        currentTask = foundTask;
      }
      
      // Determine the backend ID to use
      let numericId: number;
      
      // Priority 1: Use _backendId if it exists
      if (currentTask._backendId !== undefined && currentTask._backendId !== null) {
        numericId = Number(currentTask._backendId);
        console.log('Using _backendId:', numericId);
      }
      // Priority 2: If the task ID itself is numeric, use it
      else if (!isNaN(Number(currentTask.id))) {
        numericId = Number(currentTask.id);
        console.log('Using numeric task ID:', numericId);
      }
      // Priority 3: If taskId parameter is numeric, use it
      else if (!isNaN(Number(taskId))) {
        numericId = Number(taskId);
        console.log('Using numeric taskId parameter:', numericId);
      }
      // Priority 4: WORKAROUND - Try to find backend task by title match
      else {
        console.warn('No numeric ID available, attempting title-based lookup...');
        try {
          // Get fresh data from backend and try to match by title
          const backendTasks = await this.getTasksDirectlyFromBackend();
          const matchingBackendTask = backendTasks.find(task => 
            (task.label === currentTask.title || task.title === currentTask.title || task.label === currentTask._backendLabel)
          );
          
          if (matchingBackendTask && !isNaN(Number(matchingBackendTask.id))) {
            numericId = Number(matchingBackendTask.id);
            console.log('✅ Found matching backend task by title:', { title: currentTask.title, backendId: numericId });
          } else {
            console.error('No valid numeric ID found. Task:', { id: currentTask.id, _backendId: currentTask._backendId, title: currentTask.title, _backendLabel: currentTask._backendLabel });
            console.error('Backend tasks:', backendTasks.map(t => ({ id: t.id, label: t.label })));
            
            // If we have a backend label, this suggests the task exists in backend but we can't update it
            if (currentTask._backendLabel) {
              console.warn('⚠️ Task exists in backend but cannot be updated due to missing numeric ID');
              throw new Error('This task cannot be updated - backend ID unavailable. Please refresh the app.');
            } else {
              console.warn('⚠️ Local-only task cannot be synced to backend');
              throw new Error('This is a local-only task and cannot be synced to the server.');
            }
          }
        } catch (backendError) {
          console.error('Backend lookup failed:', backendError);
          throw new Error('Failed to sync task with backend - please try refreshing the app');
        }
      }
      
      console.log('Final backend ID for update:', numericId);
      
      return this.updateTask({ 
        id: numericId.toString(), // Convert back to string for the updateTask method
        title: currentTask.title, // Include required label field
        description: currentTask.description || '', // Include required description field
        completed,
        priority: currentTask.priority,
        category: currentTask.category,
        ...(completed && { actual_duration: this.calculateTaskDuration(taskId) })
      });
    } catch (error: any) {
      console.error('Error toggling task completion:', error);
      throw new Error(error.message || 'Failed to toggle task completion');
    }
  }

  // Helper method to get tasks directly from backend without transformation
  private async getTasksDirectlyFromBackend(): Promise<any[]> {
    try {
      const response = await apiClient.get<any>(apiConfig.endpoints.getTasks);
      return Array.isArray(response.data) ? response.data : (response.data.tasks || []);
    } catch (error) {
      console.error('Error getting tasks directly from backend:', error);
      return [];
    }
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
      case 'work': return 'briefcase-outline';
      case 'personal': return 'account-circle-outline';
      case 'study': return 'book-open-outline';
      case 'health': return 'heart-outline';
      case 'custom': return 'cog-outline';
      default: return 'clipboard-text-outline';
    }
  }

  // Helper method to get task priority icon
  getTaskPriorityIcon(priority: string): string {
    switch (priority) {
      case 'high': return 'fire';
      case 'medium': return 'circle-medium';
      case 'low': return 'chevron-down';
      default: return 'circle-medium';
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
        icon: 'briefcase-outline', 
        color: '#2196F3' 
      },
      { 
        value: 'personal', 
        label: 'Personal', 
        icon: 'account-circle-outline', 
        color: '#9C27B0' 
      },
      { 
        value: 'study', 
        label: 'Study', 
        icon: 'book-open-outline', 
        color: '#FF9800' 
      },
      { 
        value: 'health', 
        label: 'Health', 
        icon: 'heart-outline', 
        color: '#4CAF50' 
      },
      { 
        value: 'custom', 
        label: 'Custom', 
        icon: 'cog-outline', 
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
        icon: 'fire', 
        color: '#FF6B6B' 
      },
      { 
        value: 'medium', 
        label: 'Medium Priority', 
        icon: 'circle-medium', 
        color: '#FFB020' 
      },
      { 
        value: 'low', 
        label: 'Low Priority', 
        icon: 'chevron-down', 
        color: '#4CAF50' 
      }
    ];
  }
}

export const tasksService = new TasksService(); 
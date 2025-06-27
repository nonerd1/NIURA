import { useState, useEffect } from 'react';
import { goalsService, Goal } from '../services/goalsService';

export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = goalsService.subscribe((updatedGoals) => {
      setGoals(updatedGoals);
      setIsLoading(false);
    });

    // Initial load - check if already loaded
    const currentGoals = goalsService.getGoals();
    if (currentGoals.length > 0) {
      setGoals(currentGoals);
      setIsLoading(false);
    } else {
      // Goals are still loading from backend
      setIsLoading(goalsService.isLoadingGoals());
    }

    return unsubscribe;
  }, []);

  const addGoal = (goal: Omit<Goal, 'id' | 'current'>) => {
    return goalsService.addGoal(goal);
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    return goalsService.updateGoal(id, updates);
  };

  const deleteGoal = (id: string) => {
    return goalsService.deleteGoal(id);
  };

  const refreshGoals = async () => {
    setIsLoading(true);
    try {
      await goalsService.refreshGoals();
    } catch (error) {
      console.error('Error refreshing goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    goals,
    isLoading,
    addGoal,
    updateGoal,
    deleteGoal,
    refreshGoals
  };
}; 
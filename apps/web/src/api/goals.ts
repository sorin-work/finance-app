import { api } from './client';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string | null;
  color: string;
  progress: number;
  completed: boolean;
}

export interface GoalInput {
  name: string;
  targetAmount: number;
  targetDate: string | null;
  color: string;
}

export async function fetchGoals(): Promise<Goal[]> {
  return (await api.get<{ goals: Goal[] }>('/goals')).goals;
}

export async function createGoal(input: GoalInput & { savedAmount?: number }): Promise<Goal> {
  return (await api.post<{ goal: Goal }>('/goals', input)).goal;
}

export async function updateGoal(id: string, input: Partial<GoalInput>): Promise<Goal> {
  return (await api.patch<{ goal: Goal }>(`/goals/${id}`, input)).goal;
}

export async function contributeToGoal(id: string, amount: number): Promise<Goal> {
  return (await api.post<{ goal: Goal }>(`/goals/${id}/contributions`, { amount })).goal;
}

export function deleteGoal(id: string): Promise<void> {
  return api.delete(`/goals/${id}`);
}


export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  points: number;
}

export interface HealthData {
  userId: string;
  age: number;
  height: number; // in cm
  weight: number; // in kg
  gender: 'Male' | 'Female' | 'Other';
  fitnessLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  existingConditions: string;
  allergies: string;
  medications: string;
  preferredLanguage: string;
}

export interface DailyMetrics {
    userId: string;
    date: string; // YYYY-MM-DD
    heartRate?: number;
    steps?: number;
    sleepHours?: number;
    breathingRate?: number;
    distanceTravelled?: number; // in km
    caloriesBurnt?: number;
}

export type GameType = 'Clicker' | 'Memory';

export interface GameSession {
    userId: string;
    gameType: GameType;
    score: number;
    timestamp: Date;
}

export interface Recommendation {
    id: number; // Changed from string to number to match BIGINT PK
    userId: string;
    goal: string;
    category: 'Diet' | 'Exercise' | 'Mental Health' | 'General';
    difficulty: 'Easy' | 'Medium' | 'Hard';
    isCompleted: boolean;
}
import { Recommendation } from '../types';

const N8N_GOAL_WEBHOOK_URL = 'https://shreyopb.app.n8n.cloud/webhook/cb52693f-9da6-4d2c-99e4-8549f15bac40/';

// This function now fetches goals from the n8n workflow instead of Gemini
export const fetchHealthGoalsFromN8n = async (userId: string): Promise<Omit<Recommendation, 'id' | 'userId' | 'isCompleted'>[]> => {
    try {
        const response = await fetch(`${N8N_GOAL_WEBHOOK_URL}${userId}`);
        if (!response.ok) {
            throw new Error(`n8n workflow failed with status: ${response.status}`);
        }
        
        const text = await response.text();
        
        // Parse the text response. Assuming format: "Goal Text;Category;Difficulty" on each line.
        const lines = text.trim().split('\n').filter(line => line.length > 0);

        const goals = lines.map(line => {
            const parts = line.split(';');
            if (parts.length !== 3) {
                console.warn(`Skipping malformed goal line: ${line}`);
                return null;
            }
            const [goal, category, difficulty] = parts;

            // Basic validation for category and difficulty
            const validCategories = ['Diet', 'Exercise', 'Mental Health', 'General'];
            const validDifficulties = ['Easy', 'Medium', 'Hard'];

            if (!validCategories.includes(category) || !validDifficulties.includes(difficulty)) {
                console.warn(`Skipping goal with invalid category/difficulty: ${line}`);
                return null;
            }

            return {
                goal: goal.trim(),
                category: category.trim() as Recommendation['category'],
                difficulty: difficulty.trim() as Recommendation['difficulty'],
            };
        }).filter((goal): goal is NonNullable<typeof goal> => goal !== null);

        if (goals.length === 0 && lines.length > 0) {
            throw new Error("Failed to parse any goals from n8n response.");
        }

        return goals;

    } catch (error) {
        console.error("Error fetching or parsing goals from n8n:", error);
        // Return an empty array or a default message on error
        return [];
    }
};
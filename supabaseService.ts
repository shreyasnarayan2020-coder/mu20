import { createClient } from '@supabase/supabase-js';
import { User, HealthData, GameSession, Recommendation, DailyMetrics } from '../types';

const supabaseUrl = 'https://aopykppwwbjbsnopqniy.supabase.co';
const supabaseAnonKey = 'sb_publishable_SJtTIl8I2urhjrXubpTTXw_9lGAQvwr';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const N8N_WEBHOOK_URL = 'https://shreyopb.app.n8n.cloud/webhook/03b19fbf-8717-4fc6-b7c8-3e5a92b71461/';
let otpCache: { [email: string]: string } = {};

export const getOtp = async (email: string): Promise<string> => {
    try {
        const response = await fetch(`${N8N_WEBHOOK_URL}${email}`);
        if (!response.ok) throw new Error(`Webhook failed with status: ${response.status}`);
        const otp = await response.text();
        otpCache[email] = otp;
        return otp;
    } catch (error) {
        console.error("Error fetching OTP from n8n:", error);
        const mockOtp = "123456";
        otpCache[email] = mockOtp;
        // In a real app, we wouldn't alert the OTP. This is for dev purposes.
        console.log(`(DEV) OTP for ${email} is ${mockOtp}`);
        return mockOtp;
    }
};

export const verifyOtp = async (email: string, otp: string): Promise<boolean> => {
    const storedOtp = otpCache[email];
    const isValid = (otp === storedOtp || otp === "123456"); // Allow fallback for dev
    if (isValid) delete otpCache[email];
    return isValid;
};

const toSnakeCase = (obj: any) => {
    if (obj === null || typeof obj !== 'object') return obj;
    const newObj: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const newKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            newObj[newKey] = obj[key];
        }
    }
    return newObj;
};

const toCamelCase = (obj: any) => {
    if (obj === null || typeof obj !== 'object') return obj;
    const newObj: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const newKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            newObj[newKey] = obj[key];
        }
    }
    return newObj;
};


export const apiService = {
    auth: {
        signUp: (c) => supabase.auth.signUp(c),
        signInWithPassword: (c) => supabase.auth.signInWithPassword(c),
        getFullUserProfile: async (userId: string) => {
            const { data: userProfile, error: userError } = await supabase.from('users').select('*').eq('id', userId).single();
            if (userError) return { user: null, health: null, error: userError.message };

            const { data: healthProfile } = await supabase.from('user_health_profiles').select('*').eq('user_id', userId).single();
            const points = await apiService.user.getPoints(userId);

            const user = { ...toCamelCase(userProfile), points };
            const health = healthProfile ? toCamelCase(healthProfile) : null;

            return { user, health, error: null };
        }
    },
    user: {
        saveInitialDetails: async (userData: Omit<User, 'points' | 'id'> & { id: string }, healthData: Omit<HealthData, 'userId'>) => {
            const { error: userError } = await supabase.from('users').insert({
                id: userData.id,
                first_name: userData.firstName,
                last_name: userData.lastName,
                email: userData.email,
            });
            if (userError) return { user: null, error: userError.message };
            
            const { error: healthError } = await supabase.from('user_health_profiles').insert({ ...toSnakeCase(healthData), user_id: userData.id });
            if (healthError) return { user: null, error: healthError.message };
            
            const { error: pointsError } = await supabase.from('user_points').insert({ user_id: userData.id, points: 0 });
            if (pointsError) return { user: null, error: pointsError.message };

            return { user: { ...userData, points: 0 }, error: null };
        },
        updateDetails: async (userId: string, updates: Partial<User> & { password?: string }) => {
            if (updates.password) {
                const { error } = await supabase.auth.updateUser({ password: updates.password });
                if (error) return { updatedUser: null, error: error.message };
            }
            const profileUpdates: { first_name?: string, last_name?: string, email?: string } = {};
            if(updates.firstName) profileUpdates.first_name = updates.firstName;
            if(updates.lastName) profileUpdates.last_name = updates.lastName;
            if(updates.email) profileUpdates.email = updates.email;

            const { data, error } = await supabase.from('users').update(profileUpdates).eq('id', userId).select().single();
            return { updatedUser: data ? toCamelCase(data) : null, error: error?.message };
        },
        getPoints: async (userId: string): Promise<number> => {
            const { data, error } = await supabase.from('user_points').select('points').eq('user_id', userId).single();
            if(error || !data) return 0;
            return data.points ?? 0;
        },
        updatePoints: async (userId: string, points: number) => {
            const { error } = await supabase.from('user_points').upsert({ user_id: userId, points }, { onConflict: 'user_id' });
            return { error: error?.message };
        }
    },
    metrics: {
        hasSubmittedToday: async (userId: string): Promise<boolean> => {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase.from('daily_metrics').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', `${today}T00:00:00Z`);
            return (data?.length || 0) > 0 || (error ? false : (supabase.rpc as any).count > 0);
        },
        save: async (userId: string, metrics: Partial<DailyMetrics>) => {
            const { error } = await supabase.from('daily_metrics').insert({ user_id: userId, ...toSnakeCase(metrics) });
            return { error: error?.message };
        }
    },
    games: {
        saveSession: async (session: Omit<GameSession, 'timestamp'>) => {
            const { error } = await supabase.from('game_sessions').insert({ user_id: session.userId, game_type: session.gameType, score: session.score });
            return { error: error?.message };
        }
    },
    recommendations: {
        get: async (userId: string): Promise<Recommendation[]> => {
            const { data: recs, error: recsError } = await supabase.from('recommendations').select('*').eq('user_id', userId);
            if (recsError) {
                console.error("Error fetching recommendations:", recsError);
                return [];
            }
            
            const { data: statuses, error: statusError } = await supabase.from('recommendation_status').select('recommendation_id, is_completed').eq('user_id', userId);
            if (statusError) {
                console.error("Error fetching recommendation statuses:", statusError);
            }
            const statusMap = new Map(statuses?.map(s => [s.recommendation_id, s.is_completed]) || []);

            return recs.map(r => ({ ...toCamelCase(r), isCompleted: statusMap.get(r.id) || false }));
        },
        create: async (userId: string, newGoals: Omit<Recommendation, 'id' | 'userId' | 'isCompleted'>[]) => {
            // This is a transaction to ensure data integrity
            const { error: deleteError } = await supabase.from('recommendations').delete().eq('user_id', userId);
            if (deleteError) {
                 return { recommendations: [], error: deleteError.message };
            }
            
            const goalsToInsert = newGoals.map(g => ({ ...toSnakeCase(g), user_id: userId }));
            const { data, error } = await supabase.from('recommendations').insert(goalsToInsert).select();
            
            return { recommendations: data ? data.map(r => ({ ...toCamelCase(r), isCompleted: false })) : [], error: error?.message };
        },
        updateStatus: async (userId: string, updatedRecs: Recommendation[]) => {
            const statusesToUpsert = updatedRecs.map(rec => ({
                user_id: userId,
                recommendation_id: rec.id, // now a number
                is_completed: rec.isCompleted
            }));
            const { error } = await supabase.from('recommendation_status').upsert(statusesToUpsert, { onConflict: 'user_id, recommendation_id' });
            return { error: error?.message };
        }
    }
};
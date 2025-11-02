import React, { useState, FormEvent } from 'react';
import { useAuth } from '../App';
import { HealthData, User } from '../types';
import { HeartIcon } from './icons';
import { apiService, getOtp, verifyOtp, supabase } from '../services/supabaseService';

type AuthView = 'login' | 'otp' | 'signup' | 'healthDetails';

const initialHealthDetailsState = {
    firstName: '',
    lastName: '',
    age: '',
    height: '',
    weight: '',
    gender: 'Male',
    fitnessLevel: 'Beginner',
    existingConditions: '',
    allergies: '',
    medications: '',
    preferredLanguage: 'English'
};


const AuthPage: React.FC = () => {
    const [view, setView] = useState<AuthView>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [newUser, setNewUser] = useState<Partial<User>>({});
    
    const [healthDetails, setHealthDetails] = useState(initialHealthDetailsState);
    
    const auth = useAuth();

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        const { data, error } = await apiService.auth.signInWithPassword({ email, password });

        if (error || !data.user) {
            setError(error?.message || 'Invalid credentials.');
            setLoading(false);
            return;
        }

        try {
            await getOtp(email);
            setMessage('OTP sent to your email!');
            setView('otp');
        } catch (otpError: any) {
            setError(otpError.message || 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpVerification = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        const isValid = await verifyOtp(email, otp);
        if (!isValid) {
            setError('Invalid OTP.');
            await supabase.auth.signOut();
            setLoading(false);
            return;
        }
        
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
             setError('Session expired. Please log in again.');
             setView('login');
             setLoading(false);
             return;
        }

        const { user: fullUser, health, error: profileError } = await apiService.auth.getFullUserProfile(sessionData.session.user.id);

        if (fullUser && !profileError) {
            auth.login(fullUser, health);
        } else {
            setError(profileError || "Could not retrieve user profile.");
            await supabase.auth.signOut();
        }
        setLoading(false);
    };

    const handleSignUp = async (e: FormEvent) => {
        e.preventDefault();
        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        setError('');
        
        const { data, error } = await apiService.auth.signUp({ email, password });
        if (error || !data.user) {
            setError(error?.message || 'Could not sign up user.');
            setLoading(false);
            return;
        }

        setNewUser({ id: data.user.id, email: data.user.email });
        setView('healthDetails');
        setLoading(false);
    };

    const handleHealthDetailsSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        // Conversion to number happens here, ONLY on submit
        const finalHealthData = {
            age: Number(healthDetails.age) || 0,
            height: Number(healthDetails.height) || 0,
            weight: Number(healthDetails.weight) || 0,
            gender: healthDetails.gender as any,
            fitnessLevel: healthDetails.fitnessLevel as any,
            existingConditions: healthDetails.existingConditions || '',
            allergies: healthDetails.allergies || '',
            medications: healthDetails.medications || '',
            preferredLanguage: healthDetails.preferredLanguage || 'English',
        };

        if (!newUser.id || !newUser.email) {
            setError("Session error. Please start over.");
            setLoading(false);
            setView('signup');
            return;
        }

        const userToSave = {
          id: newUser.id,
          email: newUser.email,
          firstName: healthDetails.firstName,
          lastName: healthDetails.lastName
        };

        const { user, error } = await apiService.user.saveInitialDetails(userToSave, finalHealthData);
        
        if (error || !user) {
            setError(error || "Could not save health details.");
            setLoading(false);
            return;
        }

        auth.login(user, finalHealthData as HealthData);
        setLoading(false);
    };

    const renderInput = (id: string, label: string, type: string, value: any, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, required = true) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
            <input id={id} name={id} type={type} required={required} value={value || ''} onChange={onChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
        </div>
    );
     const renderTextarea = (id: string, label: string, value: any, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
            <textarea id={id} name={id} value={value || ''} onChange={onChange} rows={2} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
        </div>
    );
    const renderSelect = (id: string, label: string, value: any, options: string[], onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
            <select id={id} name={id} value={value || ''} onChange={onChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );

    const AuthWrapper: React.FC<{title: string; children: React.ReactNode; footer: React.ReactNode}> = ({title, children, footer}) => (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <div className="mx-auto h-12 w-auto text-primary flex justify-center">
                        <HeartIcon className="h-12 w-12" />
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">{title}</h2>
                </div>
                {children}
                 <div className="text-center text-sm">
                    {footer}
                 </div>
            </div>
        </div>
    );

    if (view === 'login') {
        return (
            <AuthWrapper title="Sign in to your account" footer={
                <p>Not a member?{' '}
                    <button onClick={() => setView('signup')} className="font-medium text-primary hover:text-primary/80">
                        Sign up now
                    </button>
                </p>
            }>
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="rounded-md shadow-sm -space-y-px flex flex-col gap-4">
                        {renderInput('email', 'Email address', 'email', email, (e) => setEmail(e.target.value))}
                        {renderInput('password', 'Password', 'password', password, (e) => setPassword(e.target.value))}
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    {message && <p className="text-green-500 text-sm">{message}</p>}
                    <div>
                        <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-opacity-50">
                            {loading ? 'Signing In...' : 'Get OTP'}
                        </button>
                    </div>
                </form>
            </AuthWrapper>
        );
    }
    
    if (view === 'otp') {
        return (
             <AuthWrapper title="Enter Verification Code" footer={
                <button onClick={() => setView('login')} className="font-medium text-primary hover:text-primary/80">
                    Back to login
                </button>
             }>
                <form className="mt-8 space-y-6" onSubmit={handleOtpVerification}>
                    <p className="text-center text-gray-600">An OTP has been sent to {email}.</p>
                    <div className="rounded-md shadow-sm">
                        {renderInput('otp', 'OTP', 'text', otp, (e) => setOtp(e.target.value))}
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div>
                        <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-opacity-50">
                           {loading ? 'Verifying...' : 'Verify & Login'}
                        </button>
                    </div>
                </form>
            </AuthWrapper>
        );
    }
    
    if (view === 'signup') {
        return (
             <AuthWrapper title="Create a new account" footer={
                 <p>Already have an account?{' '}
                    <button onClick={() => setView('login')} className="font-medium text-primary hover:text-primary/80">
                        Sign In
                    </button>
                 </p>
             }>
                <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
                    <div className="rounded-md shadow-sm flex flex-col gap-4">
                       {renderInput('email', 'Email address', 'email', email, (e) => setEmail(e.target.value))}
                       {renderInput('password', 'Password', 'password', password, (e) => setPassword(e.target.value))}
                       {renderInput('confirm-password', 'Confirm Password', 'password', confirmPassword, (e) => setConfirmPassword(e.target.value))}
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div>
                        <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-opacity-50">
                           {loading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                    </div>
                </form>
            </AuthWrapper>
        );
    }
    
    if (view === 'healthDetails') {
        const handleHealthInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            // All inputs are stored as strings to prevent typing issues
            setHealthDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
        };
        return (
             <AuthWrapper title="Tell us about yourself" footer={<p>This helps us personalize your experience.</p>}>
                <form className="mt-8 space-y-4" onSubmit={handleHealthDetailsSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {renderInput('firstName', 'First Name', 'text', healthDetails.firstName, handleHealthInputChange)}
                         {renderInput('lastName', 'Last Name', 'text', healthDetails.lastName, handleHealthInputChange)}
                         {renderInput('age', 'Age', 'number', healthDetails.age, handleHealthInputChange)}
                         {renderInput('height', 'Height (cm)', 'number', healthDetails.height, handleHealthInputChange)}
                         {renderInput('weight', 'Weight (kg)', 'number', healthDetails.weight, handleHealthInputChange)}
                         {renderSelect('gender', 'Gender', healthDetails.gender, ['Male', 'Female', 'Other'], handleHealthInputChange)}
                         {renderSelect('fitnessLevel', 'Fitness Level', healthDetails.fitnessLevel, ['Beginner', 'Intermediate', 'Advanced'], handleHealthInputChange)}
                    </div>
                     {renderTextarea('existingConditions', 'Existing Conditions (e.g., Diabetes, Asthma)', healthDetails.existingConditions, handleHealthInputChange)}
                     {renderTextarea('allergies', 'Allergies (e.g., Peanuts, Pollen)', healthDetails.allergies, handleHealthInputChange)}
                     {renderTextarea('medications', 'Current Medications', healthDetails.medications, handleHealthInputChange)}
                     {renderInput('preferredLanguage', 'Preferred Language', 'text', healthDetails.preferredLanguage, handleHealthInputChange)}

                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <div>
                        <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-opacity-50 mt-4">
                            {loading ? 'Saving...' : 'Complete Profile'}
                        </button>
                    </div>
                </form>
            </AuthWrapper>
        );
    }

    return null;
};

export default AuthPage;
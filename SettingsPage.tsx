import React, { useState, FormEvent } from 'react';
import { useAuth } from '../App';
import { apiService } from '../services/supabaseService';

const SettingsPage: React.FC = () => {
    const { user, updateUser, logout } = useAuth();
    const [firstName, setFirstName] = useState(user?.firstName || '');
    const [lastName, setLastName] = useState(user?.lastName || '');
    const [email, setEmail] = useState(user?.email || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSaveChanges = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password && password.length < 8) {
            setError('New password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }
        
        setLoading(true);
        const { updatedUser, error } = await apiService.user.updateDetails(user!.id, {
            firstName,
            lastName,
            email,
            password: password || undefined,
        });

        if (error || !updatedUser) {
            setError(error || 'Failed to update settings.');
        } else {
            updateUser(updatedUser);
            setMessage('Your changes have been saved successfully!');
            setPassword('');
            setConfirmPassword('');
        }
        setLoading(false);
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="mt-2 text-gray-600">Update your personal information and password.</p>
            
            <form onSubmit={handleSaveChanges} className="mt-8 bg-white p-8 rounded-lg shadow-md space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
                        <input type="text" id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
                    </div>
                     <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
                        <input type="text" id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
                    </div>
                </div>
                 <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
                </div>
                 <hr/>
                 <h2 className="text-lg font-semibold text-gray-800">Change Password</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="new-password"className="block text-sm font-medium text-gray-700">New Password</label>
                        <input type="password" id="new-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" placeholder="Leave blank to keep current password"/>
                    </div>
                     <div>
                        <label htmlFor="confirm-password"className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                        <input type="password" id="confirm-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"/>
                    </div>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {message && <p className="text-sm text-green-600">{message}</p>}
                <div className="flex justify-end">
                    <button type="submit" disabled={loading} className="py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-opacity-50">
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
             <div className="mt-8 bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold text-red-600">Sign Out</h2>
                <p className="mt-2 text-gray-600">This will sign you out of your account on this device.</p>
                <div className="flex justify-end mt-4">
                     <button onClick={() => { logout(); }} className="py-2 px-4 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
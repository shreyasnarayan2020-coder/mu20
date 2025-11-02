
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { SettingsIcon, DiagnosisIcon, ProgressIcon, SignOutIcon } from './icons';

interface NavButtonProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, title, description, onClick }) => (
    <button
        onClick={onClick}
        className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow text-left w-full flex items-start space-x-4 border border-gray-200 hover:border-primary"
    >
        <div className="text-primary bg-light-blue p-3 rounded-full">
            {icon}
        </div>
        <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-gray-600 mt-1">{description}</p>
        </div>
    </button>
);


const HomePage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.firstName}!</h1>
            <p className="mt-2 text-gray-600">Here's your personal health dashboard. What would you like to do today?</p>
        
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <NavButton 
                    icon={<DiagnosisIcon className="w-6 h-6"/>}
                    title="Diagnosis"
                    description="Engage in activities and track your daily health metrics."
                    onClick={() => navigate('/diagnosis')}
                />
                 <NavButton 
                    icon={<ProgressIcon className="w-6 h-6"/>}
                    title="Progress"
                    description="View and manage your AI-generated health goals."
                    onClick={() => navigate('/progress')}
                />
                 <NavButton 
                    icon={<SettingsIcon className="w-6 h-6"/>}
                    title="Settings"
                    description="Manage your account details and preferences."
                    onClick={() => navigate('/settings')}
                />
                  <NavButton 
                    icon={<SignOutIcon className="w-6 h-6"/>}
                    title="Sign Out"
                    description="End your session and sign out from the application."
                    onClick={() => {
                        // This would be in the header, but for demo purposes, it's also a big button.
                        // Ideally, we'd call auth.logout() here.
                        // Since logout is in Header, this can be a placeholder or removed.
                        navigate('/'); // Navigate to login page
                    }}
                />
            </div>
        </div>
    );
};

export default HomePage;

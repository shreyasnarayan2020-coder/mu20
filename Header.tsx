
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { HeartIcon, StarIcon, SignOutIcon } from './icons';

export const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = () => {
        logout();
        navigate('/');
    };

    return (
        <header className="bg-white shadow-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <Link to="/home" className="flex items-center space-x-2 text-primary">
                        <HeartIcon className="h-8 w-8" />
                        <span className="font-bold text-xl text-slate-800">Health Monitor</span>
                    </Link>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 bg-yellow-100 text-yellow-800 font-semibold px-3 py-1.5 rounded-full">
                            <StarIcon className="w-5 h-5" />
                            <span>{user?.points ?? 0} Points</span>
                        </div>
                        <button 
                            onClick={handleSignOut}
                            className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            <SignOutIcon className="w-5 h-5"/>
                            <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

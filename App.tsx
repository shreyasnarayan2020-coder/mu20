import React, { useState, createContext, useContext, useMemo, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { User, HealthData } from './types';
import AuthPage from './components/AuthPage';
import HomePage from './components/HomePage';
import SettingsPage from './components/SettingsPage';
import DiagnosisPage from './components/DiagnosisPage';
import ProgressPage from './components/ProgressPage';
import { Header } from './components/Header';
import { supabase, apiService } from './services/supabaseService';

// Authentication Context
interface AuthContextType {
  user: User | null;
  healthData: HealthData | null;
  login: (user: User, healthData: HealthData | null) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  updateHealthData: (data: HealthData) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export const useAuth = () => useContext(AuthContext);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { user: fullUser, health, error } = await apiService.auth.getFullUserProfile(session.user.id);
        if (fullUser && !error) {
          login(fullUser, health);
        }
      }
      setLoading(false);
    };

    checkSession();
  }, []);


  const login = (userData: User, userHealthData: HealthData | null) => {
    setUser(userData);
    if (userHealthData) {
      setHealthData(userHealthData);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setHealthData(null);
  };
  
  const updateUser = (updatedData: Partial<User>) => {
    setUser(prev => prev ? {...prev, ...updatedData} : null);
  };
  
  const updateHealthData = (data: HealthData) => {
    setHealthData(data);
  };

  const isAuthenticated = useMemo(() => !!user, [user]);

  const value = useMemo(() => ({
    user,
    healthData,
    login,
    logout,
    updateUser,
    updateHealthData,
    isAuthenticated,
  }), [user, healthData]);

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-xl font-semibold">Loading Application...</div>
          </div>
      );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

const AppContent = () => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated && (location.pathname === '/' || location.pathname === '/signup')) {
            navigate('/home');
        }
    }, [isAuthenticated, location.pathname, navigate]);

    return (
        <div className="bg-background min-h-screen text-slate-800">
            {isAuthenticated && <Header />}
            <main className={isAuthenticated ? "p-4 sm:p-6 lg:p-8" : ""}>
                <Routes>
                    <Route path="/" element={<AuthPage />} />
                    <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                    <Route path="/diagnosis" element={<ProtectedRoute><DiagnosisPage /></ProtectedRoute>} />
                    <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to={isAuthenticated ? "/home" : "/"} />} />
                </Routes>
            </main>
        </div>
    );
}


function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </HashRouter>
  );
}

export default App;

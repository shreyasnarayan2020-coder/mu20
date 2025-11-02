import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { useAuth } from '../App';
import { GamepadIcon, ChartIcon, ChevronLeftIcon } from './icons';
import { apiService } from '../services/supabaseService';
import { DailyMetrics } from '../types';

type DiagnosisView = 'main' | 'engagement' | 'tracking';
type GameView = 'menu' | 'clicker' | 'memory';

// --- Game Components ---

const ClickerGame = ({ onGameEnd }: { onGameEnd: (score: number) => void }) => {
    const [clicks, setClicks] = useState(0);
    const [timeLeft, setTimeLeft] = useState(10);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let timer: number;
        if (isActive && timeLeft > 0) {
            timer = window.setTimeout(() => setTimeLeft(prevTime => prevTime - 1), 1000);
        } else if (isActive && timeLeft === 0) {
            setIsActive(false);
            onGameEnd(clicks);
        }
        return () => window.clearTimeout(timer);
    }, [timeLeft, isActive, clicks, onGameEnd]);

    const startGame = () => {
        setClicks(0);
        setTimeLeft(10);
        setIsActive(true);
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md text-center w-full max-w-md mx-auto">
            <h3 className="text-xl font-bold">Click Frenzy</h3>
            <p className="text-gray-600 mt-2">Click the button as many times as you can in 10 seconds!</p>
            <div className="my-6">
                <p className="text-5xl font-bold text-primary">{isActive ? timeLeft : clicks}</p>
                <p className="text-gray-500">{isActive ? 'Seconds Left' : 'Total Clicks'}</p>
            </div>
            {isActive ? (
                <button 
                    onClick={() => setClicks(c => c + 1)} 
                    className="w-full h-32 text-lg font-semibold rounded-md text-white bg-green-500 hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                    Click Me!
                </button>
            ) : (
                <button onClick={startGame} className="w-full py-3 text-lg font-semibold rounded-md text-white bg-primary hover:bg-primary/90 transition-colors">
                    {timeLeft === 0 ? 'Play Again' : 'Start Game'}
                </button>
            )}
        </div>
    );
};

const EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦'];
const createShuffledGrid = () => [...EMOJIS, ...EMOJIS].sort(() => Math.random() - 0.5);

const MemoryGame = ({ onGameEnd }: { onGameEnd: (score: number) => void }) => {
    const [grid, setGrid] = useState(createShuffledGrid());
    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
    const [tries, setTries] = useState(0);

    const isFlipped = (index: number) => flippedIndices.includes(index);
    const isMatched = (emoji: string) => matchedPairs.includes(emoji);

    useEffect(() => {
        if (flippedIndices.length === 2) {
            const [firstIndex, secondIndex] = flippedIndices;
            setTries(t => t + 1);
            if (grid[firstIndex] === grid[secondIndex]) {
                setMatchedPairs(prev => [...prev, grid[firstIndex]]);
                setFlippedIndices([]);
            } else {
                setTimeout(() => setFlippedIndices([]), 1000);
            }
        }
    }, [flippedIndices, grid]);

    useEffect(() => {
        if (matchedPairs.length === EMOJIS.length) {
            onGameEnd(tries);
        }
    }, [matchedPairs, tries, onGameEnd]);

    const handleCardClick = (index: number) => {
        if (flippedIndices.length < 2 && !isFlipped(index) && !isMatched(grid[index])) {
            setFlippedIndices(prev => [...prev, index]);
        }
    };

    const resetGame = () => {
        setGrid(createShuffledGrid());
        setFlippedIndices([]);
        setMatchedPairs([]);
        setTries(0);
    };

    const isGameOver = matchedPairs.length === EMOJIS.length;

    return (
         <div className="p-6 bg-white rounded-lg shadow-md text-center w-full max-w-2xl mx-auto">
             <h3 className="text-xl font-bold">Memory Match</h3>
             <p className="text-gray-600 mt-2">Find all the matching pairs.</p>
             <div className="my-4 flex justify-around items-center">
                <p><span className="font-bold">{tries}</span> Tries</p>
                <p><span className="font-bold">{matchedPairs.length} / {EMOJIS.length}</span> Pairs Found</p>
             </div>
             <div className="grid grid-cols-6 gap-2 sm:gap-4 my-6">
                {grid.map((emoji, index) => (
                    <div key={index} className="aspect-square" onClick={() => handleCardClick(index)}>
                         <div className={`w-full h-full rounded-md flex items-center justify-center text-2xl sm:text-4xl transition-transform duration-500 cursor-pointer ${isFlipped(index) || isMatched(emoji) ? 'bg-primary text-white [transform:rotateY(180deg)]' : 'bg-gray-300 [transform:rotateY(0deg)]'}`}>
                             {(isFlipped(index) || isMatched(emoji)) && <span>{emoji}</span>}
                         </div>
                    </div>
                ))}
             </div>
             {(isGameOver || tries > 0) && (
                <button onClick={resetGame} className="w-full py-3 text-lg font-semibold rounded-md text-white bg-primary hover:bg-primary/90 transition-colors">
                    {isGameOver ? 'Play Again' : 'Reset Game'}
                </button>
             )}
        </div>
    );
};

// --- Main Diagnosis Page Component ---

const DiagnosisPage: React.FC = () => {
    const [view, setView] = useState<DiagnosisView>('main');
    const [gameView, setGameView] = useState<GameView>('menu');
    const { user, updateUser } = useAuth();
    const [metrics, setMetrics] = useState<{ [key: string]: string }>({});
    const [submittedToday, setSubmittedToday] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const checkSubmissionStatus = useCallback(async () => {
        if (!user) return;
        const status = await apiService.metrics.hasSubmittedToday(user.id);
        setSubmittedToday(status);
    }, [user]);

    useEffect(() => {
        if (view === 'tracking') {
            checkSubmissionStatus();
        }
    }, [view, checkSubmissionStatus]);
    
    const handleGameEnd = async (gameType: 'Clicker' | 'Memory', score: number) => {
        if (!user) return;
        await apiService.games.saveSession({ userId: user.id, gameType, score });
        const newPoints = user.points + 10;
        updateUser({ points: newPoints });
        await apiService.user.updatePoints(user.id, newPoints);
        alert(`Game over! Your score: ${score}. You earned 10 points!`);
    };
    
    const handleMetricsSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setMessage('');

        const metricsToSave: Partial<DailyMetrics> = Object.entries(metrics).reduce((acc, [key, value]) => {
            if (value.trim() !== '') {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                    (acc as any)[key] = numValue;
                }
            }
            return acc;
        }, {});


        const { error } = await apiService.metrics.save(user.id, metricsToSave);
        if (error) {
            setMessage(`Error: ${error}`);
        } else {
            const newPoints = user.points + 25;
            updateUser({ points: newPoints });
            await apiService.user.updatePoints(user.id, newPoints);
            setMessage('Metrics saved successfully! You earned 25 points.');
            setSubmittedToday(true);
        }
        setLoading(false);
    };

    const renderHeader = (title: string, backAction: () => void) => (
         <div className="flex items-center mb-6">
            <button onClick={backAction} className="p-2 rounded-full hover:bg-gray-200 mr-4">
                <ChevronLeftIcon className="w-6 h-6"/>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        </div>
    );

    const renderMetricInput = (id: keyof Omit<DailyMetrics, 'userId' | 'date'>, label: string, unit: string, type = "number") => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label} ({unit})</label>
            <input 
                type={type} 
                id={id} 
                name={id}
                value={metrics[id] || ''} 
                onChange={(e) => setMetrics(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                step="any"
            />
        </div>
    );

    if (view === 'engagement') {
        if (gameView === 'clicker') {
            return <div className="max-w-4xl mx-auto">{renderHeader('Click Frenzy', () => setGameView('menu'))}<ClickerGame onGameEnd={(score) => handleGameEnd('Clicker', score)} /></div>;
        }
        if (gameView === 'memory') {
            return <div className="max-w-4xl mx-auto">{renderHeader('Memory Match', () => setGameView('menu'))}<MemoryGame onGameEnd={(score) => handleGameEnd('Memory', score)} /></div>;
        }
        return (
            <div className="max-w-4xl mx-auto">
                {renderHeader('Engagement', () => setView('main'))}
                 <p className="text-gray-600 mb-8">Play these games to test your cognitive and physical abilities. You get points for each game played!</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button onClick={() => setGameView('clicker')} className="p-8 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow text-center border border-gray-200 hover:border-primary">
                        <h3 className="text-xl font-semibold text-gray-900">Click Frenzy</h3>
                        <p className="mt-1 text-gray-600">Test your speed and reflexes.</p>
                    </button>
                    <button onClick={() => setGameView('memory')} className="p-8 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow text-center border border-gray-200 hover:border-primary">
                        <h3 className="text-xl font-semibold text-gray-900">Memory Match</h3>
                        <p className="mt-1 text-gray-600">Challenge your memory skills.</p>
                    </button>
                 </div>
            </div>
        );
    }
    
    if (view === 'tracking') {
        return (
            <div className="max-w-2xl mx-auto">
                {renderHeader('Your Tracking', () => setView('main'))}
                <div className="bg-white p-8 rounded-lg shadow-md">
                    {submittedToday ? (
                        <div className="text-center">
                            <h2 className="text-xl font-semibold text-green-700">Thanks for submitting today!</h2>
                            <p className="text-gray-600 mt-2">Come back tomorrow to log your new metrics.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleMetricsSubmit} className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900">Log Your Daily Health Records</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               {renderMetricInput('heartRate', 'Heart Rate', 'bpm')}
                               {renderMetricInput('steps', 'Steps', 'count')}
                               {renderMetricInput('sleepHours', 'Sleep', 'hours')}
                               {renderMetricInput('breathingRate', 'Breathing Rate', 'breaths/min')}
                               {renderMetricInput('distanceTravelled', 'Distance Travelled', 'km')}
                               {renderMetricInput('caloriesBurnt', 'Calories Burnt', 'kcal')}
                            </div>
                            {message && <p className={`text-sm text-center ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
                            <div className="flex justify-end">
                                <button type="submit" disabled={loading} className="py-2 px-6 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-opacity-50">
                                    {loading ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    // Default 'main' view
    return (
        <div className="max-w-4xl mx-auto">
             <h1 className="text-3xl font-bold text-gray-900">Diagnosis</h1>
             <p className="mt-2 text-gray-600 mb-8">Choose an activity to proceed.</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <button onClick={() => setView('engagement')} className="p-8 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow text-center border border-gray-200 hover:border-primary">
                    <GamepadIcon className="w-12 h-12 mx-auto text-primary"/>
                    <h3 className="mt-4 text-xl font-semibold text-gray-900">Engagement</h3>
                    <p className="mt-1 text-gray-600">Play games to assess your skills.</p>
                 </button>
                 <button onClick={() => setView('tracking')} className="p-8 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow text-center border border-gray-200 hover:border-primary">
                    <ChartIcon className="w-12 h-12 mx-auto text-primary"/>
                    <h3 className="mt-4 text-xl font-semibold text-gray-900">Your Tracking</h3>
                    <p className="mt-1 text-gray-600">Input your daily health records.</p>
                 </button>
             </div>
        </div>
    );
};

export default DiagnosisPage;
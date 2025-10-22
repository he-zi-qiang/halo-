// App.js

import React, { useState, useEffect, useRef, createContext, useContext, useCallback, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Search, Plus, Music, User, LogOut, Home, List, Loader2, UploadCloud, X, MessageCircle, ChevronLeft, FileText, Edit, MoreHorizontal } from 'lucide-react';

import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useInView } from 'react-intersection-observer';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = { ...options.headers };
        if (token) { headers['Authorization'] = `Bearer ${token}`; }
        if (!(options.body instanceof FormData)) { headers['Content-Type'] = 'application/json'; }
        try {
            const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
            if (response.status === 204 || (response.status === 200 && response.headers.get('content-length') === '0')) {
                return;
            }
            const data = await response.json();
            if (!response.ok) { throw new Error(data.error || 'API 请求失败'); }
            return data;
        } catch (error) {
            console.error(`API 错误于 ${endpoint}:`, error);
            throw error;
        }
    },
    get(endpoint, options) { return this.request(endpoint, { ...options, method: 'GET' }); },
    post(endpoint, body, options) { return this.request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }); },
    put(endpoint, body, options) { return this.request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }); },
    postForm(endpoint, formData, options) { return this.request(endpoint, { ...options, method: 'POST', body: formData }); },
    delete(endpoint, options) { return this.request(endpoint, { ...options, method: 'DELETE' }); }
};

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

const CursorContext = createContext();

const CursorProvider = ({ children }) => {
    const [cursorVariant, setCursorVariant] = useState('default');
    const value = { cursorVariant, setCursorVariant };
    return <CursorContext.Provider value={value}>{children}</CursorContext.Provider>;
};

const useCustomCursor = () => useContext(CursorContext);

const AppContext = createContext();

const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [currentSong, setCurrentSong] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playlists, setPlaylists] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewState, setViewState] = useState({ view: 'home' });
    const [playlistModal, setPlaylistModal] = useState({ isOpen: false, songToAdd: null });
    const audioRef = useRef(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);

    const getFrequencyData = useCallback(() => {
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
        if (analyserRef.current && dataArrayRef.current) {
            analyserRef.current.getByteFrequencyData(dataArrayRef.current);
            return dataArrayRef.current;
        }
        return null;
    }, []);
    
    useEffect(() => {
        if (audioRef.current && !audioContextRef.current) {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaElementSource(audioRef.current);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
            
            audioContextRef.current = audioCtx;
            analyserRef.current = analyser;
            dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        }
    }, []);
    
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (currentSong && audio.src !== `${API_URL}${currentSong.audioUrl}`) {
            audio.src = `${API_URL}${currentSong.audioUrl}`;
            audio.load();
        }
        
        if (isPlaying && currentSong) {
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
            audio.play().catch(e => {
                if (e.name !== 'AbortError') {
                    console.error("Audio playback failed:", e);
                }
            });
        } else {
            audio.pause();
        }
    }, [isPlaying, currentSong]);


    const setCurrentView = (view, params = {}) => setViewState({ view, ...params });
    const triggerDataRefresh = () => setPlaylists(p => [...p]);
    const openPlaylistModal = (song) => setPlaylistModal({ isOpen: true, songToAdd: song });
    const closePlaylistModal = () => setPlaylistModal({ isOpen: false, songToAdd: null });
    const updateUser = (newUserData) => {
        const updatedUser = { ...user, ...newUserData };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };
    const login = async (credentials, isLoginMode) => {
        const endpoint = isLoginMode ? '/api/users/login' : '/api/users/register';
        const { token, user: userData } = await api.post(endpoint, credentials);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setCurrentView('home');
    };
    
    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null); setPlaylists([]); setCurrentView('login');
    }, []);

    const fetchUserPlaylists = useCallback(async () => {
        if (!localStorage.getItem('token')) return;
        try { const userPlaylists = await api.get('/api/playlists'); setPlaylists(userPlaylists || []); } catch (error) { console.error("获取歌单失败:", error); }
    }, []);

    useEffect(() => {
        if (user) { fetchUserPlaylists(); }
    }, [user, fetchUserPlaylists]);
    
    useEffect(() => {
        const autoLogin = async () => {
            const token = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');
            if (token && savedUser) {
                try { 
                    await api.get('/api/users/profile'); 
                    setUser(JSON.parse(savedUser)); 
                } catch (error) { 
                    console.error("会话已过期，正在登出。", error); 
                    logout(); 
                }
            }
            setIsLoading(false);
        };
        autoLogin();
    }, [logout]);


    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-900"><Loader2 className="animate-spin text-purple-500" size={48} /></div>;
    }
    return (
        <AppContext.Provider value={{
            user, login, logout, updateUser,
            currentSong, setCurrentSong, isPlaying, setIsPlaying,
            playlists, fetchUserPlaylists,
            viewState, setCurrentView,
            triggerDataRefresh,
            openPlaylistModal, closePlaylistModal, playlistModal,
            audioRef,
            audioContextRef,
            getFrequencyData,
            searchTerm, setSearchTerm, debouncedSearchTerm
        }}>
            <CursorProvider>
                <audio ref={audioRef} onEnded={() => setIsPlaying(false)} crossOrigin="anonymous" />
                {children}
            </CursorProvider>
        </AppContext.Provider>
    );
};

const useApp = () => useContext(AppContext);

const CustomCursor = () => {
    const { cursorVariant } = useCustomCursor();
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const mouseMove = e => setMousePosition({ x: e.clientX, y: e.clientY });
        window.addEventListener("mousemove", mouseMove);
        return () => window.removeEventListener("mousemove", mouseMove);
    }, []);

    const variants = {
        default: {
            x: mousePosition.x - 8, y: mousePosition.y - 8, height: 16, width: 16,
            backgroundColor: "rgba(168, 85, 247, 0.5)", mixBlendMode: 'difference'
        },
        hover: {
            x: mousePosition.x - 24, y: mousePosition.y - 24, height: 48, width: 48,
            backgroundColor: "rgba(255, 255, 255, 0.2)", mixBlendMode: 'normal'
        },
        play: {
            x: mousePosition.x - 32, y: mousePosition.y - 32, height: 64, width: 64,
            backgroundColor: "rgba(255, 255, 255, 0.3)",
        }
    };

    return (
        <motion.div
            className="fixed top-0 left-0 rounded-full pointer-events-none z-[9999]"
            variants={variants}
            animate={cursorVariant}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
            {cursorVariant === 'play' && <Play size={32} className="text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" fill="currentColor"/>}
        </motion.div>
    );
};


const LoginForm = () => {
    const { login } = useApp();
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null); setIsLoading(true);
        try {
            const credentials = isLoginMode ? { email, password } : { username, email, password };
            await login(credentials, isLoginMode);
        } catch (err) {
            setError(err.message || '操作失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
    };
    const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
            <motion.div
                className="bg-white/10 backdrop-blur-lg p-8 rounded-lg shadow-2xl w-96 text-white"
                variants={containerVariants} initial="hidden" animate="visible"
            >
                <motion.h2 variants={itemVariants} className="text-2xl font-bold mb-6 text-center">
                    {isLoginMode ? '登录 EchoVerse' : '注册 EchoVerse'}
                </motion.h2>
                <motion.form onSubmit={handleSubmit}>
                    {!isLoginMode && (
                        <motion.input variants={itemVariants} type="text" placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3 mb-4 border border-white/20 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                    )}
                    <motion.input variants={itemVariants} type="email" placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-4 border border-white/20 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                    <motion.input variants={itemVariants} type="password" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mb-4 border border-white/20 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                    {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
                    <motion.button variants={itemVariants} type="submit" disabled={isLoading} className="w-full bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 transition duration-200 flex items-center justify-center disabled:bg-purple-400">
                        {isLoading && <Loader2 className="animate-spin mr-2" size={20} />}
                        {isLoginMode ? '登录' : '注册'}
                    </motion.button>
                </motion.form>
                <motion.p variants={itemVariants} className="mt-4 text-center text-gray-300">
                    {isLoginMode ? '还没有账号？' : '已有账号？'}
                    <button onClick={() => { setIsLoginMode(!isLoginMode); setError(null); }} className="text-purple-400 hover:underline ml-1">
                        {isLoginMode ? '立即注册' : '立即登录'}
                    </button>
                </motion.p>
            </motion.div>
        </div>
    );
};

const Sidebar = () => {
    const { user, logout, viewState, setCurrentView, searchTerm, setSearchTerm, playlists } = useApp();
    const { setCursorVariant } = useCustomCursor();

    const NavButton = ({ onClick, viewName, children, condition = true }) => {
        if (!condition) return null;
        const isActive = viewState.view === viewName;
        return (
            <motion.button
                onClick={onClick}
                className={`flex items-center w-full space-x-3 px-4 py-3 rounded-md transition-colors text-sm font-medium ${isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                onMouseEnter={() => setCursorVariant('hover')}
                onMouseLeave={() => setCursorVariant('default')}
                whileTap={{ scale: 0.98 }}
            >
                {children}
            </motion.button>
        );
    };

    return (
        <aside className="w-72 bg-black h-full flex flex-col border-r border-white/10 shrink-0 hidden md:flex">
            {/* Logo */}
            <div
                className="px-6 py-6 cursor-pointer"
                onClick={() => setCurrentView('home')}
                onMouseEnter={() => setCursorVariant('hover')}
                onMouseLeave={() => setCursorVariant('default')}
            >
                <div className="flex items-center space-x-2">
                    <Music className="text-purple-400" size={28} />
                    <span className="text-2xl font-bold">EchoVerse</span>
                </div>
            </div>

            {/* Main Navigation */}
            <nav className="px-3 space-y-1">
                <NavButton onClick={() => setCurrentView('home')} viewName='home'>
                    <Home size={22} /><span>Home</span>
                </NavButton>
                <NavButton onClick={() => setCurrentView('creator')} viewName='creator' condition={!!user}>
                    <UploadCloud size={22} /><span>Creator Center</span>
                </NavButton>
            </nav>

            {/* Search */}
            <div className="px-6 py-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search songs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-white/10 bg-white/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm text-white placeholder:text-gray-500"
                        onMouseEnter={() => setCursorVariant('hover')}
                        onMouseLeave={() => setCursorVariant('default')}
                    />
                </div>
            </div>

            {/* Your Library Section */}
            {user && (
                <div className="flex-1 flex flex-col min-h-0 px-3">
                    <div className="flex items-center justify-between px-3 py-2 mb-2">
                        <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Your Library</h3>
                        <motion.button
                            onClick={() => setCurrentView('playlists')}
                            className="text-gray-400 hover:text-white p-1 rounded"
                            onMouseEnter={() => setCursorVariant('hover')}
                            onMouseLeave={() => setCursorVariant('default')}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Plus size={18} />
                        </motion.button>
                    </div>

                    {/* Playlists List */}
                    <div className="flex-1 overflow-y-auto space-y-1">
                        {playlists && playlists.length > 0 ? (
                            playlists.map(playlist => (
                                <motion.div
                                    key={playlist.id}
                                    className={`px-3 py-2 rounded-md cursor-pointer transition-colors ${
                                        viewState.view === 'playlistDetail' && viewState.playlistId === playlist.id
                                            ? 'bg-white/10 text-white'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                                    onClick={() => setCurrentView('playlistDetail', { playlistId: playlist.id })}
                                    onMouseEnter={() => setCursorVariant('hover')}
                                    onMouseLeave={() => setCursorVariant('default')}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded flex items-center justify-center shrink-0">
                                            <List size={18} className="text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{playlist.name}</p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {playlist._count?.songs || 0} songs
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 px-3 py-2">No playlists yet</p>
                        )}
                    </div>
                </div>
            )}

            {/* Bottom Section - Logout */}
            <div className="px-3 py-4 border-t border-white/10">
                {user ? (
                    <NavButton onClick={logout} viewName='logout'>
                        <LogOut size={22} />
                        <span>Logout</span>
                    </NavButton>
                ) : (
                    <NavButton onClick={() => setCurrentView('login')} viewName='login'>
                        <User size={22} />
                        <span>Sign In</span>
                    </NavButton>
                )}
            </div>
        </aside>
    );
};

// Top navigation bar (without player controls)
const Header = () => {
    const { user, viewState, setCurrentView } = useApp();
    const { setCursorVariant } = useCustomCursor();

    return (
        <header className="h-16 flex items-center justify-between px-6 bg-black/30 backdrop-blur-lg border-b border-white/10 z-30">
            <div className="flex items-center space-x-4">
                <h2 className="text-xl font-bold">
                    {viewState.view === 'home' && 'Home'}
                    {viewState.view === 'playlists' && 'My Playlists'}
                    {viewState.view === 'playlistDetail' && 'Playlist'}
                    {viewState.view === 'creator' && 'Creator Center'}
                    {viewState.view === 'profile' && 'Profile'}
                </h2>
            </div>

            <div className="flex items-center space-x-3">
                {user ? (
                    <motion.button
                        onClick={() => setCurrentView('profile')}
                        className={`p-1.5 rounded-full transition-colors ${viewState.view === 'profile' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                        onMouseEnter={() => setCursorVariant('hover')} onMouseLeave={() => setCursorVariant('default')} whileTap={{ scale: 0.95 }}
                    >
                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                    </motion.button>
                ) : (
                    <motion.button onClick={() => setCurrentView('login')} className="bg-white text-black px-4 py-2 rounded-full hover:bg-gray-200 text-sm font-semibold" onMouseEnter={() => setCursorVariant('hover')} onMouseLeave={() => setCursorVariant('default')} whileTap={{ scale: 0.95 }}>
                        Sign In
                    </motion.button>
                )}
            </div>
        </header>
    );
};

// Bottom player bar (Spotify-style)
const BottomPlayer = () => {
    const { currentSong, isPlaying, setIsPlaying, audioRef, audioContextRef, setCurrentView } = useApp();
    const { setCursorVariant } = useCustomCursor();
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(0.7);
    const progressRef = useRef(null);

    useEffect(() => {
        const audio = audioRef.current;
        const handleTimeUpdate = () => { if (audio) setCurrentTime(audio.currentTime); };
        if (audio) {
            audio.addEventListener('timeupdate', handleTimeUpdate);
            return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
        }
    }, [audioRef]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume;
    }, [volume, audioRef]);

    const togglePlay = () => {
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
        if (currentSong) setIsPlaying(!isPlaying);
    };

    const handleProgressClick = (e) => {
        if (audioRef.current && currentSong?.duration) {
            const rect = progressRef.current.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = percent * currentSong.duration;
        }
    };

    const handleSongInfoClick = () => {
        if(currentSong) {
            setCurrentView('songDetail', { songId: currentSong.id });
        }
    };

    const progress = currentSong?.duration ? (currentTime / currentSong.duration) * 100 : 0;
    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const buttonStyles = "text-gray-300 hover:text-white transition-colors disabled:opacity-40 disabled:hover:text-gray-300";

    return (
        <footer className="h-20 md:h-24 bg-black border-t border-white/10 px-2 md:px-4 flex items-center justify-between z-50">
            {/* Left: Song Info */}
            <div className="flex items-center space-x-2 md:space-x-3 w-1/4 min-w-[120px] md:min-w-[180px]">
                {currentSong ? (
                    <>
                        <img
                            src={`${API_URL}${currentSong.coverUrl}`}
                            alt={currentSong.title}
                            className="w-10 h-10 md:w-14 md:h-14 rounded cursor-pointer"
                            onClick={handleSongInfoClick}
                            onMouseEnter={() => setCursorVariant('hover')}
                            onMouseLeave={() => setCursorVariant('default')}
                        />
                        <div className="flex-1 min-w-0 hidden sm:block">
                            <p className="font-semibold text-xs md:text-sm text-white truncate cursor-pointer hover:underline"
                               onClick={handleSongInfoClick}
                               onMouseEnter={() => setCursorVariant('hover')}
                               onMouseLeave={() => setCursorVariant('default')}
                            >
                                {currentSong.title}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{currentSong.artist}</p>
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-gray-500">No song playing</p>
                )}
            </div>

            {/* Center: Player Controls */}
            <div className="flex flex-col items-center justify-center w-1/2 md:w-2/5 max-w-2xl">
                <div className="flex items-center space-x-2 md:space-x-4 mb-1 md:mb-2">
                    <motion.button whileTap={{ scale: 0.9 }} className={buttonStyles} disabled={!currentSong} onMouseEnter={() => setCursorVariant('hover')} onMouseLeave={() => setCursorVariant('default')}>
                        <SkipBack size={20} />
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={togglePlay}
                        className="bg-white text-black p-2 rounded-full hover:scale-105 disabled:opacity-50 transition-all"
                        disabled={!currentSong}
                        onMouseEnter={() => setCursorVariant('hover')}
                        onMouseLeave={() => setCursorVariant('default')}
                    >
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5"/>}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.9 }} className={buttonStyles} disabled={!currentSong} onMouseEnter={() => setCursorVariant('hover')} onMouseLeave={() => setCursorVariant('default')}>
                        <SkipForward size={20} />
                    </motion.button>
                </div>

                {/* Progress bar */}
                <div className="w-full flex items-center space-x-2">
                    <span className="text-xs text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
                    <div
                        ref={progressRef}
                        onClick={handleProgressClick}
                        className="flex-1 h-1 bg-gray-600 rounded-full cursor-pointer group"
                        onMouseEnter={() => setCursorVariant('hover')}
                        onMouseLeave={() => setCursorVariant('default')}
                    >
                        <div className="h-full bg-white rounded-full group-hover:bg-purple-500 transition-colors relative" style={{ width: `${progress}%` }}>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                    </div>
                    <span className="text-xs text-gray-400 w-10">{formatTime(currentSong?.duration || 0)}</span>
                </div>
            </div>

            {/* Right: Volume Control */}
            <div className="flex items-center justify-end space-x-2 w-1/4 min-w-[100px] md:min-w-[180px]">
                <Volume2 size={18} className="text-gray-300 hidden sm:block" />
                <input
                    type="range"
                    min="0" max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-16 md:w-24 h-1 accent-white bg-white/20 rounded-full cursor-pointer hidden sm:block"
                    onMouseEnter={() => setCursorVariant('hover')}
                    onMouseLeave={() => setCursorVariant('default')}
                />
            </div>
        </footer>
    );
};

// Right panel for currently playing info and recommendations
const RightPanel = () => {
    const { currentSong, setCurrentView } = useApp();
    const { setCursorVariant } = useCustomCursor();
    const [recommendations, setRecommendations] = useState([]);

    useEffect(() => {
        const fetchRecommendations = async () => {
            try {
                const data = await api.get('/api/songs?limit=5');
                setRecommendations(data.slice(0, 5));
            } catch (error) {
                console.error('Failed to fetch recommendations:', error);
            }
        };
        fetchRecommendations();
    }, []);

    return (
        <aside className="w-80 bg-black h-full flex flex-col border-l border-white/10 overflow-y-auto hidden lg:flex">
            {/* Currently Playing Section */}
            {currentSong && (
                <div className="p-6 border-b border-white/10">
                    <h3 className="text-sm font-semibold text-gray-400 mb-4">NOW PLAYING</h3>
                    <div
                        className="cursor-pointer group"
                        onClick={() => setCurrentView('songDetail', { songId: currentSong.id })}
                        onMouseEnter={() => setCursorVariant('hover')}
                        onMouseLeave={() => setCursorVariant('default')}
                    >
                        <img
                            src={`${API_URL}${currentSong.coverUrl}`}
                            alt={currentSong.title}
                            className="w-full aspect-square rounded-lg mb-4 group-hover:opacity-80 transition-opacity"
                        />
                        <h4 className="font-bold text-lg mb-1 group-hover:underline">{currentSong.title}</h4>
                        <p className="text-sm text-gray-400">{currentSong.artist}</p>
                        <p className="text-xs text-gray-500 mt-2">{currentSong.album?.name || 'Unknown Album'}</p>
                    </div>
                </div>
            )}

            {/* Recommendations Section */}
            <div className="p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4">RECOMMENDED</h3>
                <div className="space-y-3">
                    {recommendations.map(song => (
                        <div
                            key={song.id}
                            className="flex items-center space-x-3 p-2 rounded hover:bg-white/5 cursor-pointer group"
                            onClick={() => setCurrentView('songDetail', { songId: song.id })}
                            onMouseEnter={() => setCursorVariant('hover')}
                            onMouseLeave={() => setCursorVariant('default')}
                        >
                            <img
                                src={`${API_URL}${song.coverUrl}`}
                                alt={song.title}
                                className="w-12 h-12 rounded"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate group-hover:underline">{song.title}</p>
                                <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    );
};


const SongCard = ({ song }) => {
    const { setCurrentSong, setIsPlaying, openPlaylistModal, setCurrentView, audioContextRef } = useApp();
    const { setCursorVariant } = useCustomCursor();

    const handleQuickPlay = (e) => {
        e.stopPropagation();
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
        setCurrentSong(song); 
        setIsPlaying(true);
    };
    const handleCardClick = () => setCurrentView('songDetail', { songId: song.id });
    const handleAddToPlaylist = (e) => { e.stopPropagation(); openPlaylistModal(song); };

    return (
        <motion.div
            className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg overflow-hidden group cursor-pointer text-white"
            onClick={handleCardClick}
            whileHover={{ y: -8, scale: 1.05, boxShadow: "0px 10px 30px rgba(0,0,0,0.5)" }}
            transition={{ type: "spring", stiffness: 300 }}
            onMouseEnter={() => setCursorVariant('hover')} onMouseLeave={() => setCursorVariant('default')}
        >
            <div className="relative">
                <img src={`${API_URL}${song.coverUrl}`} alt={song.title} className="w-full h-48 object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleQuickPlay}
                    onMouseEnter={() => setCursorVariant('play')} onMouseLeave={() => setCursorVariant('hover')}>
                </div>
            </div>
            <div className="p-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-lg truncate">{song.title}</h3>
                        <p className="text-gray-400 truncate">{song.artist}</p>
                    </div>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={handleAddToPlaylist} title="添加到歌单" className="p-2 rounded-full hover:bg-purple-500/30 text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity -translate-y-1 group-hover:translate-y-0">
                        <Plus size={20} />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};


const ScrollAnimatedSection = ({ children, delay = 0 }) => {
    const controls = useAnimation();
    const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });
    useEffect(() => {
        if (inView) { controls.start("visible"); }
    }, [controls, inView]);

    return (
        <motion.div
            ref={ref} animate={controls} initial="hidden"
            variants={{
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay, ease: "circOut" } },
                hidden: { opacity: 0, y: 50 }
            }}
        >
            {children}
        </motion.div>
    );
};

const SongRow = ({ song, index, onPlay, isPlaying, isCurrent }) => {
    const { openPlaylistModal, setCurrentView } = useApp();
    const { setCursorVariant } = useCustomCursor();
    const formatTime = (seconds) => new Date(seconds * 1000).toISOString().substr(14, 5);

    const handleAction = (e) => {
        e.stopPropagation();
        onPlay(song);
    };

    const handleMoreOptions = (e) => {
        e.stopPropagation();
        openPlaylistModal(song);
    };

    return (
        <div
            onClick={() => onPlay(song)}
            onMouseEnter={() => setCursorVariant('hover')}
            onMouseLeave={() => setCursorVariant('default')}
            className={`grid grid-cols-[40px_1fr_auto_40px] items-center gap-x-4 px-3 py-2 rounded-md group transition-colors duration-200 cursor-pointer ${
                isCurrent ? 'bg-purple-700' : `hover:bg-zinc-800 ${index % 2 !== 0 ? 'bg-white/5' : ''}`
            }`}
        >
            <div className="flex items-center justify-center text-gray-400 text-sm">
                <span className="group-hover:hidden tabular-nums">{index + 1}</span>
                <button onClick={handleAction} className="hidden group-hover:flex items-center justify-center text-white">
                    {isCurrent && isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>
            </div>

            <div 
                onClick={(e) => { e.stopPropagation(); setCurrentView('songDetail', { songId: song.id }); }}
                className="cursor-pointer min-w-0"
            >
                <p className={`font-medium truncate text-white hover:underline`}>{song.title}</p>
            </div>
            
            <span className={`text-sm ${isCurrent ? 'text-white' : 'text-gray-400'}`}>
                {formatTime(song.duration)}
            </span>
            
            <div className="flex justify-center">
                 <button 
                    onClick={handleMoreOptions} 
                    className={`text-gray-400 hover:text-white transition-opacity ${
                        isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                >
                    <MoreHorizontal size={18} />
                </button>
            </div>
        </div>
    );
};

const HomeView = () => {
    const [songs, setSongs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { debouncedSearchTerm, currentSong, isPlaying, setCurrentSong, setIsPlaying, audioContextRef } = useApp();

    useEffect(() => {
        const fetchSongs = async () => {
            setIsLoading(true);
            try {
                const query = debouncedSearchTerm ? `?search=${debouncedSearchTerm}` : '';
                const response = await api.get(`/api/songs${query}`);
                setSongs(response.songs);
            } catch (error) { console.error("获取歌曲失败:", error); setSongs([]); }
            finally { setIsLoading(false); }
        };
        fetchSongs();
    }, [debouncedSearchTerm]);

    const handlePlay = (song) => {
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
        if (currentSong?.id === song.id) {
            setIsPlaying(!isPlaying);
        } else {
            setCurrentSong(song);
            setIsPlaying(true);
        }
    };
    
    const featuredSong = songs.length > 0 ? songs[0] : null;

    return (
        <div className="p-8">
            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-purple-500" size={32} /></div>
            ) : songs.length > 0 ? (
                <>
                    {!debouncedSearchTerm && featuredSong && (
                         <ScrollAnimatedSection>
                            <div className="flex items-center space-x-8 p-6 bg-gradient-to-r from-purple-900/30 to-transparent rounded-lg mb-12">
                                <img src={`${API_URL}${featuredSong.coverUrl}`} alt={featuredSong.title} className="w-48 h-48 rounded-lg shadow-lg" />
                                <div>
                                    <p className="text-sm text-gray-400">热门单曲</p>
                                    <h1 className="text-5xl font-bold my-2">{featuredSong.title}</h1>
                                    <p className="text-lg text-gray-300 mb-4">{featuredSong.artist}</p>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handlePlay(featuredSong)}
                                        className="bg-purple-600 text-white px-6 py-3 rounded-full flex items-center space-x-2 hover:bg-purple-700"
                                    >
                                        {currentSong?.id === featuredSong.id && isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                                        <span>{currentSong?.id === featuredSong.id && isPlaying ? '暂停' : '播放'}</span>
                                    </motion.button>
                                </div>
                            </div>
                        </ScrollAnimatedSection>
                    )}

                    <ScrollAnimatedSection delay={0.2}>
                         <h2 className="text-2xl font-bold mb-4">
                            {debouncedSearchTerm ? `Search Results for "${debouncedSearchTerm}"` : "热门歌曲"}
                        </h2>
                        <div className="space-y-1">
                            {songs.map((song, index) => (
                                <SongRow
                                    key={song.id}
                                    song={song}
                                    index={index}
                                    onPlay={handlePlay}
                                    isCurrent={currentSong?.id === song.id}
                                    isPlaying={isPlaying}
                                />
                            ))}
                        </div>
                    </ScrollAnimatedSection>
                </>
            ) : (
                <div className="text-center py-12"><p className="text-gray-500">没有找到相关歌曲</p></div>
            )}
        </div>
    );
};


const EditLyricsModal = ({ song, onClose, onSave }) => {
    const [lyrics, setLyrics] = useState(song.lyrics || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        try {
            await onSave(song.id, lyrics);
            onClose();
        } catch (err) {
            setError(err.message || '保存失败');
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <motion.div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div 
                className="bg-white text-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4"
                initial={{ scale: 0.8, y: -50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: -50 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold mb-4">编辑歌词: {song.title}</h2>
                <textarea 
                    value={lyrics}
                    onChange={e => setLyrics(e.target.value)}
                    placeholder="在此输入或粘贴LRC格式歌词... e.g., [00:12.34]歌词内容"
                    className="w-full h-80 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                />
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                <div className="flex justify-end space-x-3 mt-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">取消</button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-400 flex items-center"
                    >
                        {isSaving && <Loader2 className="animate-spin mr-2" size={16} />}
                        保存
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const FormRow = ({ label, children }) => (<div className="flex items-start mb-4"><label className="w-24 text-right mr-4 text-gray-700 shrink-0 pt-2">{label}</label><div className="flex-1">{children}</div></div>);

const CreatorCenterView = () => {
    const { triggerDataRefresh } = useApp();
    const [myAlbums, setMyAlbums] = useState([]);
    const [isFetching, setIsFetching] = useState(true);
    
    const [editingSong, setEditingSong] = useState(null); 
    const [isUploading, setIsUploading] = useState(false);

    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState('');
    const [albumName, setAlbumName] = useState('');
    const [albumType, setAlbumType] = useState('专辑');
    const [albumVersion, setAlbumVersion] = useState('录音室版');
    const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [songFiles, setSongFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const fetchMyAlbums = useCallback(async () => {
        setIsFetching(true);
        try { 
            const data = await api.get('/api/albums/my-albums'); 
            setMyAlbums(data || []); 
        }
        catch (error) { console.error("获取我的作品失败:", error); }
        finally { setIsFetching(false); }
    }, []);
    
    useEffect(() => {
        fetchMyAlbums();
    }, [fetchMyAlbums]);

    const handleSaveLyrics = async (songId, lyrics) => {
        await api.put(`/api/songs/${songId}`, { lyrics });
        setMyAlbums(prevAlbums => prevAlbums.map(album => ({
            ...album,
            songs: album.songs.map(song => 
                song.id === songId ? { ...song, lyrics: lyrics } : song
            )
        })));
    };

    const resetForm = () => { setCoverFile(null); setCoverPreview(''); setAlbumName(''); setAlbumType('专辑'); setAlbumVersion('录音室版'); setReleaseDate(new Date().toISOString().split('T')[0]); setDescription(''); setSongFiles([]); setError(null); setSuccess(null); };
    const handleCoverChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) { setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); }
    };
    const handleSongsChange = (e) => { setSongFiles(prev => [...prev, ...Array.from(e.target.files)]); };
    const removeSong = (indexToRemove) => { setSongFiles(prev => prev.filter((_, index) => index !== indexToRemove)); };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!coverFile || songFiles.length === 0 || !albumName.trim()) { setError('专辑封面、专辑名称和至少一首歌曲是必填项。'); return; }
        setIsLoading(true); setError(null);
        const formData = new FormData();
        formData.append('cover', coverFile);
        formData.append('name', albumName);
        formData.append('type', albumType);
        formData.append('version', albumVersion);
        formData.append('releaseDate', releaseDate);
        formData.append('description', description);
        songFiles.forEach(file => formData.append('songs', file));
        const originalFilenames = songFiles.map(file => encodeURIComponent(file.name));
        formData.append('originalFilenames', JSON.stringify(originalFilenames));
        try {
            const response = await api.postForm('/api/albums', formData);
            setMyAlbums(prev => [response.album, ...prev]);
            resetForm(); 
            triggerDataRefresh();
            setSuccess(`专辑 "${response.album.name}" 创建成功！`);
            setIsUploading(false);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) { setError(err.message || '创建失败'); } finally { setIsLoading(false); }
    };
    const handleDeleteAlbum = async (albumId) => {
        if (!window.confirm('确定要删除这个专辑吗？所有相关歌曲将一并删除，此操作不可撤销。')) return;
        try {
            await api.delete(`/api/albums/${albumId}`);
            setMyAlbums(prevAlbums => prevAlbums.filter(album => album.id !== albumId));
            alert('专辑删除成功'); triggerDataRefresh();
        } catch (error) { alert(`删除失败: ${error.message}`); }
    };

    return (
        <div className="container mx-auto p-8 pb-32 text-white">
            <AnimatePresence>
                {editingSong && (
                    <EditLyricsModal 
                        song={editingSong} 
                        onClose={() => setEditingSong(null)}
                        onSave={handleSaveLyrics}
                    />
                )}
            </AnimatePresence>
            
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">创作中心</h1>
                {!isUploading && (
                    <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsUploading(true)} 
                        className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 shadow-lg"
                    >
                        <UploadCloud size={20} /><span>上传新作品</span>
                    </motion.button>
                )}
            </div>

            <AnimatePresence>
                {isUploading && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, y: -20 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="relative text-gray-800 mb-12">
                             <button onClick={() => setIsUploading(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100 z-10"><X size={24}/></button>
                            <form onSubmit={handleSubmit}>
                                <div className="bg-white p-8 rounded-lg shadow-sm mb-8">
                                    <div className="flex items-center text-gray-500 mb-6"><Music size={24} className="mr-3" /><h2 className="text-lg font-semibold">填写专辑信息</h2></div>
                                    <FormRow label="专辑封面">
                                        <div className="flex items-start">
                                            <label htmlFor="cover-upload" className="w-40 h-40 border-2 border-dashed rounded-md flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 hover:border-purple-500">
                                                <Plus size={32} /><span className="text-sm mt-1">{coverPreview ? '更换图片' : '上传图片'}</span>
                                                <input id="cover-upload" type="file" className="hidden" accept="image/jpeg, image/png" onChange={handleCoverChange} />
                                            </label>
                                            {coverPreview && <img src={coverPreview} alt="Album cover preview" className="w-40 h-40 rounded-md object-cover ml-6" />}
                                        </div><p className="text-xs text-gray-500 mt-2">图片需为jpg、jpeg、png格式，图片尺寸大于640*640像素</p>
                                    </FormRow>
                                    <FormRow label="专辑名称"><input type="text" value={albumName} onChange={e => setAlbumName(e.target.value)} placeholder="输入专辑名称，50字以内" maxLength="50" className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500" required /></FormRow>
                                    <FormRow label="专辑类型"><select value={albumType} onChange={e => setAlbumType(e.target.value)} className="w-full p-2 border rounded bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"><option>专辑</option><option>EP</option><option>单曲</option><option>原声带</option></select></FormRow>
                                    <FormRow label="专辑版本"><input type="text" value={albumVersion} onChange={e => setAlbumVersion(e.target.value)} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500" /></FormRow>
                                    <FormRow label="发行日期"><input type="date" value={releaseDate} onChange={e => setReleaseDate(e.target.value)} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500" /></FormRow>
                                    <FormRow label="专辑描述"><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="输入专辑描述，内容控制在10-2000字之间" rows="4" className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500" /></FormRow>
                                </div>
                                <div className="bg-white p-8 rounded-lg shadow-sm">
                                    <h2 className="text-lg font-semibold mb-6 text-gray-800">歌曲</h2>
                                    <label htmlFor="song-upload" className="block w-full border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:bg-gray-50 hover:border-purple-500">
                                        <Plus className="mx-auto text-gray-400 mb-2" size={32} /><span className="text-gray-600">点击或将歌曲文件拖拽到此处上传</span>
                                        <p className="text-xs text-gray-500 mt-1">(歌曲须为MP3/WAV, 建议优先上传WAV播放效果更佳)</p>
                                        <input id="song-upload" type="file" className="hidden" accept="audio/mpeg, audio/wav" multiple onChange={handleSongsChange} />
                                    </label>
                                    <div className="mt-6 space-y-2">{songFiles.map((file, index) => (<div key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded"><span className="text-sm text-gray-700 truncate">{file.name}</span><button type="button" onClick={() => removeSong(index)} className="p-1 text-gray-500 hover:text-red-500"><X size={16} /></button></div>))}</div>
                                </div>
                                {error && <p className="text-red-500 text-center mt-4">{error}</p>}
                                {success && <p className="text-green-500 text-center mt-4">{success}</p>}
                                <div className="mt-8 flex justify-end"><button type="submit" disabled={isLoading} className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 flex items-center justify-center disabled:bg-purple-400">{isLoading && <Loader2 className="animate-spin mr-2" />}{isLoading ? '正在创建...' : '创建专辑'}</button></div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="border-t border-white/20 pt-8">
                <h2 className="text-2xl font-bold mb-6 text-white">我的作品</h2>
                {isFetching ? <div className="flex justify-center"><Loader2 className="animate-spin text-purple-500" /></div> 
                : myAlbums.length === 0 ? <p className="text-center text-gray-500">您还没有上传任何作品。</p> 
                : <div className="space-y-6">{myAlbums.map(album => (
                    <div key={album.id} className="bg-white/10 p-4 rounded-lg shadow-sm backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-4">
                                <img src={`${API_URL}${album.coverUrl}`} alt={album.name} className="w-20 h-20 rounded object-cover" />
                                <div>
                                    <h3 className="font-bold text-xl">{album.name}</h3>
                                    <p className="text-sm text-gray-400">{album._count?.songs || 0} 首歌曲</p>
                                </div>
                            </div>
                            <button onClick={() => handleDeleteAlbum(album.id)} className="text-red-400 hover:text-red-500 p-2 rounded-full hover:bg-red-500/20 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="pl-24 space-y-2">
                           {album.songs && album.songs.map(song => (
                                <div key={song.id} className="flex items-center justify-between p-2 rounded hover:bg-white/10 transition-colors">
                                    <p className="text-gray-200">{song.title}</p>
                                    <div className="flex items-center space-x-3">
                                        {song.lyrics ? <FileText size={16} className="text-green-400" title="已有歌词"/> : <FileText size={16} className="text-gray-500" title="暂无歌词"/>}
                                        <button onClick={() => setEditingSong(song)} className="flex items-center text-sm text-purple-400 hover:text-purple-300 font-semibold">
                                            <Edit size={16} className="mr-1"/> 编辑歌词
                                        </button>
                                    </div>
                                </div>
                           ))}
                        </div>
                    </div>))}
                </div>
                }
            </div>
        </div>
    );
};


const GenerativeBackground = ({ theme = 'default' }) => {
    const { getFrequencyData, isPlaying } = useApp();
    const pointsRef = useRef();

    const particleColor = useMemo(() => {
        switch(theme) {
            case 'fire': return '#f97316';
            case 'rain': return '#3b82f6';
            case 'stars': return '#facc15';
            case 'love': return '#ec4899';
            default: return '#a855f7';
        }
    }, [theme]);

    const [positions] = useState(() => {
        const count = 5000;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i++) { pos[i] = (Math.random() - 0.5) * 10; }
        return pos;
    });

    useFrame((state, delta) => {
        if (pointsRef.current) {
            pointsRef.current.rotation.y += delta * 0.05;
            let targetScale = 1;
            if (isPlaying && getFrequencyData) {
                const data = getFrequencyData();
                if (data) {
                    const avg = data.reduce((a, b) => a + b, 0) / data.length;
                    targetScale = 1 + (avg / 256) * 1.5;
                }
            }
            pointsRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        }
    });

    return (
        <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
            <PointMaterial transparent color={particleColor} size={0.015} sizeAttenuation={true} depthWrite={false} />
        </Points>
    );
};

const useAudioTime = (audioRef, isPlaying) => {
    const [currentTime, setCurrentTime] = useState(0);
    const frameRef = useRef();

    useEffect(() => {
        const animate = () => {
            if (audioRef.current) {
                setCurrentTime(audioRef.current.currentTime);
            }
            frameRef.current = requestAnimationFrame(animate);
        };

        if (isPlaying) {
            frameRef.current = requestAnimationFrame(animate);
        } else if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
        }

        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [isPlaying, audioRef]);

    return currentTime;
};
const useBeatDetection = (getFrequencyData, isPlaying) => {
    const [beat, setBeat] = useState(false);
    const frameRef = useRef();
    const lastBeatTime = useRef(0);

    useEffect(() => {
        const detect = () => {
            const data = getFrequencyData();
            if (data) {
                const bass = data.slice(1, 5).reduce((a, b) => a + b, 0) / 4;
                const now = Date.now();
                if (bass > 160 && (now - lastBeatTime.current > 200)) {
                    setBeat(true);
                    setTimeout(() => setBeat(false), 100);
                    lastBeatTime.current = now;
                }
            }
            frameRef.current = requestAnimationFrame(detect);
        };

        if (isPlaying && getFrequencyData) {
            frameRef.current = requestAnimationFrame(detect);
        } else if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
        }
        
        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [isPlaying, getFrequencyData]);

    return beat;
};

const parseLyrics = (lyricsText) => {
    if (!lyricsText) return [];

    const lines = lyricsText.split('\n');
    const timedLines = [];
    const lineRegex = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

    for (const line of lines) {
        const match = line.match(lineRegex);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const milliseconds = parseInt(match[3].padEnd(3, '0'), 10);
            const text = match[4].trim();
            const time = minutes * 60 + seconds + milliseconds / 1000;
            
            timedLines.push({ time, text: text || '♪' });
        }
    }

    return timedLines.sort((a, b) => a.time - b.time);
};

const DynamicLyricsDisplay = ({ lyricsText, songDuration, onThemeChange }) => {
    const { audioRef, isPlaying, getFrequencyData } = useApp();
    const [displayMode, setDisplayMode] = useState('karaoke');
    
    const parsedLyrics = useMemo(() => parseLyrics(lyricsText), [lyricsText]);
    const currentTime = useAudioTime(audioRef, isPlaying);
    const beat = useBeatDetection(getFrequencyData, isPlaying);

    const lineRefs = useRef([]);

    const currentLineIndex = useMemo(() => {
        if (!isPlaying || !parsedLyrics || parsedLyrics.length === 0) return -1;
        for (let i = parsedLyrics.length - 1; i >= 0; i--) {
            if (parsedLyrics[i].time <= currentTime) {
                return i;
            }
        }
        return -1;
    }, [currentTime, parsedLyrics, isPlaying]);

    useEffect(() => {
        if (currentLineIndex !== -1 && lineRefs.current[currentLineIndex]) {
            lineRefs.current[currentLineIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [currentLineIndex]);

    useEffect(() => {
        if (currentLineIndex !== -1 && displayMode === 'immersive') {
            const currentLineText = parsedLyrics[currentLineIndex].text.toLowerCase();
            if (/\b(star|night|sky)\b/.test(currentLineText)) onThemeChange('stars');
            else if (/\b(fire|sun|burn)\b/.test(currentLineText)) onThemeChange('fire');
            else if (/\b(rain|water|tear)\b/.test(currentLineText)) onThemeChange('rain');
            else if (/\b(love|heart)\b/.test(currentLineText)) onThemeChange('love');
            else onThemeChange('default');
        } else {
            onThemeChange('default');
        }
    }, [currentLineIndex, parsedLyrics, onThemeChange, displayMode]);

    const renderLyrics = () => {
        if (parsedLyrics.length === 0) {
            return <p className="text-gray-500 text-center text-lg">暂无歌词或格式不正确</p>;
        }

        const currentLine = parsedLyrics[currentLineIndex];

        switch (displayMode) {
            case 'karaoke':
                return parsedLyrics.map((line, lineIdx) => (
                    <p 
                       key={lineIdx} 
                       ref={el => lineRefs.current[lineIdx] = el}
                       className={`text-2xl font-bold transition-all duration-300 py-2 ${lineIdx === currentLineIndex ? 'text-white scale-110' : 'text-gray-500 scale-100'}`}
                    >
                        {line.text}
                    </p>
                ));
            
            case 'beat-bounce':
                return parsedLyrics.map((line, lineIdx) => (
                    <motion.p key={lineIdx}
                        ref={el => lineRefs.current[lineIdx] = el}
                        className={`text-2xl font-bold transition-colors duration-300 py-2 ${lineIdx === currentLineIndex ? 'text-white' : 'text-gray-500'}`}
                        animate={{ scale: (lineIdx === currentLineIndex && beat) ? 1.15 : 1 }}
                        transition={{ type: 'spring', stiffness: 800, damping: 20 }}
                    >
                        {line.text}
                    </motion.p>
                ));

            case 'typewriter': {
                if (!currentLine) return null;
                const characters = currentLine.text.split('');
                return (
                    <motion.p className="text-2xl font-bold text-white" variants={{ visible: { transition: { staggerChildren: 0.03 } } }} initial="hidden" animate="visible">
                        {characters.map((char, i) => (
                            <motion.span key={i} variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
                                {char}
                            </motion.span>
                        ))}
                    </motion.p>
                );
            }

            case 'interactive':
                return parsedLyrics.map((line, lineIdx) => (
                    <p key={lineIdx} 
                       ref={el => lineRefs.current[lineIdx] = el}
                       onClick={() => audioRef.current.currentTime = line.time} 
                       className={`text-xl font-semibold cursor-pointer transition-all duration-300 p-2 rounded-md ${lineIdx === currentLineIndex ? 'text-purple-400 bg-white/10' : 'text-gray-400 hover:text-white'}`}>
                        {line.text}
                    </p>
                ));

            case 'emotion': {
                 if (!currentLine) return null;
                 const variants = {
                    default: { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring' } } },
                    sad: { hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 0.8, transition: { duration: 1.5, ease: 'easeOut' } } },
                    energetic: { hidden: { scale: 0.5, opacity: 0 }, visible: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 500, damping: 15 } } },
                    gentle: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 2 } } },
                 };
                 const currentVariant = variants[currentLine.emotion] || variants.default;
                 return (
                    <motion.p className="text-3xl font-bold text-white" key={currentLineIndex} variants={currentVariant} initial="hidden" animate="visible">
                        {currentLine.text}
                    </motion.p>
                 );
            }

            case 'spatial-flow': {
                const totalText = parsedLyrics.map(l => l.text).join(' • ');
                return (
                    <div className="w-full overflow-hidden whitespace-nowrap">
                        <motion.p className="text-3xl font-bold text-gray-400 inline-block"
                            animate={{ x: [`0%`, `-${100 - (100 / (totalText.length / 100))}%`] }}
                            transition={{ duration: songDuration, ease: 'linear' }}
                        >
                            {totalText}
                        </motion.p>
                    </div>
                );
            }

            case 'immersive':
            default:
                 return parsedLyrics.map((line, lineIdx) => (
                    <p 
                       key={lineIdx} 
                       ref={el => lineRefs.current[lineIdx] = el}
                       className={`text-2xl font-bold transition-all duration-500 ease-out py-2 ${lineIdx === currentLineIndex ? 'opacity-100' : 'opacity-20'}`}>
                        {line.text}
                    </p>
                ));
        }
    }
    
    const ModeButton = ({ mode, children }) => (
        <button onClick={() => setDisplayMode(mode)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${displayMode === mode ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
            {children}
        </button>
    );

    return (
        <div>
            <div className="flex flex-wrap gap-2 justify-center mb-6">
                <ModeButton mode="karaoke">卡拉OK</ModeButton>
                <ModeButton mode="beat-bounce">节奏跳动</ModeButton>
                <ModeButton mode="immersive">沉浸背景</ModeButton>
                <ModeButton mode="typewriter">打字机</ModeButton>
                <ModeButton mode="emotion">情感驱动</ModeButton>
                <ModeButton mode="interactive">互动点唱</ModeButton>
                <ModeButton mode="spatial-flow">空间流</ModeButton>
            </div>
            <div className="relative text-center min-h-48 flex items-center justify-center">
                 <AnimatePresence mode="wait">
                    <motion.div
                        key={displayMode === 'typewriter' || displayMode === 'emotion' ? currentLineIndex : displayMode}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                    >
                       {renderLyrics()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};
const SongDetailView = ({ songId }) => {
    const { user, currentSong, setCurrentSong, isPlaying, setIsPlaying, setCurrentView, audioContextRef } = useApp();
    const [song, setSong] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [lyricTheme, setLyricTheme] = useState('default');
    const isThisSongPlaying = currentSong?.id === songId && isPlaying;

    const fetchSongData = useCallback(async () => {
        try {
            const songData = await api.get(`/api/songs/${songId}`);
            setSong(songData);
            const commentsData = await api.get(`/api/comments/song/${songId}`);
            setComments(commentsData.comments || []);
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    }, [songId]);

    useEffect(() => { setIsLoading(true); fetchSongData(); }, [fetchSongData]);

    const handlePlayPause = () => {
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
        if (currentSong?.id !== songId) { 
            setCurrentSong(song); 
            setIsPlaying(true); 
        } else { 
            setIsPlaying(!isPlaying); 
        }
    };
    
    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;
        try {
            await api.post('/api/comments', { songId, content: newComment });
            setNewComment(""); fetchSongData();
        } catch (err) { alert("评论失败: " + err.message); }
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><Loader2 className="animate-spin text-white" /></div>
    if (!song) return <div className="min-h-screen text-white text-center pt-32 bg-gray-900">歌曲未找到。</div>;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
    };
    const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

    return (
        <div className="relative min-h-screen text-white bg-gray-900">
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 5] }}><ambientLight intensity={0.5} /><GenerativeBackground theme={lyricTheme} /></Canvas>
            </div>
            <div className="relative z-10 min-h-screen bg-black/60 pt-16 pb-16 px-4">
                <motion.button onClick={() => setCurrentView('home')} className="absolute top-6 left-6 flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                    <ChevronLeft size={24} /> <span>返回首页</span>
                </motion.button>
                <motion.div className="container mx-auto max-w-4xl" variants={containerVariants} initial="hidden" animate="visible">
                    <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8 mb-12">
                        <motion.img 
                            src={`${API_URL}${song.coverUrl}`} alt={song.title} 
                            className="w-48 h-48 md:w-56 md:h-56 rounded-lg shadow-2xl object-cover"
                            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
                        />
                        <div className="text-center md:text-left">
                            <h1 className="text-4xl md:text-5xl font-bold mb-2">{song.title}</h1>
                            <p className="text-xl text-gray-300 mb-4">{song.artist}</p>
                             <motion.button onClick={handlePlayPause} whileTap={{ scale: 0.95 }} className="bg-purple-600 hover:bg-purple-700 p-4 rounded-full shadow-lg">
                                {isThisSongPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                            </motion.button>
                        </div>
                    </motion.div>
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-black/30 backdrop-blur-sm p-8 rounded-lg">
                        <div>
                            <h2 className="text-2xl font-semibold mb-4 border-b border-white/20 pb-2">歌词</h2>
                            <div className="h-96 overflow-y-auto pr-4">
                                <DynamicLyricsDisplay lyricsText={song.lyrics} songDuration={song.duration} onThemeChange={setLyricTheme} />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-semibold mb-4 border-b border-white/20 pb-2 flex items-center"><MessageCircle className="mr-2" /> {comments.length} 条评论</h2>
                            {user && (<form onSubmit={handlePostComment} className="mb-6"><textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="留下你的评论..." className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500" rows="3" /><button type="submit" className="mt-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg float-right">发布</button></form>)}
                            <div className="space-y-4 max-h-80 overflow-y-auto pr-4">
                                {comments.map(comment => (<div key={comment.id} className="flex items-start space-x-3"><img src={comment.user.avatar || `https://ui-avatars.com/api/?name=${comment.user.username}&background=random`} alt={comment.user.username} className="w-10 h-10 rounded-full" /><div><p className="font-semibold text-gray-200">{comment.user.username}</p><p className="text-gray-400">{comment.content}</p></div></div>))}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
       </div>
    );
};

const UserProfileView = () => {
   const { user, updateUser, logout } = useApp();
    const [username, setUsername] = useState(user.username);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const handleUpdate = async (e) => {
        e.preventDefault(); setMessage(''); setError('');
        if (password && password !== confirmPassword) { setError('两次输入的密码不一致'); return; }
        setIsLoading(true);
        try {
            const dataToUpdate = {};
            if (username.trim() && username !== user.username) dataToUpdate.username = username;
            if (password) dataToUpdate.password = password;
            if (Object.keys(dataToUpdate).length === 0) { setMessage("未做任何修改"); setIsLoading(false); return; }
            const data = await api.put('/api/users/profile', dataToUpdate);
            updateUser(data.user); setMessage('更新成功！'); setPassword(''); setConfirmPassword('');
        } catch (err) { setError(`更新失败: ${err.message}`); } finally { setIsLoading(false); }
    };
    const handleDelete = async () => {
        if (window.confirm('您确定要注销您的账户吗？此操作将永久删除您的所有数据，且不可恢复。')) {
            try { await api.delete('/api/users/profile'); alert('账户已注销。'); logout(); }
            catch (err) { alert(`注销失败: ${err.message}`); }
        }
    };
    return (
        <div className="container mx-auto p-8 max-w-2xl text-white">
            <h1 className="text-3xl font-bold mb-8">账户设置</h1>
            <div className="bg-white/10 p-8 rounded-lg shadow-md text-gray-200">
                <form onSubmit={handleUpdate}>
                    <div className="mb-4"><label className="block font-bold mb-2">邮箱</label><p className="text-gray-400">{user.email}</p></div>
                    <div className="mb-4"><label className="block font-bold mb-2" htmlFor="username">用户名</label><input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-2 border border-white/20 bg-white/10 rounded" /></div>
                    <div className="mb-4"><label className="block font-bold mb-2" htmlFor="password">新密码（不修改请留空）</label><input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border border-white/20 bg-white/10 rounded" /></div>
                    <div className="mb-6"><label className="block font-bold mb-2" htmlFor="confirmPassword">确认新密码</label><input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-2 border border-white/20 bg-white/10 rounded" /></div>
                    {message && <p className="text-center mb-4 text-green-400">{message}</p>}
                    {error && <p className="text-center mb-4 text-red-400">{error}</p>}
                    <button type="submit" disabled={isLoading} className="w-full bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 flex items-center justify-center">{isLoading && <Loader2 className="animate-spin mr-2" />}更新信息</button>
                </form>
            </div>
            <div className="mt-8 bg-red-500/10 p-6 rounded-lg border border-red-500/20"><h2 className="text-xl font-bold text-red-300 mb-2">危险区域</h2><p className="text-red-400 mb-4">注销账户将永久删除您的所有数据，包括歌单和收藏。此操作无法撤销。</p><button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">注销我的账户</button></div>
        </div>
    );
};
const PlaylistView = () => {
    const { playlists, setCurrentView, fetchUserPlaylists } = useApp();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [playlistName, setPlaylistName] = useState('');
    const [playlistDesc, setPlaylistDesc] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const createPlaylist = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/api/playlists', { name: playlistName, description: playlistDesc });
            await fetchUserPlaylists();
            setPlaylistName('');
            setPlaylistDesc('');
            setShowCreateForm(false);
        } catch (error) {
            alert(`创建失败: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePlaylist = async (e, playlistId) => {
        e.stopPropagation();
        if (window.confirm('确定要删除这个歌单吗？此操作不可撤销。')) {
            try {
                await api.delete(`/api/playlists/${playlistId}`);
                await fetchUserPlaylists();
            } catch (error) {
                alert(`删除失败: ${error.message}`);
            }
        }
    };

    return (
        <div className="container mx-auto p-8 text-white">
            <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-bold">我的歌单</h2><button onClick={() => setShowCreateForm(true)} className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"><Plus size={20} /><span>创建歌单</span></button></div>
            {showCreateForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setShowCreateForm(false)}><div className="bg-white text-gray-800 p-6 rounded-lg w-96" onClick={e => e.stopPropagation()}><h3 className="text-xl font-bold mb-4">创建新歌单</h3><form onSubmit={createPlaylist}><input type="text" placeholder="歌单名称" value={playlistName} onChange={(e) => setPlaylistName(e.target.value)} className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500" required /><textarea placeholder="歌单描述（选填）" value={playlistDesc} onChange={(e) => setPlaylistDesc(e.target.value)} className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500" rows="3" /><div className="flex space-x-3"><button type="submit" disabled={isSubmitting} className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:bg-purple-400">创建</button><button type="button" onClick={() => setShowCreateForm(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300">取消</button></div></form></div></div>)}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{playlists.length === 0 ? (<p className="text-gray-500 col-span-full text-center py-8">还没有歌单，点击上方按钮创建第一个歌单</p>) : (playlists.map(playlist => (
                <div key={playlist.id} className="bg-white/10 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer relative group" onClick={() => setCurrentView('playlistDetail', { playlistId: playlist.id })}>
                    <h3 className="font-bold text-lg mb-2">{playlist.name}</h3>
                    <p className="text-gray-400 text-sm mb-3">{playlist.description || '暂无描述'}</p>
                    <p className="text-sm text-gray-500">{playlist._count?.songs || 0} 首歌曲</p>
                    <button
                        onClick={(e) => handleDeletePlaylist(e, playlist.id)}
                        className="absolute top-2 right-2 p-1.5 bg-black/30 rounded-full text-gray-400 hover:text-white hover:bg-red-500/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="删除歌单"
                    >
                        <X size={16} />
                    </button>
                </div>
            )))}</div>
        </div>
    );
};
const PlaylistDetailView = ({ playlistId }) => {
    const [playlist, setPlaylist] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { setCurrentSong, setIsPlaying, setCurrentView } = useApp();

    useEffect(() => {
        const fetchPlaylist = async () => {
            setIsLoading(true);
            try {
                const data = await api.get(`/api/playlists/${playlistId}`);
                setPlaylist(data);
            } catch (error) {
                console.error("获取歌单详情失败", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPlaylist();
    }, [playlistId]);

    const handleRemoveSong = async (songIdToRemove) => {
        try {
            await api.delete(`/api/playlists/${playlistId}/songs/${songIdToRemove}`);
            setPlaylist(prevPlaylist => ({
                ...prevPlaylist,
                songs: prevPlaylist.songs.filter(song => song.id !== songIdToRemove)
            }));
        } catch (error) {
            console.error("移除歌曲失败", error);
            alert(`移除歌曲失败: ${error.message}`);
        }
    };

    if (isLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-purple-500" size={32} /></div>;
    if (!playlist) return <div className="p-8 text-center text-gray-400">歌单未找到或无法访问。</div>;

    const PlaylistSongRow = ({ song, index, onRemove }) => (
        <div onClick={() => { setCurrentSong(song); setIsPlaying(true); }} className="flex items-center p-3 rounded-md hover:bg-white/10 cursor-pointer group">
            <span className="w-8 text-gray-400 text-center">{index + 1}</span>
            <div className="flex-grow ml-4 min-w-0">
                <p className="font-semibold text-white truncate">{song.title}</p>
                <p className="text-sm text-gray-400 truncate">{song.artist}</p>
            </div>
            <span className="text-sm text-gray-500 mr-4">{new Date(song.duration * 1000).toISOString().substr(14, 5)}</span>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(song.id);
                }}
                className="p-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="从歌单中移除"
            >
                <X size={16} />
            </button>
        </div>
    );

    return (
        <div className="container mx-auto p-8 text-white">
            <button onClick={() => setCurrentView('playlists')} className="flex items-center text-gray-300 hover:text-white mb-6"><ChevronLeft size={20} /> 返回我的歌单</button>
            <h1 className="text-4xl font-bold mb-2">{playlist.name}</h1>
            <p className="text-gray-400 mb-8">{playlist.description}</p>
            <div className="space-y-2">{playlist.songs.length > 0 ? (playlist.songs.map((song, index) => <PlaylistSongRow key={song.id} song={song} index={index} onRemove={handleRemoveSong} />)) : (<p className="text-gray-500 py-4">这个歌单还没有歌曲。</p>)}</div>
        </div>
    );
};
const AddToPlaylistModal = () => {
   const { playlists, closePlaylistModal, playlistModal, fetchUserPlaylists } = useApp();
    const [message, setMessage] = useState('');

    const handleAdd = async (playlistId) => {
        try {
            await api.post(`/api/playlists/${playlistId}/songs`, { songId: playlistModal.songToAdd.id });
            setMessage('添加成功!'); fetchUserPlaylists();
            setTimeout(() => { closePlaylistModal(); setMessage(''); }, 1000);
        } catch (error) { setMessage(`添加失败: ${error.message}`); }
    };

    return (
        <AnimatePresence>
            {playlistModal.isOpen && (
                <motion.div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closePlaylistModal}
                >
                    <motion.div className="bg-white text-gray-800 rounded-lg p-6 w-80"
                        initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 400, damping: 25 } }}
                        exit={{ scale: 0.7, opacity: 0 }} onClick={e => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold mb-4">添加到歌单</h2>
                        {playlists.length > 0 ? (
                            <ul className="space-y-2 max-h-60 overflow-y-auto">{playlists.map(p => (<li key={p.id} onClick={() => handleAdd(p.id)} className="p-2 hover:bg-gray-100 cursor-pointer rounded flex justify-between items-center"><span>{p.name}</span><span className="text-sm text-gray-400">{p._count?.songs || 0}</span></li>))}</ul>
                        ) : <p>你还没有创建歌单。</p>}
                        {message && <p className="text-center mt-4">{message}</p>}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const App = () => {
    const { viewState, user } = useApp();

    const pageVariants = {
        initial: { opacity: 0, filter: 'blur(4px)' },
        in: { opacity: 1, filter: 'blur(0px)' },
        out: { opacity: 0, filter: 'blur(4px)' }
    };
    const pageTransition = { type: 'tween', ease: 'anticipate', duration: 0.5 };

    const renderCurrentView = () => {
        const key = viewState.view + (viewState.playlistId || viewState.songId || '');
        let componentToRender;
        switch (viewState.view) {
            case 'playlists': componentToRender = <PlaylistView />; break;
            case 'playlistDetail': componentToRender = <PlaylistDetailView playlistId={viewState.playlistId} />; break;
            case 'creator': componentToRender = user ? <CreatorCenterView /> : <HomeView />; break;
            case 'profile': componentToRender = user ? <UserProfileView /> : <HomeView />; break;
            case 'home': default: componentToRender = <HomeView />;
        }
        
        if (viewState.view === 'songDetail') return null;

        return (
             <motion.div
                key={key}
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="h-full"
            >
                {componentToRender}
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen bg-[#121212] text-white cursor-none overflow-hidden">
            {viewState.view !== 'login' && <CustomCursor />}
            {viewState.view === 'login' ? <LoginForm /> : (
                <>
                    {/* Main three-column layout */}
                    <div className="flex h-screen pb-20 md:pb-24">
                        {/* Left Sidebar - Library */}
                        <Sidebar />

                        {/* Center - Main Content */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                           <Header />
                           <main className="flex-1 overflow-y-auto">
                                <AnimatePresence mode="wait">
                                    {renderCurrentView()}
                                </AnimatePresence>
                           </main>
                        </div>

                        {/* Right Panel - Info & Recommendations */}
                        <RightPanel />
                    </div>

                    {/* Bottom Player Bar */}
                    <div className="fixed bottom-0 left-0 right-0">
                        <BottomPlayer />
                    </div>

                    {/* Song Detail Overlay */}
                    <AnimatePresence>
                        {viewState.view === 'songDetail' && (
                            <motion.div
                                key="songDetail"
                                className="absolute inset-0 z-40"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.7 }}
                            >
                                <SongDetailView songId={viewState.songId} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
            <AddToPlaylistModal />
        </div>
    );
};

export default function EchoVerse() {
    return (
        <AppProvider>
            <App />
        </AppProvider>
    );
}
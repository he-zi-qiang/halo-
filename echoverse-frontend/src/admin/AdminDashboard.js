// src/admin/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { Users, Music, Disc, List, MessageCircle } from 'lucide-react';
// --- FIX: Corrected the import path to point to App.js in the parent directory ---
import { api } from '../App.js'; 

const StatCard = ({ icon, title, value }) => (
    <div className="bg-white/10 p-6 rounded-lg flex items-center space-x-4">
        <div className="bg-purple-500/20 p-3 rounded-full">{icon}</div>
        <div>
            <p className="text-gray-400 text-sm">{title}</p>
            <p className="text-2xl font-bold">{value ?? '...'}</p>
        </div>
    </div>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [latestUploads, setLatestUploads] = useState([]);
    const [latestComments, setLatestComments] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, uploadsData, commentsData] = await Promise.all([
                    api.get('/api/admin/stats'),
                    api.get('/api/admin/latest-uploads'),
                    api.get('/api/admin/latest-comments')
                ]);
                setStats(statsData.data);
                setLatestUploads(uploadsData.data);
                setLatestComments(commentsData.data);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            }
        };
        fetchData();
    }, []);

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
                <StatCard icon={<Users />} title="Total Users" value={stats?.userCount} />
                <StatCard icon={<Music />} title="Total Songs" value={stats?.songCount} />
                <StatCard icon={<Disc />} title="Total Albums" value={stats?.albumCount} />
                <StatCard icon={<List />} title="Total Playlists" value={stats?.playlistCount} />
                <StatCard icon={<MessageCircle />} title="Total Comments" value={stats?.commentCount} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/5 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Latest Uploads</h2>
                    <ul className="space-y-3">
                        {latestUploads.map(song => (
                            <li key={song.id} className="flex justify-between items-center text-sm">
                                <span>{song.title} by <strong>{song.user.username}</strong></span>
                                <span className="text-gray-400">{new Date(song.createdAt).toLocaleDateString()}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                 <div className="bg-white/5 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Latest Comments</h2>
                     <ul className="space-y-3">
                        {latestComments.map(comment => (
                            <li key={comment.id} className="text-sm">
                                <p className="truncate">"{comment.content}"</p>
                                <p className="text-gray-400 text-xs">by <strong>{comment.user.username}</strong> on "{comment.song.title}"</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
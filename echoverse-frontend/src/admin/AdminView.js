// src/admin/AdminView.js
import React, { useState } from 'react';
import { Shield, Users, Music, MessageSquare } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import AdminUserManagement from './AdminUserManagement';
// --- NEW: Import the new placeholder components ---
import AdminContentManagement from './AdminContentManagement';
import AdminCommunityManagement from './AdminCommunityManagement';

const AdminView = () => {
    const [activeView, setActiveView] = useState('dashboard');

    const renderView = () => {
        switch (activeView) {
            case 'dashboard':
                return <AdminDashboard />;
            case 'users':
                return <AdminUserManagement />;
            // --- NEW: Add cases for the new views ---
            case 'content':
                return <AdminContentManagement />;
            case 'community':
                return <AdminCommunityManagement />;
            default:
                return <AdminDashboard />;
        }
    };

    const NavItem = ({ viewName, icon, children }) => (
        <button
            onClick={() => setActiveView(viewName)}
            className={`flex items-center space-x-3 w-full px-4 py-2 rounded-md transition-colors text-lg ${
                activeView === viewName ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-white/10'
            }`}
        >
            {icon}
            <span>{children}</span>
        </button>
    );

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            <aside className="w-64 bg-black p-4 flex flex-col">
                <h1 className="text-2xl font-bold mb-8 flex items-center"><Shield className="mr-2 text-purple-400"/>Admin Panel</h1>
                <nav className="space-y-2">
                    <NavItem viewName="dashboard" icon={<Shield size={20} />}>Dashboard</NavItem>
                    <NavItem viewName="users" icon={<Users size={20} />}>User Management</NavItem>
                    <NavItem viewName="content" icon={<Music size={20} />}>Content</NavItem>
                    <NavItem viewName="community" icon={<MessageSquare size={20} />}>Community</NavItem>
                </nav>
            </aside>
            <main className="flex-1 p-8 overflow-y-auto">
                {renderView()}
            </main>
        </div>
    );
};

export default AdminView;
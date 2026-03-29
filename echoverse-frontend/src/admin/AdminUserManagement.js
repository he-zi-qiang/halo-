// src/admin/AdminUserManagement.js
import React, { useState, useEffect } from 'react';
import { api } from '../App.js';
import { Trash2, Edit, Ban, Loader2, UserCheck, UserX } from 'lucide-react';

// --- NEW: A Modal component for editing user data ---
const EditUserModal = ({ user, onClose, onSave }) => {
    const [username, setUsername] = useState(user.username);
    const [email, setEmail] = useState(user.email);
    const [role, setRole] = useState(user.role);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave({ ...user, username, email, role });
            onClose();
        } catch (error) {
            alert('Failed to save user details.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">Edit User: {user.username}</h2>
                <form onSubmit={handleSave}>
                    <div className="mb-4">
                        <label className="block mb-1">Username</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-2 bg-white/10 border border-white/20 rounded-md" />
                    </div>
                    <div className="mb-4">
                        <label className="block mb-1">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 bg-white/10 border border-white/20 rounded-md" />
                    </div>
                    <div className="mb-4">
                        <label className="block mb-1">Role</label>
                        <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-2 bg-white/10 border border-white/20 rounded-md">
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-500">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-purple-600 rounded-md hover:bg-purple-700 flex items-center">
                            {isSaving && <Loader2 className="animate-spin mr-2" size={16}/>} Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const AdminUserManagement = () => {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState(null); // --- NEW: State for modal

    const fetchUsers = async () => {
        try {
            const response = await api.get('/api/admin/users');
            setUsers(response.data);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);
    
    // --- MODIFIED: This function now works as before ---
    const handleDeleteUser = async (userId) => {
        if(window.confirm('Are you sure you want to delete this user? This is irreversible.')) {
            try {
                await api.delete(`/api/admin/users/${userId}`);
                setUsers(users.filter(u => u.id !== userId));
            } catch (error) {
                alert('Failed to delete user.');
            }
        }
    }

    // --- NEW: Handler to save edited user data ---
    const handleSaveUser = async (updatedUser) => {
        try {
            const response = await api.put(`/api/admin/users/${updatedUser.id}`, {
                username: updatedUser.username,
                email: updatedUser.email,
                role: updatedUser.role,
            });
            setUsers(users.map(u => u.id === updatedUser.id ? response.data : u));
        } catch (error) {
            console.error("Failed to update user:", error);
            throw error; // Propagate error to modal
        }
    };

    // --- NEW: Handler for banning/unbanning a user ---
    const handleToggleBan = async (user) => {
        const newStatus = user.status === 'BANNED' ? 'ACTIVE' : 'BANNED';
        const action = newStatus === 'BANNED' ? 'ban' : 'unban';
        if(window.confirm(`Are you sure you want to ${action} this user?`)) {
            try {
                // NOTE: This assumes you have an endpoint like this. 
                // We are using a placeholder route from adminController.js
                await api.put(`/api/admin/users/${user.id}/status`, { status: newStatus });
                // Refresh user list to show new status
                fetchUsers(); 
            } catch (error) {
                alert(`Failed to ${action} user.`);
                console.error(`Failed to ${action} user:`, error);
            }
        }
    };

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleSaveUser} />}
            <h1 className="text-3xl font-bold mb-6">User Management</h1>
            <input
                type="text"
                placeholder="Search by username or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full max-w-md p-2 mb-6 bg-white/10 border border-white/20 rounded-md"
            />
            <div className="bg-white/5 rounded-lg overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-white/10">
                        <tr>
                            <th className="p-3">Username</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Registered</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="border-b border-white/10 hover:bg-white/5">
                                <td className="p-3">{user.username}</td>
                                <td className="p-3">{user.email}</td>
                                <td className="p-3">{user.role}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 text-xs rounded-full ${user.status === 'BANNED' ? 'bg-red-500/50 text-red-200' : 'bg-green-500/50 text-green-200'}`}>
                                        {user.status || 'ACTIVE'}
                                    </span>
                                </td>
                                <td className="p-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                                <td className="p-3">
                                    <div className="flex space-x-2">
                                        <button onClick={() => handleToggleBan(user)} title={user.status === 'BANNED' ? 'Unban User' : 'Ban User'} className="p-1 text-yellow-400 hover:text-yellow-200">
                                            {user.status === 'BANNED' ? <UserCheck size={16} /> : <Ban size={16} />}
                                        </button>
                                        <button onClick={() => setEditingUser(user)} title="Edit User" className="p-1 text-blue-400 hover:text-blue-200">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteUser(user.id)} title="Delete User" className="p-1 text-red-500 hover:text-red-300">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminUserManagement;
// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin'); // We will create this middleware

// All routes in this file are protected and require admin privileges
router.use(auth, admin);

// Dashboard
router.get('/stats', adminController.getDashboardStats);
router.get('/latest-uploads', adminController.getLatestUploads);
router.get('/latest-comments', adminController.getLatestComments);

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id/status', adminController.updateUserStatus);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// --- NEW: Add this route for banning/unbanning users ---
router.put('/users/:id/status', adminController.updateUserStatus); 

// Content Management
router.get('/songs', adminController.getAllSongs);
router.put('/songs/:id', adminController.updateSong);
router.delete('/songs/:id', adminController.deleteSong);
router.get('/albums', adminController.getAllAlbums);
router.put('/albums/:id', adminController.updateAlbum);
router.delete('/albums/:id', adminController.deleteAlbum);

// Community Management
router.get('/comments', adminController.getAllComments);
router.delete('/comments/:id', adminController.deleteComment);
router.post('/comments/bulk-delete', adminController.bulkDeleteComments);

module.exports = router;
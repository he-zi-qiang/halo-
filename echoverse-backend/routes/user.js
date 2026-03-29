// routes/user.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// 公开路由
router.post('/register', userController.register);
router.post('/login', userController.login);

// 受保护的路由
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile); // <-- 新增
router.delete('/profile', auth, userController.deleteAccount); // <-- 新增

// 收藏相关
router.get('/favorites', auth, userController.getUserFavorites);
router.post('/favorites', auth, userController.toggleFavorite);

module.exports = router;
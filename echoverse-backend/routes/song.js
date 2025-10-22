// routes/song.js
const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');
const auth = require('../middleware/auth');

// 获取歌曲列表（公开）
router.get('/', songController.getSongs);

// 获取单个歌曲详情（公开）
router.get('/:id', songController.getSongById);

// --- FIX: 新增路由，用于更新歌曲信息（例如歌词） ---
// 此路由需要登录验证，因为它会调用需要 userId 的控制器
router.put('/:id', auth, songController.updateSong);

// 收藏/取消收藏歌曲（需要登录）
// 注意：这个端点在 userController 中实现更合理，但为了兼容您前端的调用，我们保留一个在这里
// 更好的实践是在 user.js 路由中处理
// router.post('/:id/favorite', auth, songController.toggleFavorite);

module.exports = router;
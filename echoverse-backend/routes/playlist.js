// routes/playlist.js
const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const auth = require('../middleware/auth');

// 获取当前用户的歌单列表
router.get('/', auth, playlistController.getUserPlaylists);

// 创建新歌单
router.post('/', auth, playlistController.createPlaylist);

// 获取单个歌单详情
router.get('/:id', auth, playlistController.getPlaylistById);

// 向歌单添加歌曲
router.post('/:id/songs', auth, playlistController.addSongToPlaylist);

// --- 新增: 从歌单移除歌曲 ---
router.delete('/:id/songs/:songId', auth, playlistController.removeSongFromPlaylist);

// --- 新增: 删除整个歌单 ---
router.delete('/:id', auth, playlistController.deletePlaylist);

// 关键！确保这一行存在且正确
module.exports = router;
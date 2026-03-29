// routes/comment.js
const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const auth = require('../middleware/auth');

// 获取某首歌曲的评论（公开）
router.get('/song/:songId', commentController.getSongComments);

// 创建评论（需要登录）
router.post('/', auth, commentController.createComment);

module.exports = router;
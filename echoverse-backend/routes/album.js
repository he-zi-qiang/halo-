// routes/album.js
const express = require('express');
const router = express.Router();
const albumController = require('../controllers/albumController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// 创建新专辑 (需要登录，并处理文件上传)
router.post('/', auth, upload, albumController.createAlbum);

// 获取当前用户创建的所有专辑
router.get('/my-albums', auth, albumController.getMyAlbums);

// 删除指定ID的专辑
router.delete('/:id', auth, albumController.deleteAlbum);

module.exports = router;
// app.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config();

// 导入路由
const userRoutes = require('./routes/user');
const songRoutes = require('./routes/song');
const playlistRoutes = require('./routes/playlist');
const commentRoutes = require('./routes/comment');
const albumRoutes = require('./routes/album'); // <-- 新增: 导入专辑路由

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（用于存放音频文件和图片）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API 路由
app.use('/api/users', userRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/albums', albumRoutes); // <-- 新增: 注册专辑路由，解决 404 错误

// 根路由
app.get('/', (req, res) => {
  res.json({ 
    message: 'EchoVerse 后端服务已启动!',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      songs: '/api/songs',
      playlists: '/api/playlists',
      comments: '/api/comments',
      albums: '/api/albums' // <-- 新增: 更新 API 文档
    }
  });
});

// 添加健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'EchoVerse API',
    version: '1.0.0'
  });
});

// 404 处理
app.use((req, res, next) => {
  res.status(404).json({ error: '请求的资源不存在' });
});

// 全局错误处理
app.use((err, req, res, next) => {
  // --- 修改: 增强错误处理，专门捕获 Multer 错误 ---
  if (err instanceof require('multer').MulterError) {
    return res.status(400).json({ error: `文件上传错误: ${err.message}` });
  }

  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🎵 EchoVerse 服务器正在 http://localhost:${PORT} 上运行`);
  console.log(`📝 API 文档: http://localhost:${PORT}/`);
});
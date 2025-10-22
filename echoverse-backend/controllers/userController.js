// controllers/userController.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'echoverse-secret-key-2024';

// 用户注册
exports.register = async (req, res) => {
  // ... (代码无变化，保持原样)
  try {
    const { email, username, password } = req.body;
    
    if (!email || !username || !password) {
      return res.status(400).json({ error: '请提供完整的注册信息' });
    }
    
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword
      },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true
      }
    });
    
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: '注册成功',
      user,
      token
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
};

// 用户登录
exports.login = async (req, res) => {
  // ... (代码无变化，保持原样)
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      message: '登录成功',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar
      },
      token
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
};

// 获取用户信息
exports.getProfile = async (req, res) => {
  // ... (代码无变化，保持原样)
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            playlists: true,
            favorites: true,
            comments: true
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
};

// --- 新增/移动过来的函数 ---

// 获取用户收藏列表
exports.getUserFavorites = async (req, res) => {
  try {
    const userId = req.userId;
    const favorites = await prisma.userFavorite.findMany({
      where: { userId },
      select: { songId: true }
    });
    res.json(favorites);
  } catch (error) {
    console.error('获取收藏列表错误:', error);
    res.status(500).json({ error: '获取收藏列表失败' });
  }
};

// 切换收藏状态
exports.toggleFavorite = async (req, res) => {
  try {
    const { songId } = req.body;
    const userId = req.userId;

    if (!songId) {
        return res.status(400).json({ error: '需要提供 songId' });
    }

    const existingFavorite = await prisma.userFavorite.findUnique({
      where: {
        userId_songId: {
          userId,
          songId: parseInt(songId),
        },
      },
    });

    if (existingFavorite) {
      await prisma.userFavorite.delete({
        where: {
          id: existingFavorite.id,
        },
      });
      res.json({ message: '已取消收藏', favorited: false });
    } else {
      await prisma.userFavorite.create({
        data: {
          userId,
          songId: parseInt(songId),
        },
      });
      res.json({ message: '收藏成功', favorited: true });
    }
  } catch (error) {
    console.error('切换收藏状态错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
};

// --- 新增：更新用户信息 ---
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { username, password } = req.body;

    const dataToUpdate = {};

    if (username) {
      dataToUpdate.username = username;
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: '密码长度至少为6位' });
      }
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }
    
    if (Object.keys(dataToUpdate).length === 0) {
        return res.status(400).json({ error: '没有提供要更新的数据' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: { id: true, email: true, username: true, avatar: true }
    });

    res.json({ message: '用户信息更新成功', user: updatedUser });
  } catch (error) {
    next(error);
  }
};

// --- 新增：注销账户 ---
exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.userId;

    // Prisma 的 onDelete: Cascade 会处理关联数据的删除
    await prisma.user.delete({
      where: { id: userId }
    });

    res.status(200).json({ message: '账户已成功注销' });
  } catch (error) {
    next(error);
  }
};
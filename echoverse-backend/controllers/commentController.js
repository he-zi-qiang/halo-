// controllers/commentController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 添加评论
exports.createComment = async (req, res) => {
  try {
    const { songId, content } = req.body;
    const userId = req.userId;
    
    const comment = await prisma.comment.create({
      data: {
        content,
        userId,
        songId: parseInt(songId)
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    });
    
    res.status(201).json(comment);
  } catch (error) {
    console.error('创建评论错误:', error);
    res.status(500).json({ error: '评论失败' });
  }
};

// 获取歌曲评论
exports.getSongComments = async (req, res) => {
  try {
    const { songId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { songId: parseInt(songId) },
        skip,
        take: parseInt(limit),
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.comment.count({
        where: { songId: parseInt(songId) }
      })
    ]);
    
    res.json({
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取评论错误:', error);
    res.status(500).json({ error: '获取评论失败' });
  }
};
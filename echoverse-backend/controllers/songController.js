// controllers/songController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 获取歌曲列表
exports.getSongs = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = search ? {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { artist: { contains: search, mode: 'insensitive' } },
        // --- FIX: Correctly search by the related album's name ---
        { album: { 
            name: { contains: search, mode: 'insensitive' } 
          } 
        }
      ]
    } : {};
    
    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          album: { // Include album info in the response
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              favorites: true,
              comments: true
            }
          }
        }
      }),
      prisma.song.count({ where })
    ]);
    
    res.json({
      songs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取歌曲列表错误:', error);
    res.status(500).json({ error: '获取歌曲列表失败' });
  }
};

// ... a keep the rest of your controller functions (getSongById, updateSong) as they are ...
exports.getSongById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const song = await prisma.song.findUnique({
      where: { id: parseInt(id) },
      include: {
        comments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: {
          select: {
            favorites: true,
            comments: true
          }
        }
      }
    });
    
    if (!song) {
      return res.status(404).json({ error: '歌曲不存在' });
    }
    
    // 增加播放次数
    await prisma.song.update({
      where: { id: parseInt(id) },
      data: { playCount: { increment: 1 } }
    });
    
    res.json(song);
  } catch (error) {
    console.error('获取歌曲详情错误:', error);
    res.status(500).json({ error: '获取歌曲详情失败' });
  }
};

// --- 新增: 更新歌曲信息 (特别是歌词) ---
exports.updateSong = async (req, res, next) => {
  try {
    const songId = parseInt(req.params.id);
    const userId = req.userId;
    const { lyrics } = req.body;

    if (isNaN(songId)) {
      return res.status(400).json({ error: '无效的歌曲ID' });
    }

    // 检查歌曲是否存在，并且当前用户是这首歌的创作者
    const song = await prisma.song.findFirst({
      where: {
        id: songId,
        album: {
          userId: userId,
        },
      },
    });

    if (!song) {
      return res.status(404).json({ error: '歌曲不存在或您没有权限修改' });
    }
    
    // 更新歌曲
    const updatedSong = await prisma.song.update({
      where: { id: songId },
      data: {
        lyrics: lyrics, // 可以更新歌词
        // 未来也可以在这里扩展更新标题等
      },
    });

    res.json(updatedSong);
  } catch (error) {
    console.error('更新歌曲错误:', error);
    next(error);
  }
};
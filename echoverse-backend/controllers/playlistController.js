// controllers/playlistController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 创建歌单
exports.createPlaylist = async (req, res, next) => {
  try {
    const { name, description, isPublic = true } = req.body;
    const userId = req.userId;
    
    const playlist = await prisma.playlist.create({
      data: { name, description, isPublic, userId }
    });
    
    res.status(201).json(playlist);
  } catch (error) {
    console.error('创建歌单错误:', error);
    next(error);
  }
};

// 获取用户歌单
exports.getUserPlaylists = async (req, res, next) => {
  try {
    const userId = req.userId;
    
    const playlists = await prisma.playlist.findMany({
      where: { userId },
      include: {
        _count: {
          select: { songs: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    res.json(playlists);
  } catch (error) {
    console.error('获取歌单错误:', error);
    next(error);
  }
};

// 添加歌曲到歌单
exports.addSongToPlaylist = async (req, res, next) => {
  try {
    // --- FIX: Use 'id' from req.params to match the route definition ---
    const playlistId = parseInt(req.params.id);
    const { songId } = req.body;
    const userId = req.userId;
    
    if (isNaN(playlistId) || !songId) {
        return res.status(400).json({ error: '无效的歌单ID或歌曲ID' });
    }

    // 验证歌单所有权
    const playlist = await prisma.playlist.findFirst({
      where: {
        id: playlistId,
        userId
      }
    });
    
    if (!playlist) {
      return res.status(403).json({ error: '没有权限操作此歌单' });
    }
    
    // 添加歌曲
    const playlistSong = await prisma.playlistSong.create({
      data: {
        playlistId: playlistId,
        songId: parseInt(songId)
      }
    });
    
    res.status(201).json({ message: '歌曲已添加到歌单', playlistSong });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '歌曲已在歌单中' });
    }
    console.error('添加歌曲到歌单错误:', error);
    next(error);
  }
};

// 获取单个歌单详情
exports.getPlaylistById = async (req, res, next) => {
  try {
    const playlistId = parseInt(req.params.id);
    const userId = req.userId;

    const playlist = await prisma.playlist.findFirst({
      where: {
        id: playlistId,
        userId: userId,
      },
      include: {
        songs: {
          include: {
            song: true 
          },
          orderBy: {
            addedAt: 'asc'
          }
        }
      }
    });

    if (!playlist) {
      return res.status(404).json({ error: '歌单不存在或无权访问' });
    }
    
    const formattedPlaylist = {
        ...playlist,
        songs: playlist.songs.map(ps => ps.song)
    };

    res.json(formattedPlaylist);
  } catch (error) {
    next(error);
  }
};

// --- 新增: 删除歌单 ---
exports.deletePlaylist = async (req, res, next) => {
  try {
    const playlistId = parseInt(req.params.id);
    const userId = req.userId;

    const playlist = await prisma.playlist.findFirst({
      where: {
        id: playlistId,
        userId: userId,
      },
    });

    if (!playlist) {
      return res.status(404).json({ error: '歌单不存在或无权删除' });
    }

    await prisma.playlist.delete({
      where: { id: playlistId },
    });

    res.status(200).json({ message: '歌单已成功删除' });
  } catch (error) {
    console.error('删除歌单错误:', error);
    next(error);
  }
};

// --- 新增: 从歌单中移除歌曲 ---
exports.removeSongFromPlaylist = async (req, res, next) => {
  try {
    const playlistId = parseInt(req.params.id);
    const songId = parseInt(req.params.songId);
    const userId = req.userId;

    const playlist = await prisma.playlist.findFirst({
      where: { id: playlistId, userId },
    });

    if (!playlist) {
      return res.status(403).json({ error: '没有权限操作此歌单' });
    }

    await prisma.playlistSong.delete({
      where: {
        playlistId_songId: {
          playlistId: playlistId,
          songId: songId,
        },
      },
    });

    res.status(200).json({ message: '歌曲已从歌单中移除' });
  } catch (error) {
    if (error.code === 'P2025') {
       return res.status(404).json({ error: '歌曲不在该歌单中' });
    }
    console.error('从歌单移除歌曲错误:', error);
    next(error);
  }
};
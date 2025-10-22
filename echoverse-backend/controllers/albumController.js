// controllers/albumController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const musicMetadata = require('music-metadata');
const fs = require('fs/promises');
const path = require('path');

const deleteFileSafe = async (filePath) => {
  try {
    // 构建绝对路径以确保安全删除
    const absolutePath = path.resolve(__dirname, '..', filePath);
    // 检查文件是否在 uploads 目录内
    if (!absolutePath.startsWith(path.resolve(__dirname, '..', 'uploads'))) {
        console.warn(`尝试删除 uploads 目录外的文件被阻止: ${filePath}`);
        return;
    }
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`删除文件失败 ${filePath}:`, error);
    }
  }
};


exports.createAlbum = async (req, res, next) => {
  try {
    const { name, type, version, releaseDate, description, originalFilenames } = req.body;
    const userId = req.userId;
    
    if (!name || !releaseDate) {
      return res.status(400).json({ error: '专辑名称和发行日期是必填项' });
    }
    if (!req.files || !req.files.cover || !req.files.songs) {
      return res.status(400).json({ error: '请上传专辑封面和至少一首歌曲' });
    }

    let decodedFilenames = [];
    try {
      const parsedFilenames = JSON.parse(originalFilenames);
      if (Array.isArray(parsedFilenames)) {
        decodedFilenames = parsedFilenames.map(name => decodeURIComponent(name));
      }
    } catch (e) {
        return res.status(400).json({ error: '原始文件名格式错误' });
    }
    
    const coverFile = req.files.cover[0];
    const songFiles = req.files.songs;
    // --- 新增: 获取歌词文件数组，如果不存在则为空数组 ---
    const lyricFiles = req.files.lyricsFiles || [];

    if (songFiles.length !== decodedFilenames.length) {
        return res.status(400).json({ error: '上传文件数量与文件名数量不匹配' });
    }
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return res.status(404).json({ error: '用户不存在' });
    }

    const createdAlbum = await prisma.$transaction(async (tx) => {
      const newAlbum = await tx.album.create({
        data: {
          name,
          type: type || '专辑',
          version,
          releaseDate: new Date(releaseDate),
          description,
          coverUrl: `/uploads/covers/${coverFile.filename}`,
          userId: userId,
        },
      });

      const songCreationPromises = songFiles.map(async (file, index) => {
        let duration = 0;
        try {
          const metadata = await musicMetadata.parseFile(file.path);
          duration = metadata.format.duration || 0;
        } catch (error) {
          console.warn(`无法读取音频文件元数据:`, error);
        }
        
        const correctOriginalName = decodedFilenames[index];
        const defaultTitle = correctOriginalName.split('.').slice(0, -1).join('.');
        
        // --- 新增: 读取歌词文件 ---
        let lyricsContent = null;
        const correspondingLyricFile = lyricFiles[index];
        if (correspondingLyricFile) {
            try {
                lyricsContent = await fs.readFile(correspondingLyricFile.path, 'utf-8');
                // 读取后删除临时的歌词文件
                await deleteFileSafe(correspondingLyricFile.path);
            } catch(lyricError) {
                console.warn(`无法读取歌词文件 ${correspondingLyricFile.originalname}:`, lyricError);
            }
        }
        // --- 新增结束 ---

        return tx.song.create({
          data: {
            title: defaultTitle,
            artist: user.username,
            audioUrl: `/uploads/audio/${file.filename}`,
            duration: parseFloat(duration.toFixed(2)),
            coverUrl: newAlbum.coverUrl,
            albumId: newAlbum.id,
            lyrics: lyricsContent, // <-- 将歌词内容存入数据库
          },
        });
      });
      
      const createdSongs = await Promise.all(songCreationPromises);
      return { ...newAlbum, songs: createdSongs };
    });

    res.status(201).json({ message: '专辑创建成功', album: createdAlbum });
    
  } catch (error) {
    console.error('创建专辑错误:', error);
    next(error); 
  }
};
// ... (getMyAlbums and deleteAlbum functions remain the same)
exports.getMyAlbums = async (req, res, next) => {
  try {
    const userId = req.userId;
    const albums = await prisma.album.findMany({
      where: { userId },
      include: {
        songs: {
          select: { id: true, title: true }
        },
        _count: {
          select: { songs: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(albums);
  } catch (error) {
    console.error('获取我的专辑列表失败:', error);
    next(error);
  }
};

exports.deleteAlbum = async (req, res, next) => {
  try {
    const userId = req.userId;
    const albumId = parseInt(req.params.id);
    const album = await prisma.album.findFirst({
      where: {
        id: albumId,
        userId: userId
      },
      include: { songs: true }
    });
    if (!album) {
      return res.status(404).json({ error: '专辑不存在或您没有权限删除' });
    }
    const fileDeletionPromises = [];
    if (album.coverUrl) {
      fileDeletionPromises.push(deleteFileSafe(album.coverUrl));
    }
    album.songs.forEach(song => {
      if (song.audioUrl) {
        fileDeletionPromises.push(deleteFileSafe(song.audioUrl));
      }
    });
    await Promise.all(fileDeletionPromises);
    await prisma.album.delete({
      where: { id: albumId }
    });
    res.status(200).json({ message: '专辑已成功删除' });
  } catch (error) {
    console.error('删除专辑失败:', error);
    next(error);
  }
};
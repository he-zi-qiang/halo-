// controllers/adminController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- Dashboard ---
exports.getDashboardStats = async (req, res, next) => {
    try {
        const [userCount, songCount, albumCount, playlistCount, commentCount] = await Promise.all([
            prisma.user.count(),
            prisma.song.count(),
            prisma.album.count(),
            prisma.playlist.count(),
            prisma.comment.count(),
        ]);
        res.json({ userCount, songCount, albumCount, playlistCount, commentCount });
    } catch (error) {
        next(error);
    }
};

exports.getLatestUploads = async (req, res, next) => {
    try {
        const latestSongs = await prisma.song.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, username: true } } }
        });
        res.json(latestSongs);
    } catch (error) {
        next(error);
    }
};

exports.getLatestComments = async (req, res, next) => {
    try {
        const latestComments = await prisma.comment.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, username: true } },
                song: { select: { id: true, title: true } }
            }
        });
        res.json(latestComments);
    } catch (error) {
        next(error);
    }
};

// --- User Management ---
exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
             orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        next(error);
    }
};

exports.getUserDetails = async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                albums: { take: 5, orderBy: { createdAt: 'desc' } },
                comments: { take: 10, orderBy: { createdAt: 'desc' }, include: { song: {select: {title: true}} } }
            }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        next(error);
    }
}

exports.updateUser = async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        const { username, email, role } = req.body;
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { username, email, role }
        });
        res.json(updatedUser);
    } catch (error) {
        next(error);
    }
};

exports.deleteUser = async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        await prisma.user.delete({ where: { id: userId } });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body; // Expecting 'ACTIVE' or 'BANNED'

    if (!['ACTIVE', 'BANNED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status provided.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: status },
    });

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};


// --- Content Management ---
exports.getAllSongs = async (req, res, next) => {
    try {
        const songs = await prisma.song.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { username: true } } }
        });
        res.json(songs);
    } catch (error) {
        next(error);
    }
};

exports.updateSong = async (req, res, next) => {
    try {
        const songId = parseInt(req.params.id);
        const { title, artist, lyrics, isHidden } = req.body; // 'isHidden' for unlisting
        const updatedSong = await prisma.song.update({
            where: { id: songId },
            data: { title, artist, lyrics, isHidden }
        });
        res.json(updatedSong);
    } catch (error) {
        next(error);
    }
};

exports.deleteSong = async (req, res, next) => {
    try {
        const songId = parseInt(req.params.id);
        // Remember to delete the actual file from storage as well
        await prisma.song.delete({ where: { id: songId } });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

// Album management functions would be very similar to songs...
exports.getAllAlbums = async (req, res, next) => { /* ... */ };
exports.updateAlbum = async (req, res, next) => { /* ... */ };
exports.deleteAlbum = async (req, res, next) => { /* ... */ };


// --- Community Management ---
exports.getAllComments = async (req, res, next) => {
    try {
        const comments = await prisma.comment.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { username: true } },
                song: { select: { title: true } }
            }
        });
        res.json(comments);
    } catch (error) {
        next(error);
    }
};

exports.deleteComment = async (req, res, next) => {
    try {
        const commentId = parseInt(req.params.id);
        await prisma.comment.delete({ where: { id: commentId } });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

exports.bulkDeleteComments = async (req, res, next) => {
    try {
        const { commentIds } = req.body;
        await prisma.comment.deleteMany({
            where: { id: { in: commentIds } }
        });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
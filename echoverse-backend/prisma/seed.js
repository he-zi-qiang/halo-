// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');

  // 创建测试用户
  const hashedPassword = await bcrypt.hash('123456', 10);
  
  const user1 = await prisma.user.create({
    data: {
      email: 'test@example.com',
      username: 'TestUser',
      password: hashedPassword,
      avatar: 'https://via.placeholder.com/150'
    }
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      username: 'DemoUser',
      password: hashedPassword,
      avatar: 'https://via.placeholder.com/150'
    }
  });

  console.log('用户创建成功');

  // 创建示例歌曲
  const songs = await Promise.all([
    prisma.song.create({
      data: {
        title: '夜曲',
        artist: '周杰伦',
        album: '十一月的萧邦',
        duration: 226,
        coverUrl: 'https://via.placeholder.com/300x300/9333ea/ffffff?text=夜曲',
        audioUrl: '/uploads/audio/yequ.mp3',
        lyrics: '[00:00.00]夜曲 - 周杰伦\n[00:05.00]词：方文山\n[00:10.00]曲：周杰伦\n[00:15.00]一群嗜血的蚂蚁 被腐肉所吸引...',
        playCount: 15234
      }
    }),
    prisma.song.create({
      data: {
        title: '晴天',
        artist: '周杰伦',
        album: '叶惠美',
        duration: 269,
        coverUrl: 'https://via.placeholder.com/300x300/3b82f6/ffffff?text=晴天',
        audioUrl: '/uploads/audio/qingtian.mp3',
        lyrics: '[00:00.00]晴天 - 周杰伦\n[00:05.00]词：周杰伦\n[00:10.00]曲：周杰伦...',
        playCount: 25678
      }
    }),
    prisma.song.create({
      data: {
        title: '稻香',
        artist: '周杰伦',
        album: '魔杰座',
        duration: 223,
        coverUrl: 'https://via.placeholder.com/300x300/10b981/ffffff?text=稻香',
        audioUrl: '/uploads/audio/daoxiang.mp3',
        lyrics: '[00:00.00]稻香 - 周杰伦\n[00:05.00]词：周杰伦\n[00:10.00]曲：周杰伦...',
        playCount: 18900
      }
    }),
    prisma.song.create({
      data: {
        title: '告白气球',
        artist: '周杰伦',
        album: '周杰伦的床边故事',
        duration: 215,
        coverUrl: 'https://via.placeholder.com/300x300/f59e0b/ffffff?text=告白气球',
        audioUrl: '/uploads/audio/gaobaiqiqiu.mp3',
        playCount: 32100
      }
    }),
    prisma.song.create({
      data: {
        title: '七里香',
        artist: '周杰伦',
        album: '七里香',
        duration: 298,
        coverUrl: 'https://via.placeholder.com/300x300/ef4444/ffffff?text=七里香',
        audioUrl: '/uploads/audio/qilixiang.mp3',
        playCount: 28450
      }
    }),
    prisma.song.create({
      data: {
        title: '青花瓷',
        artist: '周杰伦',
        album: '我很忙',
        duration: 238,
        coverUrl: 'https://pica.zhimg.com/v2-d8fb5af2ae409842408ed62d89cf35b6_1440w.jpg',
        audioUrl: '/uploads/audio/青花瓷.mp3',
        playCount: 19870
      }
    }),
    prisma.song.create({
      data: {
        title: '兰亭序',
        artist: '周杰伦',
        album: '魔杰座',
        duration: 250,
        coverUrl: 'https://via.placeholder.com/300x300/06b6d4/ffffff?text=兰亭序',
        audioUrl: '/uploads/audio/lantingxu.mp3',
        playCount: 21300
      }
    }),
    prisma.song.create({
      data: {
        title: '简单爱',
        artist: '周杰伦',
        album: '范特西',
        duration: 270,
        coverUrl: 'https://via.placeholder.com/300x300/0891b2/ffffff?text=简单爱',
        audioUrl: '/uploads/audio/jiandanai.mp3',
        playCount: 24500
      }
    })
  ]);

  console.log(`${songs.length} 首歌曲创建成功`);

  // 创建歌单
  const playlist1 = await prisma.playlist.create({
    data: {
      name: '我的最爱',
      description: '收藏的最喜欢的歌曲',
      coverUrl: 'https://via.placeholder.com/300x300/ec4899/ffffff?text=我的最爱',
      userId: user1.id,
      songs: {
        create: [
          { songId: songs[0].id },
          { songId: songs[1].id },
          { songId: songs[2].id }
        ]
      }
    }
  });

  const playlist2 = await prisma.playlist.create({
    data: {
      name: '轻松时刻',
      description: '适合放松的音乐',
      coverUrl: 'https://via.placeholder.com/300x300/14b8a6/ffffff?text=轻松时刻',
      userId: user1.id,
      songs: {
        create: [
          { songId: songs[2].id },
          { songId: songs[3].id },
          { songId: songs[7].id }
        ]
      }
    }
  });

  console.log('歌单创建成功');

  // 创建一些评论
  await prisma.comment.createMany({
    data: [
      {
        content: '这首歌真的太好听了！每次听都有不同的感受。',
        userId: user1.id,
        songId: songs[0].id
      },
      {
        content: '童年的回忆，听到这首歌仿佛回到了那个夏天。',
        userId: user2.id,
        songId: songs[1].id
      },
      {
        content: '歌词写得真好，很有画面感。',
        userId: user1.id,
        songId: songs[1].id
      },
      {
        content: '百听不厌的经典！',
        userId: user2.id,
        songId: songs[0].id
      }
    ]
  });

  console.log('评论创建成功');

  // 添加收藏
  await prisma.userFavorite.createMany({
    data: [
      { userId: user1.id, songId: songs[0].id },
      { userId: user1.id, songId: songs[1].id },
      { userId: user1.id, songId: songs[4].id },
      { userId: user2.id, songId: songs[1].id },
      { userId: user2.id, songId: songs[2].id }
    ]
  });

  console.log('收藏记录创建成功');

  console.log('✅ 数据库初始化完成！');
  console.log('\n测试账号：');
  console.log('邮箱: test@example.com');
  console.log('密码: 123456');
  console.log('\n或者：');
  console.log('邮箱: demo@example.com');
  console.log('密码: 123456');
}

main()
  .catch((e) => {
    console.error('初始化数据库时出错：', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
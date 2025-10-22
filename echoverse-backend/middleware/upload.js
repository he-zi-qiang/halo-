// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const coverDir = 'uploads/covers';
const audioDir = 'uploads/audio';
fs.mkdirSync(coverDir, { recursive: true });
fs.mkdirSync(audioDir, { recursive: true });

// 配置存储引擎
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'cover') {
      cb(null, coverDir);
    } else if (file.fieldname === 'songs') {
      cb(null, audioDir);
    }  else if (file.fieldname === 'lyricsFiles') dest += 'lyrics_temp'; 
    
    else {
      cb(new Error('Invalid fieldname'), null);
    }
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：字段名-时间戳-原始文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 文件过滤器，只接受图片和音频文件
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'cover') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('封面文件只接受图片格式!'), false);
    }
  } else if (file.fieldname === 'songs') {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('歌曲文件只接受音频格式!'), false);
    }
  } 
    else if (file.fieldname === 'lyricsFiles') {
        // 允许 .txt 或 .lrc 文件
        if (file.mimetype !== 'text/plain' && !file.originalname.endsWith('.lrc')) {
             return cb(new Error('歌词文件必须是 .txt 或 .lrc 格式!'), false);
        }
    } 
  else {
    cb(null, false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024 // 200 MB
  }
}).fields([
  { name: 'cover', maxCount: 1 },
  { name: 'songs', maxCount: 20 },// 假设一次最多上传20首歌
  { name: 'lyricsFiles', maxCount: 50 } // <-- 新增此行
]);

module.exports = upload;
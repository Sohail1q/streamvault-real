const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const http = require('http');

const app = express();
const PORT = 3000;

const STORAGE_DIR = path.join(__dirname, 'storage');
const THUMBS_DIR = path.join(STORAGE_DIR, 'thumbs');
const PICS_DIR = path.join(STORAGE_DIR, 'pictures');

[STORAGE_DIR, THUMBS_DIR, PICS_DIR].forEach(function(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Only these two accounts - both admins
const USERS = [
  { email: 'doomhel6@gmail.com', password: '00966504236461', role: 'admin' },
  { email: 'doomhel8@gmail.com', password: '00966504236461', role: 'admin' }
];

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/storage', express.static(STORAGE_DIR));

app.use(session({
  secret: 'streamvault-final-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 14 * 24 * 60 * 60 * 1000, httpOnly: true }
}));

function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ success: false, message: 'Login required' });
  res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Admin only' });
}

function readMeta(file) {
  var p = path.join(STORAGE_DIR, file);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return []; }
}

function writeMeta(file, data) {
  fs.writeFileSync(path.join(STORAGE_DIR, file), JSON.stringify(data, null, 2));
}

// ========== AUTH ==========
app.get('/login', function(req, res) {
  if (req.session.user) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/login', function(req, res) {
  var email = (req.body || {}).email;
  var password = (req.body || {}).password;
  var user = USERS.find(function(u) { return u.email === email && u.password === password; });
  if (!user) return res.status(401).json({ success: false, message: 'Wrong email or password' });
  req.session.user = { email: user.email, role: user.role };
  res.json({ success: true, role: user.role });
});

app.get('/logout', function(req, res) {
  req.session.destroy(function() { res.redirect('/login'); });
});

app.get('/', requireLogin, function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/me', requireLogin, function(req, res) {
  res.json({ email: req.session.user.email, role: req.session.user.role });
});

// ========== VIDEOS ==========
app.get('/api/videos', requireLogin, function(req, res) {
  var videos = readMeta('videos.json');
  videos.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  res.json(videos);
});

// Quality formats - works across YouTube, Instagram, TikTok, X, etc.
var QUALITY_MAP = {
  'best': 'bv*+ba/b',
  '4k': 'bv[height<=2160]+ba/b',
  '1080p': 'bv[height<=1080]+ba/b',
  '720p': 'bv[height<=720]+ba/b',
  '480p': 'bv[height<=480]+ba/b',
  '360p': 'bv[height<=360]+ba/b',
  'audio': 'ba/b'
};

app.post('/api/download', requireLogin, requireAdmin, function(req, res) {
  var body = req.body || {};
  var url = body.url;
  var quality = body.quality || 'best';

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, message: 'URL is required' });
  }

  // Clean common tracking params that break some extractors
  url = url.trim();

  var id = uuidv4();
  var format = QUALITY_MAP[quality] || QUALITY_MAP['best'];
  var isAudio = quality === 'audio';
  var mergeFlag = isAudio ? '' : '--merge-output-format mp4';
  var outputTemplate = path.join(STORAGE_DIR, id + '.%(ext)s');

  // FINAL strong yt-dlp command for maximum site support:
  // YouTube, Instagram, TikTok, X/Twitter, Facebook, Reddit, Vimeo, Twitch, etc.
  var cmd = [
    'yt-dlp',
    '-f "' + format + '"',
    mergeFlag,
    '--write-thumbnail',
    '--convert-thumbnails jpg',
    '-o "' + outputTemplate + '"',
    '--no-playlist',
    '--retries 20',
    '--fragment-retries 20',
    '--socket-timeout 30',
    '--extractor-retries 5',
    '--no-check-certificates',
    '--geo-bypass',
    '--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"',
    '--add-header "Accept-Language:en-US,en;q=0.9"',
    '--print after_move:filepath',
    '--print title',
    '--print duration_string',
    '"' + url.replace(/"/g, '\\"') + '"'
  ].filter(Boolean).join(' ');

  console.log('[DOWNLOAD] ' + quality + ' -> ' + url);

  exec(cmd, { timeout: 1800000, maxBuffer: 20 * 1024 * 1024 }, function(error, stdout, stderr) {
    if (error) {
      console.error('Download error:', stderr || error.message);
      return res.status(500).json({
        success: false,
        message: 'Download failed. Site may be blocked, private, or need login cookies.',
        detail: (stderr || error.message).toString().slice(0, 500)
      });
    }

    var lines = (stdout || '').trim().split('\n').filter(Boolean);
    var filePath = lines[0];
    var title = lines[1] || 'Untitled Video';
    var duration = lines[2] || '';

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(500).json({ success: false, message: 'File was not created. Try another quality or link.' });
    }

    var filename = path.basename(filePath);
    var stats = fs.statSync(filePath);

    // Thumbnail
    var thumbnailUrl = null;
    var files = fs.readdirSync(STORAGE_DIR);
    var thumbFile = files.find(function(f) {
      return f.startsWith(id) && /\.(jpg|webp|png)$/i.test(f);
    });
    if (thumbFile) {
      var src = path.join(STORAGE_DIR, thumbFile);
      var dest = path.join(THUMBS_DIR, id + '.jpg');
      try { fs.renameSync(src, dest); } catch (e) {
        try { fs.copyFileSync(src, dest); } catch (e2) {}
      }
      if (fs.existsSync(dest)) thumbnailUrl = '/storage/thumbs/' + id + '.jpg';
    }

    var videos = readMeta('videos.json');
    var video = {
      id: id,
      title: title,
      filename: filename,
      url: '/storage/' + filename,
      thumbnail: thumbnailUrl,
      originalUrl: url,
      quality: quality,
      size: stats.size,
      duration: duration,
      date: new Date().toISOString(),
      owner: req.session.user.email
    };
    videos.push(video);
    writeMeta('videos.json', videos);

    console.log('[SAVED] ' + title + ' (' + quality + ')');
    res.json({ success: true, video: video });
  });
});

app.delete('/api/videos/:id', requireLogin, requireAdmin, function(req, res) {
  var videos = readMeta('videos.json');
  var video = videos.find(function(v) { return v.id === req.params.id; });
  if (!video) return res.status(404).json({ success: false, message: 'Not found' });

  var filePath = path.join(STORAGE_DIR, video.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  var thumbPath = path.join(THUMBS_DIR, video.id + '.jpg');
  if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);

  writeMeta('videos.json', videos.filter(function(v) { return v.id !== req.params.id; }));
  res.json({ success: true });
});

// ========== PICTURES ==========
app.get('/api/pictures', requireLogin, function(req, res) {
  var pics = readMeta('pictures.json');
  pics.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  res.json(pics);
});

function downloadImage(imageUrl, destPath) {
  return new Promise(function(resolve, reject) {
    var protocol = imageUrl.startsWith('https') ? https : http;
    var file = fs.createWriteStream(destPath);
    var request = protocol.get(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
      },
      timeout: 60000
    }, function(response) {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlink(destPath, function() {});
        return downloadImage(response.headers.location, destPath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(destPath, function() {});
        return reject(new Error('HTTP ' + response.statusCode));
      }
      response.pipe(file);
      file.on('finish', function() { file.close(); resolve(); });
    });
    request.on('error', function(err) {
      file.close();
      fs.unlink(destPath, function() {});
      reject(err);
    });
    request.on('timeout', function() {
      request.destroy();
      file.close();
      fs.unlink(destPath, function() {});
      reject(new Error('Timeout'));
    });
  });
}

app.post('/api/save-picture', requireLogin, requireAdmin, async function(req, res) {
  var body = req.body || {};
  var url = body.url;
  var title = body.title;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, message: 'Image URL is required' });
  }

  var id = uuidv4();
  var ext = '.jpg';
  try {
    var u = new URL(url);
    var pathname = u.pathname.toLowerCase();
    if (pathname.endsWith('.png')) ext = '.png';
    else if (pathname.endsWith('.webp')) ext = '.webp';
    else if (pathname.endsWith('.gif')) ext = '.gif';
    else if (pathname.endsWith('.jpeg') || pathname.endsWith('.jpg')) ext = '.jpg';
  } catch (e) {}

  var filename = id + ext;
  var destPath = path.join(PICS_DIR, filename);

  try {
    await downloadImage(url, destPath);
    if (!fs.existsSync(destPath) || fs.statSync(destPath).size < 100) {
      return res.status(500).json({ success: false, message: 'Image download failed or file too small' });
    }

    var stats = fs.statSync(destPath);
    var pics = readMeta('pictures.json');
    var pic = {
      id: id,
      title: title || 'Saved Image',
      filename: filename,
      url: '/storage/pictures/' + filename,
      originalUrl: url,
      size: stats.size,
      date: new Date().toISOString(),
      owner: req.session.user.email
    };
    pics.push(pic);
    writeMeta('pictures.json', pics);

    console.log('[PIC SAVED] ' + pic.title);
    res.json({ success: true, picture: pic });
  } catch (err) {
    console.error('Picture save error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save image: ' + err.message });
  }
});

app.delete('/api/pictures/:id', requireLogin, requireAdmin, function(req, res) {
  var pics = readMeta('pictures.json');
  var pic = pics.find(function(p) { return p.id === req.params.id; });
  if (!pic) return res.status(404).json({ success: false, message: 'Not found' });

  var filePath = path.join(PICS_DIR, pic.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  writeMeta('pictures.json', pics.filter(function(p) { return p.id !== req.params.id; }));
  res.json({ success: true });
});

// Hide metadata
app.get('/storage/videos.json', function(req, res) { res.status(403).end(); });
app.get('/storage/pictures.json', function(req, res) { res.status(403).end(); });

app.listen(PORT, '0.0.0.0', function() {
  console.log('\n🚀 StreamVault FINAL is running!');
  console.log('   Open: http://localhost:' + PORT);
  console.log('   Supports: YouTube, Instagram, TikTok, X, Facebook, Reddit + 1000 more sites\n');
});

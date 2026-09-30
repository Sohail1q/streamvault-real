var isAdmin = false;

async function init() {
  try {
    var res = await fetch('/api/me');
    if (!res.ok) { window.location.href = '/login'; return; }
    var data = await res.json();
    document.getElementById('userEmail').textContent = data.email;
    isAdmin = data.role === 'admin';
    loadVideos();
    loadPictures();
  } catch (e) {
    window.location.href = '/login';
  }
}

function switchTab(tab) {
  document.getElementById('tab-videos').style.display = tab === 'videos' ? 'block' : 'none';
  document.getElementById('tab-pictures').style.display = tab === 'pictures' ? 'block' : 'none';
  document.querySelectorAll('.tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
}

function connectServer(type) {
  document.querySelectorAll('.server-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.server === type);
  });
  var msg = document.getElementById('connectMsg');
  var nameEl = document.getElementById('serverName');
  if (type === 'local') {
    msg.textContent = '✓ Connected to Local PC — files save on this computer';
    nameEl.textContent = 'Local Server';
  } else {
    msg.textContent = '✓ Cloudflare ready — use cloudflared tunnel for public access';
    nameEl.textContent = 'Cloudflare';
  }
}

async function startDownload() {
  if (!isAdmin) { alert('Only admin can save videos'); return; }

  var url = document.getElementById('videoUrl').value.trim();
  var quality = document.getElementById('quality').value;
  var status = document.getElementById('downloadStatus');
  var btn = document.getElementById('downloadBtn');

  if (!url) {
    status.className = 'status-box error';
    status.textContent = 'Please paste a video link';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Downloading...';
  status.className = 'status-box loading';
  status.textContent = '⏳ Downloading from site (' + quality + ')... can take 30s–few minutes';

  try {
    var res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url, quality: quality })
    });
    var data = await res.json();
    if (data.success) {
      status.className = 'status-box success';
      status.textContent = '✓ Saved: ' + data.video.title;
      document.getElementById('videoUrl').value = '';
      loadVideos();
    } else {
      status.className = 'status-box error';
      status.textContent = '✗ ' + (data.message || 'Failed');
    }
  } catch (e) {
    status.className = 'status-box error';
    status.textContent = '✗ Connection error';
  }
  btn.disabled = false;
  btn.textContent = 'Download';
}

async function loadVideos() {
  var gallery = document.getElementById('gallery');
  var countEl = document.getElementById('videoCount');
  try {
    var res = await fetch('/api/videos');
    var videos = await res.json();
    countEl.textContent = videos.length ? '(' + videos.length + ')' : '';
    if (!videos.length) {
      gallery.innerHTML = '<p class="empty">No videos yet. Paste a link above (YouTube, Instagram, TikTok...).</p>';
      return;
    }
    gallery.innerHTML = videos.map(function(v) {
      var thumb = v.thumbnail
        ? '<img src="' + v.thumbnail + '" alt="thumb" loading="lazy">'
        : '<div class="no-thumb">▶</div>';
      return '<div class="video-card">' +
        '<div class="video-thumb" onclick="playVideo(\'' + v.url + '\',\'' + escapeHtml(v.title) + '\')">' + thumb + '</div>' +
        '<div class="video-info">' +
          '<div class="video-title" title="' + escapeHtml(v.title) + '">' + escapeHtml(v.title) + '</div>' +
          '<div class="video-meta">' + formatSize(v.size) + (v.duration ? ' • ' + v.duration : '') + (v.quality ? ' • ' + v.quality : '') + '</div>' +
          '<div class="video-actions">' +
            '<button onclick="playVideo(\'' + v.url + '\',\'' + escapeHtml(v.title) + '\')">Play</button>' +
            '<a href="' + v.url + '" download>Save</a>' +
            '<button class="delete-btn" onclick="deleteVideo(\'' + v.id + '\')">Delete</button>' +
          '</div></div></div>';
    }).join('');
  } catch (e) {
    gallery.innerHTML = '<p class="empty">Failed to load</p>';
  }
}

async function deleteVideo(id) {
  if (!confirm('Delete this video?')) return;
  await fetch('/api/videos/' + id, { method: 'DELETE' });
  loadVideos();
}

async function savePicture() {
  if (!isAdmin) { alert('Only admin can save pictures'); return; }

  var url = document.getElementById('picUrl').value.trim();
  var title = document.getElementById('picTitle').value.trim();
  var status = document.getElementById('picStatus');
  var btn = document.getElementById('savePicBtn');

  if (!url) {
    status.className = 'status-box error';
    status.textContent = 'Please paste an image URL';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Saving...';
  status.className = 'status-box loading';
  status.textContent = '⏳ Saving picture...';

  try {
    var res = await fetch('/api/save-picture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url, title: title || 'Saved Image' })
    });
    var data = await res.json();
    if (data.success) {
      status.className = 'status-box success';
      status.textContent = '✓ Picture saved';
      document.getElementById('picUrl').value = '';
      document.getElementById('picTitle').value = '';
      loadPictures();
    } else {
      status.className = 'status-box error';
      status.textContent = '✗ ' + (data.message || 'Failed');
    }
  } catch (e) {
    status.className = 'status-box error';
    status.textContent = '✗ Connection error';
  }
  btn.disabled = false;
  btn.textContent = 'Save Pic';
}

async function loadPictures() {
  var gallery = document.getElementById('picGallery');
  var countEl = document.getElementById('picCount');
  try {
    var res = await fetch('/api/pictures');
    var pics = await res.json();
    countEl.textContent = pics.length ? '(' + pics.length + ')' : '';
    if (!pics.length) {
      gallery.innerHTML = '<p class="empty">No pictures yet. Paste an image URL above.</p>';
      return;
    }
    gallery.innerHTML = pics.map(function(p) {
      return '<div class="video-card">' +
        '<div class="video-thumb" onclick="viewImage(\'' + p.url + '\',\'' + escapeHtml(p.title) + '\')">' +
          '<img src="' + p.url + '" alt="pic" loading="lazy">' +
        '</div>' +
        '<div class="video-info">' +
          '<div class="video-title">' + escapeHtml(p.title) + '</div>' +
          '<div class="video-meta">' + formatSize(p.size) + '</div>' +
          '<div class="video-actions">' +
            '<button onclick="viewImage(\'' + p.url + '\',\'' + escapeHtml(p.title) + '\')">View</button>' +
            '<a href="' + p.url + '" download>Save</a>' +
            '<button class="delete-btn" onclick="deletePicture(\'' + p.id + '\')">Delete</button>' +
          '</div></div></div>';
    }).join('');
  } catch (e) {
    gallery.innerHTML = '<p class="empty">Failed to load</p>';
  }
}

async function deletePicture(id) {
  if (!confirm('Delete this picture?')) return;
  await fetch('/api/pictures/' + id, { method: 'DELETE' });
  loadPictures();
}

function playVideo(url, title) {
  document.getElementById('playerTitle').textContent = title;
  var player = document.getElementById('player');
  player.src = url;
  document.getElementById('playerModal').classList.add('open');
  player.play();
}

function closePlayer(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('close-btn')) return;
  var player = document.getElementById('player');
  player.pause();
  player.src = '';
  document.getElementById('playerModal').classList.remove('open');
}

function viewImage(url, title) {
  document.getElementById('imgTitle').textContent = title;
  document.getElementById('imgViewer').src = url;
  document.getElementById('imgModal').classList.add('open');
}

function closeImg(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('close-btn')) return;
  document.getElementById('imgViewer').src = '';
  document.getElementById('imgModal').classList.remove('open');
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(text) {
  return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

init();

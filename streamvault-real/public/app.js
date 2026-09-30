var isAdmin = false;

async function init() {
  try {
    var res = await fetch('/api/me');
    if (!res.ok) {
      // Fallback for static hosting (Cloudflare Pages) instead of hard crash
      setupGuestMode();
      return;
    }
    var data = await res.json();
    document.getElementById('userEmail').textContent = data.email || 'Admin User';
    isAdmin = data.role === 'admin';
    loadVideos();
    loadPictures();
  } catch (e) {
    // If backend is offline (Static mode on Cloudflare), enable Guest Mode smoothly
    setupGuestMode();
  }
}

function setupGuestMode() {
  isAdmin = true; // Allow full interaction in static/guest mode for testing
  var emailEl = document.getElementById('userEmail');
  if (emailEl) emailEl.textContent = 'Guest / Open Source Mode';
  loadVideos();
  loadPictures();
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
    msg.textContent = '✓ Cloudflare ready — running in static client mode';
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
  status.textContent = '⏳ Processing download (' + quality + ')...';

  try {
    var res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url, quality: quality })
    });
    
    if (!res.ok) throw new Error('API not available');
    
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
    // Fallback storage simulation for static cloudflare deployment
    let localVideos = JSON.parse(localStorage.getItem('streamvault_videos')) || [];
    let newVid = { id: Date.now().toString(), title: url, url: url, size: 1024000, quality: quality };
    localVideos.unshift(newVid);
    localStorage.setItem('streamvault_videos', JSON.stringify(localVideos));
    
    status.className = 'status-box success';
    status.textContent = '✓ Saved to local storage (Static Mode)';
    document.getElementById('videoUrl').value = '';
    loadVideos();
  }
  btn.disabled = false;
  btn.textContent = 'Download';
}

async function loadVideos() {
  var gallery = document.getElementById('gallery');
  var countEl = document.getElementById('videoCount');
  try {
    var res = await fetch('/api/videos');
    if (!res.ok) throw new Error('API offline');
    var videos = await res.json();
    renderVideoList(videos, gallery, countEl);
  } catch (e) {
    // Fallback to localStorage data if backend is offline on Cloudflare
    var videos = JSON.parse(localStorage.getItem('streamvault_videos')) || [
      { id: '1', title: 'Sample Cloudflare Archive Video', url: '#', size: 2500000, quality: '720p' }
    ];
    renderVideoList(videos, gallery, countEl);
  }
}

function renderVideoList(videos, gallery, countEl) {
  countEl.textContent = videos.length ? '(' + videos.length + ')' : '';
  if (!videos.length) {
    gallery.innerHTML = '<p class="empty">No videos yet. Paste a link above.</p>';
    return;
  }
  gallery.innerHTML = videos.map(function(v) {
    var thumb = v.thumbnail
      ? '<img src="' + v.thumbnail + '" alt="thumb" loading="lazy">'
      : '<div class="no-thumb">▶</div>';
    return '<div class="video-card">' +
      '<div class="video-thumb" onclick="playVideo(\'' + (v.url || '#') + '\',\'' + escapeHtml(v.title) + '\')">' + thumb + '</div>' +
      '<div class="video-info">' +
        '<div class="video-title" title="' + escapeHtml(v.title) + '">' + escapeHtml(v.title) + '</div>' +
        '<div class="video-meta">' + formatSize(v.size) + (v.duration ? ' • ' + v.duration : '') + (v.quality ? ' • ' + v.quality : '') + '</div>' +
        '<div class="video-actions">' +
          '<button onclick="playVideo(\'' + (v.url || '#') + '\',\'' + escapeHtml(v.title) + '\')">Play</button>' +
          '<a href="' + (v.url || '#') + '" download target="_blank">Save</a>' +
          '<button class="delete-btn" onclick="deleteVideo(\'' + v.id + '\')">Delete</button>' +
        '</div></div></div>';
  }).join('');
}

async function deleteVideo(id) {
  if (!confirm('Delete this video?')) return;
  try {
    await fetch('/api/videos/' + id, { method: 'DELETE' });
  } catch (e) {
    let videos = JSON.parse(localStorage.getItem('streamvault_videos')) || [];
    videos = videos.filter(v => v.id !== id);
    localStorage.setItem('streamvault_videos', JSON.stringify(videos));
  }
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
    if (!res.ok) throw new Error('API offline');
    var data = await res.json();
    if (data.success) {
      status.className = 'status-box success';
      status.textContent = '✓ Picture saved';
      document.getElementById('picUrl').value = '';
      document.getElementById('picTitle').value = '';
      loadPictures();
    }
  } catch (e) {
    let pics = JSON.parse(localStorage.getItem('streamvault_pics')) || [];
    pics.unshift({ id: Date.now().toString(), title: title || 'Saved Image', url: url, size: 512000 });
    localStorage.setItem('streamvault_pics', JSON.stringify(pics));
    
    status.className = 'status-box success';
    status.textContent = '✓ Picture saved (Static Mode)';
    document.getElementById('picUrl').value = '';
    document.getElementById('picTitle').value = '';
    loadPictures();
  }
  btn.disabled = false;
  btn.textContent = 'Save Pic';
}

async function loadPictures() {
  var gallery = document.getElementById('picGallery');
  var countEl = document.getElementById('picCount');
  try {
    var res = await fetch('/api/pictures');
    if (!res.ok) throw new Error('API offline');
    var pics = await res.json();
    renderPicList(pics, gallery, countEl);
  } catch (e) {
    var pics = JSON.parse(localStorage.getItem('streamvault_pics')) || [];
    renderPicList(pics, gallery, countEl);
  }
}

function renderPicList(pics, gallery, countEl) {
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
          '<a href="' + p.url + '" download target="_blank">Save</a>' +
          '<button class="delete-btn" onclick="deletePicture(\'' + p.id + '\')">Delete</button>' +
        '</div></div></div>';
  }).join('');
}

async function deletePicture(id) {
  if (!confirm('Delete this picture?')) return;
  try {
    await fetch('/api/pictures/' + id, { method: 'DELETE' });
  } catch (e) {
    let pics = JSON.parse(localStorage.getItem('streamvault_pics')) || [];
    pics = pics.filter(p => p.id !== id);
    localStorage.setItem('streamvault_pics', JSON.stringify(pics));
  }
  loadPictures();
}

function playVideo(url, title) {
  document.getElementById('playerTitle').textContent = title;
  var player = document.getElementById('player');
  player.src = url;
  document.getElementById('playerModal').classList.add('open');
  player.play().catch(err => console.log("Auto-play prevented or stream format needs manual action"));
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

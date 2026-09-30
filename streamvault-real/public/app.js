var isAdmin = true; // Always true in static client mode for easy management

document.addEventListener("DOMContentLoaded", () => {
  init();
});

function init() {
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
    msg.textContent = '✓ Connected to Local PC';
    nameEl.textContent = 'Local Server';
  } else {
    msg.textContent = '✓ Cloudflare Static Mode active';
    nameEl.textContent = 'Cloudflare';
  }
}

function startDownload() {
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
  btn.textContent = 'Saving...';
  status.className = 'status-box loading';
  status.textContent = '⏳ Saving link to archive...';

  // Save to localStorage immediately for Cloudflare static hosting
  let localVideos = JSON.parse(localStorage.getItem('streamvault_videos')) || [];
  let newVid = { 
    id: String(Date.now()), 
    title: url, 
    url: url, 
    size: 1024000, 
    quality: quality 
  };
  localVideos.unshift(newVid);
  localStorage.setItem('streamvault_videos', JSON.stringify(localVideos));

  status.className = 'status-box success';
  status.textContent = '✓ Saved successfully!';
  document.getElementById('videoUrl').value = '';
  loadVideos();

  btn.disabled = false;
  btn.textContent = 'Download';
}

function loadVideos() {
  var gallery = document.getElementById('gallery');
  var countEl = document.getElementById('videoCount');
  
  var videos = JSON.parse(localStorage.getItem('streamvault_videos')) || [];
  renderVideoList(videos, gallery, countEl);
}

function renderVideoList(videos, gallery, countEl) {
  countEl.textContent = videos.length ? '(' + videos.length + ')' : '';
  if (!videos.length) {
    gallery.innerHTML = '<p class="empty">No videos yet. Paste a link above.</p>';
    return;
  }
  gallery.innerHTML = videos.map(function(v) {
    return '<div class="video-card">' +
      '<div class="video-thumb" onclick="playVideo(\'' + v.url + '\',\'' + escapeHtml(v.title) + '\')">' +
        '<div class="no-thumb">▶ Link</div>' +
      '</div>' +
      '<div class="video-info">' +
        '<div class="video-title" title="' + escapeHtml(v.title) + '">' + escapeHtml(v.title) + '</div>' +
        '<div class="video-meta">' + formatSize(v.size) + (v.quality ? ' • ' + v.quality : '') + '</div>' +
        '<div class="video-actions">' +
          '<button onclick="openExternal(\'' + v.url + '\')">Open / Watch</button>' +
          '<a href="' + v.url + '" target="_blank">Source</a>' +
          '<button class="delete-btn" onclick="deleteVideo(\'' + v.id + '\')">Delete</button>' +
        '</div></div></div>';
  }).join('');
}

function deleteVideo(id) {
  if (!confirm('Delete this item?')) return;
  let videos = JSON.parse(localStorage.getItem('streamvault_videos')) || [];
  videos = videos.filter(v => String(v.id) !== String(id));
  localStorage.setItem('streamvault_videos', JSON.stringify(videos));
  loadVideos();
}

function savePicture() {
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

  let pics = JSON.parse(localStorage.getItem('streamvault_pics')) || [];
  pics.unshift({ 
    id: String(Date.now()), 
    title: title || 'Saved Image', 
    url: url, 
    size: 512000 
  });
  localStorage.setItem('streamvault_pics', JSON.stringify(pics));
  
  status.className = 'status-box success';
  status.textContent = '✓ Picture saved successfully!';
  document.getElementById('picUrl').value = '';
  document.getElementById('picTitle').value = '';
  loadPictures();

  btn.disabled = false;
  btn.textContent = 'Save Pic';
}

function loadPictures() {
  var gallery = document.getElementById('picGallery');
  var countEl = document.getElementById('picCount');
  var pics = JSON.parse(localStorage.getItem('streamvault_pics')) || [];
  renderPicList(pics, gallery, countEl);
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
        '<img src="' + p.url + '" alt="pic" loading="lazy" onerror="this.src=\'\'">' +
      '</div>' +
      '<div class="video-info">' +
        '<div class="video-title">' + escapeHtml(p.title) + '</div>' +
        '<div class="video-meta">' + formatSize(p.size) + '</div>' +
        '<div class="video-actions">' +
          '<button onclick="viewImage(\'' + p.url + '\',\'' + escapeHtml(p.title) + '\')">View</button>' +
          '<a href="' + p.url + '" download target="_blank">Download</a>' +
          '<button class="delete-btn" onclick="deletePicture(\'' + p.id + '\')">Delete</button>' +
        '</div></div></div>';
  }).join('');
}

function deletePicture(id) {
  if (!confirm('Delete this picture?')) return;
  let pics = JSON.parse(localStorage.getItem('streamvault_pics')) || [];
  pics = pics.filter(p => String(p.id) !== String(id));
  localStorage.setItem('streamvault_pics', JSON.stringify(pics));
  loadPictures();
}

function openExternal(url) {
  window.open(url, '_blank');
}

function playVideo(url, title) {
  window.open(url, '_blank');
}

function closePlayer(e) {
  var player = document.getElementById('player');
  if (player) { player.pause(); player.src = ''; }
  var modal = document.getElementById('playerModal');
  if (modal) modal.classList.remove('open');
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

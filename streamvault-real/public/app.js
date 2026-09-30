// Extract YouTube ID and open inside website modal with the smart download link trick
function playVideo(url, title) {
  let videoId = extractYouTubeId(url);
  
  let modal = document.getElementById('playerModal');
  let titleEl = document.getElementById('playerTitle');

  if (titleEl) titleEl.textContent = title;

  let playerContent = document.getElementById('embedded-player-container');
  if (!playerContent) {
    playerContent = document.createElement('div');
    playerContent.id = 'embedded-player-container';
    modal.appendChild(playerContent);
  }

  // Generate the smart "trick" download link (e.g., changing youtube.com to ssyoutube.com)
  let downloadTrickUrl = url;
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    // Inserts "ss" right before youtube to trigger the instant downloader helper page
    downloadTrickUrl = url.replace('youtube.com', 'ssyoutube.com').replace('youtu.be/', 'ssyoutube.com/watch?v=');
  }

  if (videoId) {
    playerContent.innerHTML = `
      <div style="position: relative; width: 100%; padding-bottom: 56.25%; margin-bottom: 15px;">
        <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;" 
                allow="autoplay; encrypted-media" allowfullscreen></iframe>
      </div>
      <div style="text-align: center; display: flex; gap: 10px; justify-content: center;">
        <a href="${downloadTrickUrl}" target="_blank" style="display: inline-block; background: #10b981; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">
          📥 Instant Download Link (Trick)
        </a>
        <a href="${url}" target="_blank" style="display: inline-block; background: #6366f1; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">
          🌐 Open Original
        </a>
      </div>
    `;
  } else {
    playerContent.innerHTML = `
      <video id="player" controls autoplay style="width: 100%; max-height: 400px; border-radius: 8px;" src="${url}"></video>
      <div style="text-align: center; margin-top: 15px;">
        <a href="${url}" download target="_blank" style="display: inline-block; background: #6366f1; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">
          📥 Download Video File
        </a>
      </div>
    `;
  }

  modal.classList.add('open');
}

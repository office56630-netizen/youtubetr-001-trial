let player;
let history = []; 
let historyIndex = -1; 
let currentVideo = null; 
let repeatMode = 0; // 0=off, 1=all, 2=one
let shuffle = false;
let updateSeek;
let videoMode = false;

// DOM Elements
const thumbnail = document.getElementById("thumbnail");
const currentTitle = document.getElementById("currentTitle");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const seekbar = document.getElementById("seekbar");
const volumeSlider = document.getElementById("volumeSlider");
const playPauseBtn = document.getElementById("playPauseBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");
const modeSwitchBtn = document.getElementById("modeSwitchBtn");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const historyEl = document.getElementById("historyList");
const closeVideoBtn = document.getElementById("closeVideoBtn");

// 1. YOUTUBE API SETUP
function onYouTubeIframeAPIReady() {
    player = new YT.Player("player", {
        height: "100%", 
        width: "100%", 
        videoId: "",
        playerVars: { 
            playsinline: 1, 
            autoplay: 1, 
            controls: 0, 
            disablekb: 1,
            origin: window.location.origin
        },
        events: { 
            onStateChange: onPlayerStateChange,
            onReady: onPlayerReady,
            onError: onPlayerError
        }
    });
}

function onPlayerReady(event) {
    player.setVolume(volumeSlider.value);
}

function onPlayerError(e) {
    console.warn("Video restricted or error. Skipping...", e.data);
    nextTrack();
}

// 2. AUTOPLAY & UI UPDATE LOGIC
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        if (repeatMode === 2) {
            player.playVideo(); 
        } else {
            nextTrack(); 
        }
    } 
    
    if (event.data === YT.PlayerState.PLAYING) {
        playPauseBtn.textContent = "⏸";
        startUpdatingUI();
    } else {
        playPauseBtn.textContent = "▶️";
        stopUpdatingUI();
    }
}

// 3. CORE PLAYBACK ENGINE
function playVideo(video, updateHistory = true) {
    currentVideo = video;
    
    if (updateHistory) {
        if (history.length === 0 || history[historyIndex]?.videoId !== video.videoId) {
            history.push(video);
            historyIndex = history.length - 1;
        }
    } 
    
    player.loadVideoById(video.videoId);
    player.playVideo(); 

    // Update UI
    currentTitle.textContent = video.title;
    thumbnail.src = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`; 
    
    // Media Session API (Lockscreen Controls)
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: video.title,
            artist: 'YouTube Music Finder',
            artwork: [{ src: `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`, sizes: '480x360', type: 'image/jpeg' }]
        });
        setupMediaActions();
    }

    renderHistory();
}

// 4. NAVIGATION
function nextTrack() {
    if (history.length === 0) return;
    let nextIndex = historyIndex;
    if (shuffle) {
        do { nextIndex = Math.floor(Math.random() * history.length); } 
        while (history.length > 1 && nextIndex === historyIndex);
    } else {
        nextIndex = (historyIndex + 1) % history.length;
    }
    historyIndex = nextIndex;
    playVideo(history[historyIndex], false);
}

function prevTrack() {
    if (history.length === 0) return;
    historyIndex = (historyIndex - 1 + history.length) % history.length;
    playVideo(history[historyIndex], false);
}

// 5. SEARCH & UI RENDERING
document.getElementById("searchBtn").onclick = async () => {
    const query = document.getElementById("searchInput").value;
    if (!query) return;
    try {
        const res = await fetch(`/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const resultsList = document.getElementById("resultsList");
        resultsList.innerHTML = "";
        data.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item.title;
            li.onclick = () => playVideo({videoId: item.videoId, title: item.title}); 
            resultsList.appendChild(li);
        });
    } catch (e) { console.error("Search failed", e); }
};

function renderHistory() {
    historyEl.innerHTML = "";
    history.forEach((video, idx) => {
        const li = document.createElement("li");
        li.textContent = video.title;
        if (idx === historyIndex) li.classList.add("playing");
        li.onclick = () => { historyIndex = idx; playVideo(video, false); };
        historyEl.appendChild(li);
    });
}

// 6. CONTROLS & HELPERS
function setupMediaActions() {
    navigator.mediaSession.setActionHandler('play', () => player.playVideo());
    navigator.mediaSession.setActionHandler('pause', () => player.pauseVideo());
    navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
    navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
}

playPauseBtn.onclick = () => {
    const state = player.getPlayerState();
    state === YT.PlayerState.PLAYING ? player.pauseVideo() : player.playVideo();
};

shuffleBtn.onclick = () => {
    shuffle = !shuffle;
    shuffleBtn.classList.toggle("active", shuffle);
};

repeatBtn.onclick = () => {
    repeatMode = (repeatMode + 1) % 3;
    repeatBtn.textContent = ["🔁", "🔂", "🔁1"][repeatMode];
    repeatBtn.classList.toggle("active", repeatMode !== 0);
};

modeSwitchBtn.onclick = () => toggleVideoMode(!videoMode);
closeVideoBtn.onclick = () => toggleVideoMode(false);

function toggleVideoMode(val) {
    videoMode = val;
    document.getElementById("player-wrapper").classList.toggle("active", videoMode);
    modeSwitchBtn.textContent = videoMode ? "🎧" : "🎥";
}

function formatTime(seconds) {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function startUpdatingUI() {
    stopUpdatingUI();
    updateSeek = setInterval(() => {
        if (player && player.getCurrentTime) {
            const current = player.getCurrentTime();
            const total = player.getDuration();
            seekbar.value = total ? (current / total) * 100 : 0;
            currentTimeEl.textContent = formatTime(current);
            durationEl.textContent = formatTime(total);
        }
    }, 1000);
}

function stopUpdatingUI() { clearInterval(updateSeek); }

seekbar.oninput = () => player.seekTo((seekbar.value / 100) * player.getDuration(), true);
volumeSlider.oninput = () => player.setVolume(volumeSlider.value);
nextBtn.onclick = nextTrack;
prevBtn.onclick = prevTrack;

document.body.addEventListener('click', () => {
    if (player && player.getPlayerState() === YT.PlayerState.UNSTARTED) player.playVideo();
}, { once: true });

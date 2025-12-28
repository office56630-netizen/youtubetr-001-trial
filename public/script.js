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
const seekbar = document.getElementById("seekbar");
const volumeSlider = document.getElementById("volumeSlider");
const playPauseBtn = document.getElementById("playPauseBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");
const modeSwitchBtn = document.getElementById("modeSwitchBtn");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const historyEl = document.getElementById("historyList");

// ---------------------------------------------------------
// 1. YOUTUBE API SETUP
// ---------------------------------------------------------
function onYouTubeIframeAPIReady() {
    player = new YT.Player("player", {
        height: "100%", 
        width: "100%", 
        videoId: "",
        playerVars: { 
            playsinline: 1, 
            autoplay: 1,    // Enable autoplay
            controls: 0,    // Hide YT controls to use ours
            disablekb: 1,
            origin: window.location.origin
        },
        events: { 
            onStateChange: onPlayerStateChange,
            onReady: onPlayerReady
        }
    });
}

function onPlayerReady(event) {
    player.setVolume(volumeSlider.value);
}

// ---------------------------------------------------------
// 2. THE AUTOPLAY NEXT LOGIC
// ---------------------------------------------------------
function onPlayerStateChange(event) {
    // When a song ends
    if (event.data === YT.PlayerState.ENDED) {
        if (repeatMode === 2) {
            player.playVideo(); // Repeat One
        } else {
            nextTrack(); // Autoplay Next
        }
    } 
    
    // UI Updates based on state
    if (event.data === YT.PlayerState.PLAYING) {
        playPauseBtn.textContent = "⏸";
        updateSeekbar();
    } else if (event.data === YT.PlayerState.PAUSED) {
        playPauseBtn.textContent = "▶️";
        clearInterval(updateSeek);
    }
}

// ---------------------------------------------------------
// 3. CORE PLAYBACK ENGINE
// ---------------------------------------------------------
function playVideo(video, updateHistory = true) {
    currentVideo = video;
    
    if (updateHistory) {
        if (history.length === 0 || history[history.length - 1].videoId !== video.videoId) {
            history.push(video);
            historyIndex = history.length - 1;
        }
    } 
    
    // loadVideoById triggers the autoplay
    player.loadVideoById(video.videoId);
    player.playVideo(); 

    // Visual Updates
    playPauseBtn.textContent = "⏸";
    currentTitle.textContent = video.title;
    thumbnail.src = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`; 
    
    renderHistory();
    updateSeekbar();
}

// ---------------------------------------------------------
// 4. NAVIGATION & BACKGROUND FLOW
// ---------------------------------------------------------
function nextTrack() {
    if (history.length === 0) return;

    let nextIndex = historyIndex;

    if (shuffle) {
        do {
            nextIndex = Math.floor(Math.random() * history.length);
        } while (history.length > 1 && nextIndex === historyIndex);
    } else {
        nextIndex++;
        if (nextIndex >= history.length) {
            nextIndex = 0; // Loop back to start for continuous music
        }
    }
    
    historyIndex = nextIndex;
    playVideo(history[historyIndex], false);
}

function prevTrack() {
    if (history.length === 0) return;
    let prevIndex = historyIndex - 1;
    if (prevIndex < 0) prevIndex = history.length - 1;
    
    historyIndex = prevIndex;
    playVideo(history[historyIndex], false);
}

// Button Hooks
nextBtn.onclick = nextTrack;
prevBtn.onclick = prevTrack;

// ---------------------------------------------------------
// 5. SEARCH & UI RENDERING
// ---------------------------------------------------------
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
    } catch (error) {
        console.error("Search failed:", error);
    }
};

function renderHistory() {
    historyEl.innerHTML = "";
    history.forEach((video, idx) => {
        const li = document.createElement("li");
        li.textContent = video.title;
        if (idx === historyIndex) li.classList.add("playing");
        li.onclick = () => {
            historyIndex = idx;
            playVideo(video, false); 
        };
        historyEl.appendChild(li);
    });
}

// ---------------------------------------------------------
// 6. CONTROLS
// ---------------------------------------------------------
playPauseBtn.onclick = () => {
    const state = player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
};

shuffleBtn.onclick = () => {
    shuffle = !shuffle;
    shuffleBtn.style.background = shuffle ? "#3b5a5a" : "";
};

repeatBtn.onclick = () => {
    repeatMode = (repeatMode + 1) % 3;
    const icons = ["🔁", "🔂", "🔁1"]; // 0=Off, 1=All, 2=One
    repeatBtn.textContent = icons[repeatMode];
    repeatBtn.style.background = repeatMode === 0 ? "" : "#3b5a5a";
};

modeSwitchBtn.onclick = () => {
    videoMode = !videoMode;
    const playerWrapper = document.getElementById("player-wrapper");
    if (videoMode) {
        playerWrapper.classList.add("active");
        modeSwitchBtn.textContent = "🎧";
    } else {
        playerWrapper.classList.remove("active");
        modeSwitchBtn.textContent = "🎥";
    }
};

// ---------------------------------------------------------
// 7. UTILS & BROWSER SAFETY
// ---------------------------------------------------------
seekbar.oninput = () => {
    const duration = player.getDuration();
    player.seekTo((seekbar.value / 100) * duration, true);
};

volumeSlider.oninput = () => {
    player.setVolume(volumeSlider.value);
};

function updateSeekbar() {
    clearInterval(updateSeek);
    updateSeek = setInterval(() => {
        if (player && player.getDuration && player.getPlayerState() === YT.PlayerState.PLAYING) {
            const duration = player.getDuration();
            const current = player.getCurrentTime();
            seekbar.value = duration ? (current / duration) * 100 : 0;
        }
    }, 1000);
}

// IMPORTANT: FIX FOR AUTOPLAY 
// This listens for the first click on the page to "unlock" audio for the browser
document.body.addEventListener('click', () => {
    if (player && player.getPlayerState() === YT.PlayerState.UNSTARTED) {
        player.playVideo();
    }
}, { once: true });

// Prevent accidental reload
window.addEventListener('beforeunload', (event) => {
    if (history.length > 0) {
        event.preventDefault();
        event.returnValue = ''; 
    }
});

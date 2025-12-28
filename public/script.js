let player;
let history = []; // Tracks all played videos
let historyIndex = -1; // Index of the current video in the history array
let currentVideo = null; // Current video object
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

// ---------------------------
// 1. YouTube API Setup
// ---------------------------
function onYouTubeIframeAPIReady() {
    player = new YT.Player("player", {
        height: "100%", 
        width: "100%", 
        videoId: "",
        playerVars: { 
            playsinline: 1,
            autoplay: 1, // Automatic playback enabled
            controls: 0,  // Use our custom UI instead
            rel: 0
        },
        events: { 
            onStateChange: onPlayerStateChange,
            onReady: (event) => {
                event.target.setVolume(volumeSlider.value);
            }
        }
    });
}

// ---------------------------
// 2. Autoplay & State Logic
// ---------------------------
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        if (repeatMode === 2) {
            player.playVideo(); // Repeat ONE
        } else {
            nextTrack(); // Autoplay NEXT
        }
    } else if (event.data === YT.PlayerState.PLAYING) {
        playPauseBtn.textContent = "⏸";
        updateSeekbar();
    } else if (event.data === YT.PlayerState.PAUSED) {
        playPauseBtn.textContent = "▶️";
        clearInterval(updateSeek);
    }
}

// ---------------------------
// 3. Play Video Engine
// ---------------------------
function playVideo(video, updateHistory = true) {
    currentVideo = video;
    
    if (updateHistory) {
        // Prevent duplicate consecutive entries in history
        if (history.length === 0 || history[history.length - 1].videoId !== video.videoId) {
            history.push(video);
            historyIndex = history.length - 1;
        } else {
            historyIndex = history.length - 1;
        }
    } 
    
    player.loadVideoById(video.videoId);
    player.playVideo(); 

    // Instant UI Updates
    playPauseBtn.textContent = "⏸";
    currentTitle.textContent = video.title;
    thumbnail.src = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`; 
    
    renderHistory();
    updateSeekbar();
}

// ---------------------------
// 4. Navigation (Next/Prev)
// ---------------------------
nextBtn.onclick = nextTrack;
prevBtn.onclick = prevTrack;

function nextTrack() {
    if (history.length === 0) return;

    let nextIndex = historyIndex;

    if (shuffle) {
        // Pick random, but not the same one
        do {
            nextIndex = Math.floor(Math.random() * history.length);
        } while (history.length > 1 && nextIndex === historyIndex);
    } else {
        nextIndex++;
        // Loop back to start if at the end (Background Music behavior)
        if (nextIndex >= history.length) {
            nextIndex = 0; 
        }
    }
    
    historyIndex = nextIndex;
    playVideo(history[historyIndex], false);
}

function prevTrack() {
    if (history.length === 0) return;

    let prevIndex = historyIndex;
    prevIndex--;

    if (prevIndex < 0) {
        prevIndex = history.length - 1; // Loop to end
    }
    
    historyIndex = prevIndex;
    playVideo(history[historyIndex], false);
}

// ---------------------------
// 5. Search & History UI
// ---------------------------
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
        li.className = (idx === historyIndex) ? "playing" : "";
        li.onclick = () => {
            historyIndex = idx;
            playVideo(video, false); 
        };
        historyEl.appendChild(li);
    });
}

// ---------------------------
// 6. Controls & Modes
// ---------------------------
playPauseBtn.onclick = () => {
    const state = player.getPlayerState();
    state === YT.PlayerState.PLAYING ? player.pauseVideo() : player.playVideo();
};

shuffleBtn.onclick = () => {
    shuffle = !shuffle;
    shuffleBtn.style.background = shuffle ? "#3b5a5a" : "";
};

repeatBtn.onclick = () => {
    repeatMode = (repeatMode + 1) % 3;
    const icons = ["🔁", "🔂", "🔁1"];
    repeatBtn.textContent = icons[repeatMode];
    repeatBtn.style.background = repeatMode === 0 ? "" : "#3b5a5a";
};

modeSwitchBtn.onclick = () => {
    videoMode = !videoMode;
    const playerWrapper = document.getElementById("player-wrapper");
    playerWrapper.classList.toggle("active", videoMode);
    modeSwitchBtn.textContent = videoMode ? "🎧" : "🎥";
};

// ---------------------------
// 7. Utils (Seek/Volume/Security)
// ---------------------------
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

// Ask before reload if music is in queue
window.addEventListener('beforeunload', (event) => {
    if (history.length > 0) {
        event.preventDefault();
        event.returnValue = ''; 
    }
});

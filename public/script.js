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
const nextBtn = document.getElementById("nextBtn"); // Added for clarity
const prevBtn = document.getElementById("prevBtn"); // Added for clarity
const historyEl = document.getElementById("historyList");

// ---------------------------
// YouTube API
// ---------------------------
function onYouTubeIframeAPIReady() {
    player = new YT.Player("player", {
        height: "100%", 
        width: "100%", 
        videoId: "",
        playerVars: { playsinline: 1 },
        events: { onStateChange: onPlayerStateChange }
    });
    player.setVolume(volumeSlider.value);
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        if (repeatMode === 2) {
            player.playVideo(); // Repeat current track
        } else {
            nextTrack(); // Move to the next track
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
// Search YouTube (No Change)
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
            // When clicking a search result, we play it and update history
            li.onclick = () => playVideo({videoId: item.videoId, title: item.title}); 
            resultsList.appendChild(li);
        });
    } catch (error) {
        console.error("Search failed:", error);
    }
};

// ---------------------------
// Play Video 
// ---------------------------
function playVideo(video, updateHistory = true) {
    currentVideo = video;
    
    if (updateHistory) {
        if (history.length === 0 || history[history.length - 1].videoId !== video.videoId) {
            history.push(video);
            historyIndex = history.length - 1;
        } else {
            historyIndex = history.length - 1;
        }
    } 
    
    player.loadVideoById(video.videoId);
    player.playVideo(); 

    // Update UI immediately
    playPauseBtn.textContent = "⏸"; 
    player.setVolume(volumeSlider.value);
    currentTitle.textContent = video.title;
    thumbnail.src = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`; 
    
    renderHistory();
    updateSeekbar();
}
// ---------------------------
// History (No Change)
// ---------------------------
function renderHistory() {
    historyEl.innerHTML = "";
    history.forEach((video, idx) => {
        const li = document.createElement("li");
        li.textContent = video.title;
        // When clicking history, play the video and set the index, but DO NOT update history array itself
        li.onclick = () => {
            historyIndex = idx;
            playVideo(video, false); 
        } 
        
        // Highlight current playing track in history
        if (idx === historyIndex) {
            li.classList.add("playing");
        } else {
            li.classList.remove("playing");
        }

        historyEl.appendChild(li);
    });
}

// ---------------------------
// Navigation Logic (FIXED)
// ---------------------------

// Link buttons to functions
nextBtn.onclick = nextTrack;
prevBtn.onclick = prevTrack;


function nextTrack() {
    if (history.length === 0) return;

    let nextIndex = historyIndex;

    if (shuffle) {
        // Shuffle logic: pick a random index
        do {
            nextIndex = Math.floor(Math.random() * history.length);
        } while (history.length > 1 && nextIndex === historyIndex);
        
    } else {
        // Standard forward logic
        nextIndex++;
        if (nextIndex >= history.length) {
            if (repeatMode === 1) {
                nextIndex = 0; // Repeat all: loop to the start
            } else {
                return; // Stop playback
            }
        }
    }
    
    historyIndex = nextIndex;
    playVideo(history[historyIndex], false); // Play the track without re-adding to history
}


function prevTrack() {
    if (history.length === 0) return;

    let prevIndex = historyIndex;

    if (prevIndex > 0) {
        prevIndex--;
    } else if (prevIndex === 0) {
        if (repeatMode === 1) {
            prevIndex = history.length - 1; // Repeat all: loop to the end
        } else {
            return; // Stay on the first track
        }
    } else {
        return; // Should only happen if history is empty
    }
    
    historyIndex = prevIndex;
    playVideo(history[historyIndex], false); // Play the track without re-adding to history
}


// ---------------------------
// Controls (No Change)
// ---------------------------
// ... (playPauseBtn, shuffleBtn, repeatBtn logic remains the same)

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
    if (repeatMode === 0) {
        repeatBtn.textContent = "🔁"; // off
        repeatBtn.style.background = "";
    } else if (repeatMode === 1) {
        repeatBtn.textContent = "🔂"; // all
        repeatBtn.style.background = "#3b5a5a";
    } else if (repeatMode === 2) {
        repeatBtn.textContent = "🔁1"; // one
        repeatBtn.style.background = "#3b5a5a";
    }
};

// ---------------------------
// Seekbar & Volume (No Change)
// ---------------------------
seekbar.oninput = () => {
    if (!player || !player.getDuration) return;
    const duration = player.getDuration();
    player.seekTo((seekbar.value / 100) * duration, true);
};

volumeSlider.oninput = () => {
    if (!player || !player.setVolume) return;
    player.setVolume(volumeSlider.value);
};

// ---------------------------
// Update Seekbar (No Change)
// ---------------------------
function updateSeekbar() {
    clearInterval(updateSeek);
    updateSeek = setInterval(() => {
        if (player && player.getDuration && player.getPlayerState() === YT.PlayerState.PLAYING) {
            const duration = player.getDuration();
            const current = player.getCurrentTime();
            seekbar.value = duration ? (current / duration) * 100 : 0;
        }
    }, 500);
}

// ---------------------------
// Video/MP3 Mode Toggle Logic (No Change)
// ---------------------------
modeSwitchBtn.onclick = () => {
    videoMode = !videoMode;
    const playerWrapper = document.getElementById("player-wrapper");
    
    if (videoMode) {
        playerWrapper.classList.add("active");
        modeSwitchBtn.textContent = "🎧";
        modeSwitchBtn.title = "Switch to MP3 Mode (Hide Video)";
    } else {
        playerWrapper.classList.remove("active");
        modeSwitchBtn.textContent = "🎥";
        modeSwitchBtn.title = "Switch to Video Mode (Show Video)";
    }
};

// Initial setup
if (history.length > 0) {
    historyIndex = 0;
    playVideo(history[historyIndex], false);
    player.pauseVideo(); 
}

window.addEventListener('beforeunload', (event) => {
    // Only show the prompt if a video has been played or is in history
    if (history.length > 0 || (player && player.getPlayerState() === YT.PlayerState.PLAYING)) {
        // Standard procedure to trigger the browser's "Leave site?" dialog
        event.preventDefault();
        event.returnValue = ''; 
    }
})

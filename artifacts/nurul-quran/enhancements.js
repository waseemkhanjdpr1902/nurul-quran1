// --- 1. Salah Times Logic ---
async function fetchSalahTimes() {
    const display = document.getElementById('salah-display');
    if (!navigator.geolocation) {
        display.innerText = "Geolocation not supported";
        return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=2`);
            const data = await res.json();
            const t = data.data.timings;
            display.innerHTML = `
                <b>Fajr:</b> ${t.Fajr} | <b>Dhuhr:</b> ${t.Dhuhr} | <b>Asr:</b> ${t.Asr} | 
                <b>Maghrib:</b> ${t.Maghrib} | <b>Isha:</b> ${t.Isha}
            `;
        } catch (err) {
            display.innerText = "Error loading prayer times";
        }
    }, () => {
        display.innerText = "Please enable location for prayer times";
    });
}

// --- 2. Global Audio Ribbon Functions ---
window.playAudio = function(url, title) {
    const container = document.getElementById('audio-ribbon-container');
    const audio = document.getElementById('global-audio-player');
    const source = document.getElementById('audio-source');
    const titleEl = document.getElementById('audio-title');

    titleEl.innerText = title;
    source.src = url;
    container.style.display = 'flex';
    audio.load();
    audio.play();
};

window.closeAudioRibbon = function() {
    const container = document.getElementById('audio-ribbon-container');
    const audio = document.getElementById('global-audio-player');
    audio.pause();
    container.style.display = 'none';
};

// Initial calls
fetchSalahTimes();
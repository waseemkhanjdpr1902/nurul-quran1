async function fetchSalahTimes() {
    const display = document.getElementById('salah-display');
    console.log("Salah Script Started");

    const showTimes = async (lat, lng, label = "") => {
        try {
            // Force HTTPS to prevent Mixed Content errors
            const url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=2`;
            console.log("Fetching from:", url);
            
            const res = await fetch(url);
            if (!res.ok) throw new Error('Network response was not ok');
            
            const data = await res.json();
            const t = data.data.timings;
            
            display.innerHTML = `
                ${label} <b>Fajr:</b> ${t.Fajr} | <b>Dhuhr:</b> ${t.Dhuhr} | <b>Asr:</b> ${t.Asr} | 
                <b>Maghrib:</b> ${t.Maghrib} | <b>Isha:</b> ${t.Isha}
            `;
            console.log("Times loaded successfully");
        } catch (err) {
            console.error("Fetch Error:", err);
            display.innerText = "Error loading times. Check connection.";
        }
    };

    // Immediate Fallback logic: If Geolocation takes more than 5 seconds, use Makkah
    const timeout = setTimeout(() => {
        console.log("Geolocation timed out, using Makkah fallback");
        showTimes(21.4225, 39.8262, "(Makkah) ");
    }, 5000);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                clearTimeout(timeout);
                showTimes(pos.coords.latitude, pos.coords.longitude);
            },
            (error) => {
                clearTimeout(timeout);
                console.warn("Geolocation denied:", error.message);
                showTimes(21.4225, 39.8262, "(Makkah) ");
            },
            { timeout: 10000 }
        );
    } else {
        clearTimeout(timeout);
        showTimes(21.4225, 39.8262, "(Makkah) ");
    }
}

// Global Audio Functions
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

// Ensure script runs after HTML is fully loaded
if (document.readyState === "complete" || document.readyState === "interactive") {
    fetchSalahTimes();
} else {
    document.addEventListener("DOMContentLoaded", fetchSalahTimes);
}

// Returns an object with the play/pause <button> as `btn` and a
// boolean `playing`.
function deezer_play_pause_button() {
    const svg = document.querySelector(
        '.player-controls button > svg.svg-icon-pause , ' +
            '.player-controls button > svg.svg-icon-play');
    return {
        btn: svg.parentElement,
        playing: svg.classList.contains('svg-icon-pause')
    }
}

// Starts playing if it was not already playing.
function deezer_play() {
    const {playing, btn} = deezer_play_pause_button();
    if (!playing) {
        btn.click();
    }
}

// Pauses playing if it was playing.
function deezer_pause() {
    const {playing, btn} = deezer_play_pause_button();
    if (playing) {
        btn.click();
    }
}

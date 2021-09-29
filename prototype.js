// Chrome extension to control Deezer with a MIDI device.
// Copyright (C) 2021  Stéphane SOPPERA
//
// This program is free software: you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see
// <https://www.gnu.org/licenses/>.
'use strict';

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

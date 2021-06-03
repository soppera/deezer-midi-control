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

console.log(`patching ${window.location} to add Deezer MIDI control`);

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
    if (!btn.disabled && !playing) {
        btn.click();
    }
}

// Pauses playing if it was playing.
function deezer_pause() {
    const {playing, btn} = deezer_play_pause_button();
    if (!btn.disabled && playing) {
        btn.click();
    }
}

// Go to next song.
function deezer_next() {
    let btn = document.querySelector(
        '.player-controls button > svg.svg-icon-next'
    ).parentElement;
    if (!btn.disabled) {
        btn.click();
    }
}

// Go to prev song.
function deezer_previous() {
    let btn = document.querySelector(
        '.player-controls button > svg.svg-icon-prev'
    ).parentElement;
    if (!btn.disabled) {
        btn.click();
    }
}

let limit = 0;

function is_event_matching(event, matcher, omni) {
    if (!event) {
        return false;
    }
    for (let k of Object.keys(matcher)) {
        if (k === 'channel' && omni) {
            continue;
        }
        if (event[k] !== matcher[k]) {
            return false;
        }
    }
    return true;
}

class Session {
    // Don't call this directly. Use the new_session() function.
    constructor(midi_access) {
        // Serialize accesses to connected_port and options.
        this.mutex = new Mutex();
        this.options = {
            // Name of the MIDI input to listen to.
            midi_input: '',
            play_event: null,
            pause_event: null,
            next_event: null,
            previous_event: null,
            omni: false,
            capturing: false
        }
        this.midi_access = midi_access;
        this.connected_port = null;
    }

    async on_port_changed(port) {
        console.log(`port changed: ${port.name} → ${port.state} ${port.connection}`);
        let unlock = await this.mutex.lock();
        ++limit;
        if (limit > 10) {
            throw 'reached the limit';
        }
        try {
            if (this.connected_port &&
                port.id === this.connected_port.id &&
                port.state === 'disconnected') {
                await this.locked_disconnect();
            } else if (!this.connected_port) {
                await this.locked_connect();
            }
        } finally {
            unlock();
        }
    }

    // Try to connect to the MIDI input port from settings. This
    // function must only be called when a lock on this.mutex is held
    // and when this.connected_port is null.
    async locked_connect() {
        console.assert(!this.connected_port);
        
        let input = find_input(this.midi_access, this.options.midi_input);
        if (!input) {
            console.warn(`Can't find the MIDI input named ${JSON.stringify(this.options.midi_input)}.`);
            return;
        }

        console.log(`Connecting to ${JSON.stringify(input.name)}.`);

        await input.open();

        input.onmidimessage = event => { this.on_midi_message(event) };
        this.connected_port = input;
    }

    on_midi_message(event) {
        if (this.options.capturing) {
            return;
        }
        
        if (event.data.length !== 3) {
            return;
        }

        let type = event.data[0] & 0xf0;
        let matcher = null;
        let channel = event.data[0] & 0xf;
        if (type === 0x90 && event.data[2] > 0) {
            matcher = {
                type: 'note',
                key: event.data[1],
                channel
            }
        } else if (type === 0xb0 && event.data[2] >= 0x40) {
            matcher = {
                type: 'cc',
                cc: event.data[1],
                channel
            }
        } else {
            return;
        }

        if (is_event_matching(this.options.play_event, matcher, this.options.omni)) {
            console.log("MIDI Controller: Deezer ▶");
            deezer_play();
            return;
        } else if (is_event_matching(this.options.pause_event, matcher, this.options.omni)) {
            console.log("MIDI Controller: Deezer ⏸");
            deezer_pause();
        } else if (is_event_matching(this.options.previous_event, matcher, this.options.omni)) {
            console.log("MIDI Controller: Deezer ⏮");
            deezer_previous();
        } else if (is_event_matching(this.options.next_event, matcher, this.options.omni)) {
            console.log("MIDI Controller: Deezer ⏭");
            deezer_next();
        }
    }

    // Disonnects from the MIDI input port. This function must only be
    // called when a lock on this.mutex is held and when
    // this.connected_port is not null.
    async locked_disconnect() {
        console.assert(this.connected_port);

        console.log(`Disconnecting from ${JSON.stringify(this.connected_port.name)}.`);
        try {
            this.connected_port.onmidimessage = null;
            await this.connected_port.close();
        } finally {
            // We don't want to fail.
            this.connected_port = null;
        }
    }
}

// Instantiates a new session and connects to MIDI.
async function new_session(midi_access) {
    let session = new Session(midi_access);
    let unlock = await session.mutex.lock();
    try {
        midi_access.onstatechange = event => {
            session.on_port_changed(event.port)
                .catch(err => { console.error(err); });
        }

        // Read the current value of options.
        let values = await get_local_storage(null);
        for (const key of Object.keys(session.options)) {
            console.log(`session.options[${key}] ← ${JSON.stringify(values[key])}`);
            session.options[key] = values[key];
        }

        // Setup a listener to refresh the options and connection when
        // values changes.
        chrome.storage.local.onChanged.addListener((changes) => {
            (async () => {
                let unlock = await session.mutex.lock();
                try {
                    for (let [key, {oldValue, newValue}] of Object.entries(changes)) {
                        console.log(`session.options[${key}] ← ${JSON.stringify(newValue)}`);
                        session.options[key] = newValue;
                    }
                    if (changes.midi_input) {
                        console.log(`session.options.midi_input changed!`);
                        if (session.connected_port) {
                            await session.locked_disconnect();
                        }
                        await session.locked_connect();
                    }
                } finally {
                    unlock();
                }
            })().catch(console.error);
        });

        // Try to connect with current options.
        await session.locked_connect();

        return session;
    } finally {
        unlock();
    }
}

let session = null;

navigator.requestMIDIAccess()
    .then(async midi_access => {
        console.log(`got midi: ${midi_access}`);
        log_all_midi_inputs(midi_access);

        session = await new_session(midi_access);
    })
    .then(() => {
        chrome.runtime.onMessage.addListener((request, sender, send_response) => {
            if (request.method === 'session_status') {
                // We don't lock here since; the operations are atomic.
                if (session.connected_port) {
                    send_response({
                        connected: true,
                        midi_input: session.connected_port.name
                    });
                } else {
                    send_response({connected: false});
                }
            }
        });
    })
    .catch(err => { console.error(err); })

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
    const btn = document.querySelector(
        'button[aria-label="Pause"][data-testid="play_button_pause"], ' +
            'button[aria-label="Play"][data-testid="play_button_play"]');
    return {
        btn: btn,
        playing: btn.ariaLabel == "Pause",
    };
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
        'button[aria-label="Next"][data-testid="next_track_button"]'
    );
    if (!btn.disabled) {
        btn.click();
    }
}

// Go to prev song.
function deezer_previous() {
    let btn = document.querySelector(
        'button[aria-label="Back"][data-testid="previous_track_button"]'
    );
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
        // Serialize accesses to connected_ports and options.
        this.mutex = new Mutex();
        this.options = {
            play_event: null,
            pause_event: null,
            next_event: null,
            previous_event: null,
            omni: false,
            capturing: false
        }
        this.midi_access = midi_access;
        this.connected_ports = new Map();
    }

    // Returns the Set of port names in the current options.
    midi_in_set() {
        let ret = new Set();
        for (const event of [this.options.play_event,
                             this.options.pause_event,
                             this.options.next_event,
                             this.options.previous_event]) {
            if (event !== null) {
                ret.add(event.midi_in);
            }
        }
        return ret
    }

    async on_port_changed(port) {
        console.log(`port changed: ${port.name} → ${port.state} ${port.connection}`);
        let unlock = await this.mutex.lock();
        ++limit;
        if (limit > 10) {
            throw 'reached the limit';
        }
        try {
            if (port.state === 'disconnected') {
                if (this.connected_ports.get(port.name) === port.id) {
                    await this.locked_disconnect(port);
                }
            } else {
                if (this.midi_in_set().has(port.name) &&
                    !this.connected_ports.has(port.name)) {
                    await this.locked_connect(port);
                }
            }
        } finally {
            unlock();
        }
    }

    // Try to connect to a MIDI port by name.
    async locked_try_connect(port_name) {
        const port = find_input_from_name(this.midi_access, port_name);
        if (port === null) {
            console.warn(`Can't connect to ${JSON.stringify(port_name)} since it does not exist (yet?).`);
            return;
        }
        await this.locked_connect(port);
    }

    // Connect to the MIDI input. This function must only be called
    // when a lock on this.mutex is held and when
    // !this.connected_ports.has(port.name).
    async locked_connect(port) {
        console.assert(!this.connected_ports.has(port.name));
        
        console.log(`Connecting to ${JSON.stringify(port.name)}.`);

        await port.open();

        port.onmidimessage = event => { this.on_midi_message(port, event) };
        this.connected_ports.set(port.name, port.id);
    }

    on_midi_message(port, event) {
        if (this.options.capturing) {
            return;
        }
        
        if (event.data.length !== 3) {
            return;
        }

        let midi_in = port.name;
        let type = event.data[0] & 0xf0;
        let matcher = null;
        let channel = event.data[0] & 0xf;
        if (type === 0x90 && event.data[2] > 0) {
            matcher = {
                midi_in,
                type: 'note',
                key: event.data[1],
                channel
            }
        } else if (type === 0xb0 && event.data[2] >= 0x40) {
            matcher = {
                midi_in,
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
    // this.connected_ports.get(port.name) === port.id.
    async locked_disconnect(port) {
        console.assert(this.connected_ports.get(port.name) === port.id);

        console.log(`Disconnecting from ${JSON.stringify(port.name)}.`);
        try {
            port.onmidimessage = null;
            await port.close();
        } finally {
            // We don't want to fail.
            this.connected_ports.delete(port.name);
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
                    const previous_midi_in_set = session.midi_in_set();
                    for (let [key, {oldValue, newValue}] of Object.entries(changes)) {
                        console.log(`session.options[${key}] ← ${JSON.stringify(newValue)}`);
                        session.options[key] = newValue;
                    }
                    const new_midi_in_set = session.midi_in_set();
                    for (const midi_in of previous_midi_in_set) {
                        if (!new_midi_in_set.has(midi_in) &&
                            session.connected_ports.has(midi_in)) {
                            console.log(`midi port ${JSON.stringify(midi_in)} not used anymore; disconnecting`)
                            const port_id = session.connected_ports.get(midi_in);
                            const port = find_input_from_id(midi_access, port_id);
                            if (port === null) {
                                console.warn(`can't find the input port named ${JSON.stringify(midi_in)} which id was ${JSON.stringify(port_id)}`);
                            } else {
                                await session.locked_disconnect(port);
                            }
                        }
                    }
                    for (const midi_in of new_midi_in_set) {
                        if (!previous_midi_in_set.has(midi_in)) {
                            console.log(`new midi port ${JSON.stringify(midi_in)}; trying to connect`);
                            await session.locked_try_connect(midi_in);
                        }
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
        for (const midi_in of session.midi_in_set()) {
            await session.locked_try_connect(midi_in);
        }

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
                let midi_ins = [];
                for (const midi_in of session.connected_ports.keys()) {
                    midi_ins.push(midi_in);
                }
                send_response({midi_ins});
            }
        });
    })
    .catch(err => { console.error(err); })

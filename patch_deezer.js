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

function find_input(midi_access, input_name) {
    for (let input of midi_access.inputs.values()) {
        if (input.name === input_name) {
            return input;
        }
    }
    return null;
}

let limit = 0;

class Connection {
    constructor(midi_access) {
        this.midi_access = midi_access;

        midi_access.onstatechange = event => {
            this.on_port_changed(event.port)
                .catch(err => { console.error(err); });
        }

        // Serialize accesses to connected_port.
        this.mutex = new Mutex();
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

    // Connects if not already connected (or being connected if
    // another connection is on-going).
    async connect() {
        let unlock = await this.mutex.lock();
        try {
            if (this.connected_port == null) {
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
        
        let values = await get_local_storage('midi_input');
        let input = find_input(this.midi_access, values.midi_input);
        if (!input) {
            console.warn(`Can't find the MIDI input named ${JSON.stringify(values.midi_input)}.`);
            return;
        }

        console.log(`Connecting to ${JSON.stringify(input.name)}.`);
        await input.open();
        input.onmidimessage = this.on_midi_message;
        this.connected_port = input;
    }

    on_midi_message(event) {
        console.log(`midi event: ${event.receivedTime}`);
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

let connection = null;

navigator.requestMIDIAccess().then(async midi_access => {
    console.log(`got midi: ${midi_access}`);
    log_all_midi_inputs(midi_access);

    connection = new Connection(midi_access);
    await connection.connect();
}).catch(err => { console.error(err); })

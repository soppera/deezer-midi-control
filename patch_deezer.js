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
    for (let input of midi_access.inputs) {
        if (input.name == input_name) {
            return input;
        }
    }
    return null;
}

class Connection {
    constructor(midi_access) {
        this.midi_access = midi_access;

        midi_access.onstatechange = event => {
            this.on_port_changed(event.port)
                .catch(err => { console.error(err); });
        }

        this.connected = false;
        this.connected_port_id = '';
        this.connected_port_name = '';
    }

    async on_port_changed(port) {
        console.log(`port changed: ${port.name} → ${port.state}`);
        if (port.id === this.connected_port_id) {
            console.assert(port.state === 'disconnected',
                           port.state);
            this.disconnect();
        } else if (!this.connected) {
            await this.connect();
        } else {
            console.assert(port.id !== this.connected_port_id,
                           `port.id: ${port.id} port.state: ${port.state}`);
        }
    }

    async connect() {
        console.assert(!this.connected);
        
        let values = await get_local_storage('midi_input');
        let input = find_input(this.midi_access, values.midi_input);
        if (!input) {
            console.warn(`Can't find the MIDI input named ${JSON.stringify(values.midi_input)}.`);
            return;
        }

        console.log(`Connecting to ${JSON.stringify(input.name)}.`);
        this.connected = true;
        this.connected_port_id = input.id;
        this.connected_port_name = input.name;
    }

    disconnect() {
        console.log(`Disconnecting from ${JSON.stringify(this.connected_port_name)}.`);
        this.connected = false;
        this.connected_port_id = '';
        this.connected_port_name = '';
    }
}

let connection = null;

navigator.requestMIDIAccess().then(async midi_access => {
    console.log(`got midi: ${midi_access}`);
    log_all_midi_inputs(midi_access);

    connection = new Connection(midi_access);
    await connection.connect();
}).catch(err => { console.error(err); })

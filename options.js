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

let midi_event_row_template = document.getElementById('row_template');
let omni_checkbox = document.getElementById('omni');
const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

async function setup() {
    let midi_access_promise = navigator.requestMIDIAccess();
    let options_promise = get_local_storage(null);
    
    let midi_access = await midi_access_promise;
    let options = await options_promise;

    // Setup the MIDI events.
    await set_local_storage({capturing: false});
    let capture_manager = new CaptureManager(midi_access);
    setup_midi_event('Play', 'play', options, capture_manager);
    setup_midi_event('Pause', 'pause', options, capture_manager);
    setup_midi_event('Previous', 'previous', options, capture_manager);
    setup_midi_event('Next', 'next', options, capture_manager);

    // Setup the omni combo.
    omni_checkbox.checked = options.omni;
    omni_checkbox.addEventListener('change', on_omni_checkbox_change);
}

function note_name(key) {
    let note_index = key % 12;
    let octave = ((key - note_index) / 12) - 1;
    return `${notes[note_index]} ${octave}`;
}

function setup_midi_event(label, name, options, capture_manager) {
    let row = midi_event_row_template.content.cloneNode(true).firstElementChild;

    row.querySelector('label').textContent = label;
    let key = `${name}_event`;

    let option = options[key]
    if (option) {
        set_midi_event_data(row, option);
    }

    let capture_button = row.querySelector('.capture');
    capture_button.addEventListener('click', () => {
        capture_manager.on_capture_clicked(name, capture_button, row);
    });

    midi_event_row_template.parentElement.insertBefore(row, midi_event_row_template);
}

function set_midi_event_data(row, option) {
    row.querySelector('.midi_in').textContent = option.midi_in;
    let event = row.querySelector('.event');
    let number = row.querySelector('.number');
    switch (option.type) {
    case 'note':
        event.textContent = "Note";
        number.textContent = note_name(option.key);
        break;
    case 'cc':
        event.textContent = "CC";
        number.textContent = option.cc;
        break;
    default:
        console.error(`unsupported option: %{option}`);
    }
    row.querySelector('.channel').textContent = option.channel;
}

function on_omni_checkbox_change() {
    console.log(`omni ← ${omni_checkbox.checked}`);
    set_local_storage({omni: omni_checkbox.checked});
}

class CaptureManager {
    constructor(midi_access) {
        this.midi_access = midi_access;
        this.capturing = null;
        // Serialize writes to options for capturing.
        this.options_mutex = new Mutex();
    }

    reset() {
        if (!this.capturing) {
            return;
        }

        this.capturing.button.classList.remove('capturing');
        this.capturing.row.querySelector('.midi_in').textContent = this.capturing.last_midi_in;
        this.capturing.row.querySelector('.event').textContent = this.capturing.last_event;
        this.capturing.row.querySelector('.number').textContent = this.capturing.last_number;
        this.capturing.row.querySelector('.channel').textContent = this.capturing.last_channel;

        for (const input_port of this.capturing.input_ports) {
            input_port.onmidimessage = null;
            input_port.close();
        }

        this.capturing = null;
    }

    async set_options(options) {
        let unlock = await this.options_mutex.lock();
        try {
            await set_local_storage(options);
        } finally {
            unlock();
        }
    }

    on_capture_clicked(name, button, row) {
        if (this.capturing) {
            let cancel = this.capturing.name === name;
            this.reset();
            if (cancel) {
                this.set_options({capturing: false}).catch(console.error); 
                return;
            }
        } else {
            this.set_options({capturing: true}).catch(console.error); 
        }

        const input_ports = Array.from(this.midi_access.inputs.values());
        for (const input_port of input_ports) {
            input_port.onmidimessage = (event) => {
                this.on_midi_message(input_port, event);
            };
        }

        this.capturing = {name, button, row, input_ports};

        button.classList.add('capturing');

        this.capturing.last_midi_in = row.querySelector('.midi_in').textContent;
        row.querySelector('.midi_in').textContent = '?';
        this.capturing.last_event = row.querySelector('.event').textContent;
        row.querySelector('.event').textContent = '?';
        this.capturing.last_number = row.querySelector('.number').textContent;
        row.querySelector('.number').textContent = '?';
        this.capturing.last_channel = row.querySelector('.channel').textContent;
        row.querySelector('.channel').textContent = '?';
    }

    on_midi_message(input_port, event) {
        console.assert(this.capturing);
        if (event.data.length !== 3) {
            return;
        }
        let midi_in = input_port.name;
        let type = event.data[0] & 0xf0;
        let channel = event.data[0] & 0xf;
        let option = null;
        if (type === 0x90 && event.data[2] > 0) {
            option = {
                midi_in,
                type: 'note',
                key: event.data[1],
                channel
            };
        } else if (type === 0xb0) {
            option = {
                midi_in,
                type: 'cc',
                cc: event.data[1],
                channel
            };
        } else {
            console.log(`ignored event: ${event.data} type = ${type}`);
            return;
        }

        let options = {
            capturing: false,
        }
        options[`${this.capturing.name}_event`] = option;

        let row = this.capturing.row;

        this.reset();

        set_midi_event_data(row, option);

        this.set_options(options).catch(console.error);
    }
}

setup().catch(console.error);


// get_local_storage(null)
//     .then((values) => {
//         let midi_in = document.getElementById('midi_in');
//         midi_in.value = values.midi_input;
//         midi_in.addEventListener('input', () => {
//             set_local_storage({midi_input: midi_in.value})
//                 .catch(err => { console.error(err); });
//         });
//     }) .catch(err => { console.error(err); });

// navigator.requestMIDIAccess().then((midi_access) => {
//     console.log(`got midi: ${midi_access}`);
//     log_all_midi_inputs(midi_access);
// });

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

let midi_in_combo = document.getElementById('midi_in');
let midi_in_placeholder = document.getElementById('midi_in_placeholder');

async function setup() {
    let midi_access_promise = navigator.requestMIDIAccess();
    let options_promise = get_local_storage(null);
    
    let midi_access = await midi_access_promise;
    let options = await options_promise;

    for (let input of midi_access.inputs.values()) {
        let option = document.createElement('option');
        option.value = input.name;
        option.textContent = input.name;

        if (input.name === options.midi_input) {
            option.selected = true;
            midi_in_placeholder.selected = false;
        }
        
        midi_in_combo.appendChild(option);
    }

    midi_in_combo.addEventListener('change', on_midi_in_combo_change);
}

function on_midi_in_combo_change() {
    console.log(`midi_input ← ${midi_in_combo.value}`);
    set_local_storage({midi_input: midi_in_combo.value});
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

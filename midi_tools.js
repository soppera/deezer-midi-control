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

function log_all_midi_inputs(midi_access) {
    console.log('inputs:');
    for (let k of midi_access.inputs.keys()) {
        console.log(`  ${k}: ${midi_access.inputs.get(k).name}`);
    }    
}

function find_input_from_id(midi_access, id) {
    for (let input of midi_access.inputs.values()) {
        if (input.id === id) {
            return input;
        }
    }
    return null;
}

function find_input_from_name(midi_access, name) {
    for (let input of midi_access.inputs.values()) {
        if (input.name === name) {
            return input;
        }
    }
    return null;
}



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
console.log(`patching ${window.location} to add Deezer MIDI control`);

navigator.requestMIDIAccess().then(async midi_access => {
    console.log(`got midi: ${midi_access}`);
    log_all_midi_inputs(midi_access);

    let values = await get_local_storage('midi_input');
    console.log(`midi_input: ${values.midi_input}`);

    await set_local_storage({'midi_input': 4});
}).catch(err => { console.error(err); })

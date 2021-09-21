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

async function setup() {
    let [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    let status;
    try {
        status = await tab_send_message(tab.id, {method: 'session_status'});
    } catch (err) {
        console.warn(`can't connect to the script: ${err}`);
        document.body.appendChild(document.createTextNode('not the Deezer tab'));
    }
    if (status) {
        if (status.midi_ins.length > 0) {
            for (const midi_in of status.midi_ins) {
                document.body.appendChild(document.createTextNode(
                    `connected to: ${midi_in}`));
                document.body.appendChild(document.createElement('br'));
            }
        } else {
            document.body.appendChild(document.createTextNode('not connected MIDI'));
        }
    }
}

setup().catch(console.error);


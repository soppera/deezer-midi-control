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

let change_color = document.getElementById('change_color');

chrome.storage.sync.get('color', ({color}) => {
    change_color.style.backgroundColor = color;
});

change_color.addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    chrome.scripting.executeScript({
        target: {tabId: tab.id},
        function: set_page_background_color
    });
});

function set_page_background_color() {
    chrome.storage.sync.get('color', ({color}) => {
        document.body.style.backgroundColor = color;
    });
}

chrome.tabs.query({
    active: true,
    currentWindow: true
})
    .then(async ([tab]) => {
        console.log('here');
        let status = await tab_send_message(tab.id, {method: 'session_status'});
        console.log('there');
        if (status.connected) {
            document.body.appendChild(document.createTextNode('connected'));
        } else {
            document.body.appendChild(document.createTextNode('not connected'));
        }
    })
    .catch((err) => {
        console.warn(`can't connect to the script: ${err}`);
        document.body.appendChild(document.createTextNode('not the Deezer tab'));
    });

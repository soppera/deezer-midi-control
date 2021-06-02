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

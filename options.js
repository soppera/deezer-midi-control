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
let page = document.getElementById('button_div');
let selected_class_name = 'current';
const preset_button_colors = ["#3aa757", "#e8453c", "#f9bb2d", "#4688f1"];

function on_button_click(event) {
    let current =
        event.target.parentElement.querySelector(`.${selected_class_name}`);
    if (current && current !== event.target) {
        current.classList.remove(selected_class_name);
    }
    let color = event.target.dataset.color;
    event.target.classList.add(selected_class_name);
    chrome.storage.sync.set({color});
}

function add_options(button_colors) {
    chrome.storage.sync.get('color', (data) => {
        let current_color = data.color;
        for (let button_color of button_colors) {
            let button = document.createElement('button');
            button.dataset.color = button_color;
            button.style.backgroundColor = button_color;

            if (button_color === current_color) {
                button.classList.add(selected_class_name);
            }

            button.addEventListener('click', on_button_click);
            page.appendChild(button);
        }
    });
}

add_options(preset_button_colors);

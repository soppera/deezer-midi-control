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

// Usage:
//
// let m = new Mutex();
// let m_unlock = await m.lock();
// try {
//   ...
// } finally {
//   m_unlock();
// }
class Mutex {
    constructor() {
        this.ready = Promise.resolve();
    }
    
    async lock() {
        let last_ready = this.ready;
        let unlock;
        this.ready = new Promise(resolve => (unlock = resolve));
        // The caller will wait for the last_ready first before
        // getting the `unlock` function. Next callers of lock() will
        // wait on the new promise and thus chain.
        return last_ready.then(() => unlock);
    }
}

async function wait(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

async function get_local_storage(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(
            'midi_input',
            (values) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(values);
                }
            });
    });
}

async function set_local_storage(values) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(
            values,
            () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
    });
}


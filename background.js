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

let color = '#3aa757';

// Either returns the JSON string of the input or a string explaining
// why it can't be formatted.
function safeString(x) {
    try {
        return JSON.stringify(x);
    } catch (e) {
        return `ERROR(can't convert to JSON: ${e})`;
    }
}

// Returns either `value` if it is boolean or `default_value` (which
// should be boolean).
//
// Input `id` is used in warning/info logs to identify the parameter.
function boolean_or_default(id, value, default_value) {
    if (typeof value !== 'boolean') {
        console.warn(`${id}: ${safeString(value)} is not a boolean`);
        return default_value;
    }
    console.info(`existing ${id}: ${safeString(value)} reused`);
    return value;
}

// Returns either a copy of `value` if it is a valid event, or null.
//
// Input `id` is used in warning/info logs to identify the parameter.
function event_or_null(id, value) {
    if (Array.isArray(value) ||
        typeof value !== 'object') {
        console.warn(`${id}: ${safeString(value)} is not an object`);
        return null;
    }
    if (value === null) {
        console.info(`existing ${id}: ${safeString(value)} reused`);
        return null;
    }
    if (typeof value.midi_in !== 'string') {
        console.warn(`${id}: ${safeString(value)}.midi_in is not a string`);
        return null;
    }
    if (typeof value.type !== 'string') {
        console.warn(`${id}: ${safeString(value)}.type is not a string`);
        return null;
    }
    if (typeof value.channel !== 'number') {
        console.warn(`${id}: ${safeString(value)} is not a number`);
        return null;
    }
    switch (value.type) {
    case 'note':
        if (typeof value.key !== 'number') {
            console.warn(`${id}: ${safeString(value)}.key is not a number`);
            return null;
        }
        console.info(`existing ${id}: ${safeString(value)} reused`);
        return {
            midi_in: value.midi_in,
            type: value.type,
            key: value.key,
            channel: value.channel,
        };
    case 'cc':
        if (typeof value.cc !== 'number') {
            console.warn(`${id}: ${safeString(value)}.cc is not a number`);
            return null;
        }
        console.info(`existing ${id}: ${safeString(value)} reused`);
        return {
            midi_in: value.midi_in,
            type: value.type,
            cc: value.cc,
            channel: value.channel,
        };
    default:
        console.warn(`${id}: ${safeString(value)}.type is neither 'note' nor 'cc'`);
        return null;
    }
}

chrome.runtime.onInstalled.addListener((details) => {
    switch (details.reason) {
    default:
        console.error(`Unknown reason: %{JSON.stringify(details.reason)}; pretending this is "update"`);
        // Intentional fall-through.
    case 'install':
    case 'update':
        chrome.storage.local.get(
            null,
            (items) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                    items = null;
                }
                chrome.storage.local.set({
                    play_event: event_or_null(
                        'play_event', items.play_event),
                    pause_event: event_or_null(
                        'pause_event', items.pause_event),
                    next_event: event_or_null(
                        'next_event', items.next_event),
                    previous_event: event_or_null(
                        'previous_event', items.previous_event),
                    omni: boolean_or_default('omni', items.omni, true),
                    capturing: false,
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError.message);
                    } else {
                        console.log('Default settings installed');
                    }
                });
            });
        break;
    case 'chrome_update':
    case 'shared_module_update':
        break;
    }
});


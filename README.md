# README #

A Chrome extension to control Deezer with a MIDI device.

### Developer Mode Installation ###

* Open chrome://extensions
* Enable _developer mode_ by clicking on the toggle switch.
* Click _load unpacked_ button and select the directory that contains
  the manifest.

The extension should show up in Chrome.

### Packaging ###

To create the Zip file to send to the Chrome webstore:
* Make sure that the `manifest.json` version is updated.
* Make sure a Git tag exists with the same version.
* Run `make package` that will create the package in the root
  directory, suffixed by the version number.

### License ###

Copyright (C) 2021 Stéphane SOPPERA.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or (at
your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see https://www.gnu.org/licenses/.

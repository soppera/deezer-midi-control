#!/usr/bin/env python3

from typing import Sequence
import argparse, zipfile, os, json

_IGNORED_DIRS = set(('.git', '.mypy_cache'))
_IGNORED_FILES = set(('.gitignore',))
_IGNORED_RELATIVE_PATHS = set(('images/icon.svg',
                               './Makefile',
                               './README.md'))
_IGNORED_SUFFIXES = ('.zip', '~')
_MANIFEST_NAME = 'manifest.json'

def is_suffix_ignored(file_name: str) -> bool:
    for ignored in _IGNORED_SUFFIXES:
        if file_name.endswith(ignored):
            return True
    return False

def files_relative_paths(root: str) -> Sequence[str]:
    ret = []
    for dir_path, dir_names, file_names in os.walk(root):
        dir_path_rel = os.path.relpath(dir_path, start=root)
        
        # Filter ignored directories so that next iterations won't
        # pick them. This has to be done in-place.
        dir_names[:] = [d for d in dir_names if d not in _IGNORED_DIRS]

        # Filter file names.
        file_names = [
            f for f in file_names
            if (not is_suffix_ignored(f) and
                not f in _IGNORED_FILES and
                not os.path.join(dir_path_rel, f) in _IGNORED_RELATIVE_PATHS)]
        
        for f in file_names:
            ret.append(os.path.join(dir_path_rel, f))
    return ret

def parse_version(manifest_path) -> str:
    with open(manifest_path, 'rb') as f:
        manifest = json.load(f)
    return manifest['version']

def main():
    parser = argparse.ArgumentParser('Package the extension in a zip.')
    parser.add_argument('root_directory', metavar='ROOT_DIRECTORY',
                        help='root directory of the extension sources')
    parser.add_argument('-o', '--output', default='package-{version}.zip',
                        help='the file to write to; the tag {version} is replaced with the package version')
    parser.add_argument('--no-check-version', dest='check_version',
                        action='store_false',
                        help='disable the check of the package\'s version')
    args = parser.parse_args()

    version = parse_version(os.path.join(args.root_directory, _MANIFEST_NAME))
    zip_file_path = args.output.format(version=version)
    print(f'writing to {zip_file_path}')
    with zipfile.ZipFile(zip_file_path, 'w') as zf:
        for rel_path in files_relative_paths(args.root_directory):
            print(f'adding {rel_path} to the archive')
            zf.write(os.path.join(args.root_directory, rel_path),
                     arcname=rel_path)

if __name__ == '__main__':
    main()

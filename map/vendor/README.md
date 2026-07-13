# Vendored libraries

Local copies of the runtime dependencies of `map_editor.html`, so the editor
works offline. `map_editor.html` loads these first and falls back to cdnjs
when this directory is absent.

| File | Package | Version | Source |
|---|---|---|---|
| `react.production.min.js` | react | 18.2.0 | npm registry, `react/umd/` |
| `react-dom.production.min.js` | react-dom | 18.2.0 | npm registry, `react-dom/umd/` |
| `babel.min.js` | @babel/standalone | 7.23.5 | npm registry |

## Updating

Download the same UMD builds of a newer version from the npm registry (or
cdnjs) and replace the files, keeping the filenames. Update the CDN fallback
URLs in `map_editor.html` to the matching version.

## Licenses

All three packages are distributed under the MIT License.

- React and ReactDOM: Copyright (c) Facebook, Inc. and its affiliates.
  (License banner embedded at the top of each file.)
- @babel/standalone: Copyright (c) 2014-present Sebastian McKenzie and other
  contributors.

MIT License: Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including without
limitation the rights to use, copy, modify, merge, publish, distribute,
sublicense, and/or sell copies of the Software, and to permit persons to whom
the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

# Examples

Small pages that use the library the way an app would. They import from `../src/index.js`
and need no build step or content files. Each example is excluded from the npm package.

To run them, serve the repository root with any static server (modules don't load from `file://`):

```sh
python3 -m http.server 8000
```

Then open:

- [basic-timer](http://localhost:8000/examples/basic-timer/): a short routine run as text, with a countdown
- [single-figure](http://localhost:8000/examples/single-figure/): one stick figure animating, with no timer

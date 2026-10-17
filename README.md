# @cddr/workout-player

Plays a workout routine. It gives you a timer that steps through a routine, a renderer that
draws each exercise's stick figure, and a loader for routine and exercise files. It draws
nothing and plays no audio itself, so a page decides how to show the steps and play the cues.

## Use

```js
import { createLoader, createTimer, figureFrame, figureParts } from "@cddr/workout-player";

const loader = createLoader({ contentBase: "/content" });
const routine = await loader.loadRoutine("7-minute-abs");

const timer = createTimer(routine);
timer.on("step", (step) => console.log(step.state, "-", step.upNext));
timer.on("tick", ({ remaining }) => console.log(remaining));
timer.on("cue", (cue) => console.log(cue.src ?? cue.count));
timer.on("finish", () => console.log("done"));
timer.start();
```

## API

- **`createTimer(routine, options?)`** returns `{ segments, on, start, pause, resume, skip, stop }`.
  `on(event, fn)` subscribes and returns a function that unsubscribes. `skip()` ends the current
  exercise or rest early and moves on to the next step. Skipping an exercise also emits
  `exerciseSkipped`. It does nothing during get ready. The events are `step`, `tick`, `cue`, `exerciseComplete`, `exerciseSkipped`
  and `finish`, documented in `src/timer.js`.
- **`createLoader({ contentBase, contentHeaders })`** returns `loadRoutineList`, `loadRoutine`,
  `fetchJson`, `contentUrl` and `headers`. `contentHeaders()` can return headers for every
  request, for example to unlock protected content.
- **`figureFrame(figure, elapsedMs, now)`** works out the pose for a moment in time.
  **`figureParts(pose, yaw)`** and **`figureMarkup(pose, yaw)`** draw it as SVG.
- **`cuePaths`** gives the content paths for the spoken cues.

## Content format

Routines, exercises and figures are JSON files. See [docs/exercise-format.md](docs/exercise-format.md).

## Examples

The [examples](examples/) show the library on its own: a timer printing its events, and a
single figure animating. They're not part of the npm package.

## Tests

```sh
npm test
```

## Licence

MIT. See [LICENSE](LICENSE).

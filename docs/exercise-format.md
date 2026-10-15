# Exercise and routine format

A routine is a list of exercises. Each exercise is a small JSON file with its
name, spoken clip and, optionally, a stick figure.

```
routines.json             the workouts shown on the home page
routines/<id>.json        one routine: its exercises, in order
exercises/<id>.json       one exercise: name, clip, figure
audio/<clip>.m4a          spoken clips (AAC), made by tools/make-audio.sh from audio-src/
```

## Routine (`routines/<id>.json`)

| Key | Required | Notes |
| --- | --- | --- |
| `name` | yes | Shown at the top of the timer |
| `getReadyTime` | yes | Seconds of "get ready" before the first exercise |
| `countdownBeep` | yes | Seconds of 3-2-1 countdown before each later exercise |
| `defaultRest` | no | Rest after each exercise, in seconds. Defaults to 15 |
| `exercises` | yes | Ordered list. Each item is an exercise id, or an object (below) |

An entry in `exercises` can be a plain id:

```json
"exercises": ["plank", "glute-bridge"]
```

or an object that overrides the timing for this routine only:

```json
{ "id": "plank", "duration": 30, "rest": 10 }
```

If `duration` is missing, the exercise's own `duration` is used. If `rest` is
missing, `defaultRest` is used. The last exercise has no rest after it.

Add the routine to `routines.json` to show it on the home page:

```json
{ "id": "desk-break", "name": "5 Minute Desk Break" }
```

## Exercise (`exercises/<id>.json`)

| Key | Required | Notes |
| --- | --- | --- |
| `name` | yes | Shown on the timer and in the routine list |
| `audio` | yes | Path to the spoken clip, for example `audio/plank.m4a` |
| `say` | no | The phrase to speak when generating the clip. Defaults to `name` |
| `duration` | no | Default duration in seconds, used when a routine doesn't set one |
| `figure` | no | The stick figure. Without one, the exercise has no figure |

## Figure (`exercise.figure`)

A figure is a set of poses. The timer moves from one pose to the next.

| Key | Type | Notes |
| --- | --- | --- |
| `a` | pose | The first pose. Also used for the thumbnail, so it should show the exercise clearly |
| `b` | pose | The second pose. Used with `a` for a back-and-forth movement |
| `path` | list of poses | A loop through several poses, joined by a smooth curve. Use instead of `a` and `b` |
| `turn` | list of degrees | A view turn for each pose, in the same order as `path` (or `[a, b]`). Use for a twist or a head tilt that needs a different angle |
| `yawOffset` | degrees | A fixed turn for the whole exercise. Applied on top of the sway |

A figure needs either `a` and `b`, or `path`. If `path` is given, it's used and
`a` and `b` are ignored, except that `a` is still used for the thumbnail.

Turns are in degrees in the file. The loader converts them to radians.

## Pose (`figure.a`, `figure.b`, and each item in `path`)

A pose maps joint names to `[x, y, z]`:

- **x** and **y** are positions on a 200×200 canvas. The floor is at `y = 192`.
- **z** is depth. Positive values are nearer the viewer. Depth shows as shading, and it
  decides how a figure looks when it's turned.

Give every pose `head`, `sh`, `hip`, `kn` and `an`. The renderer skips any part whose
joints are missing, so a pose without them loses that part of the figure. Leave out the
optional joints you don't need. If a pose has no joint that another pose has, it stays
where it is.

### Joints

| Joint | Used for | Notes |
| --- | --- | --- |
| `head` | Head circle | Its centre is the joint |
| `sh` | Shoulder | The top of the spine. Arms start here unless `sh1` or `sh2` are given |
| `sh1`, `sh2` | Separate shoulder points for each arm | Optional. A shoulder line joins them |
| `sc` | Spine control point | Optional. Curves the spine from `sh` to `hip`, so it can arch or round |
| `nk` | Neck point, at the bottom of the head | Optional. Draws a neck from `sh` to `nk` |
| `hm` | Head mark | Optional. A thin line through the head, pointing toward `hm` |
| `hip` | Hip | Also drawn as the small pink dot. Keeps the base viewing angle (see below) |
| `el`, `ha` | First arm: elbow and hand | Without `wr`, the arm is elbow to hand |
| `wr` | First wrist | Optional. Lets the hand bend without tilting the forearm |
| `el2`, `ha2` | Second arm: elbow and hand | As above |
| `wr2` | Second wrist | Optional |
| `kn`, `an` | First leg: knee and ankle | `an` should be on the floor (`y = 192`) for a standing or seated pose |
| `kn2`, `an2` | Second leg: knee and ankle | As above |

Limbs are named for one side (`el`, `ha`, `kn`, `an`) and the other side (`el2`,
`ha2`, `kn2`, `an2`).

### How the joints are used

- The spine is a straight line from `sh` to `hip`, or a curve through `sc` if it's given.
- Each arm is drawn from its shoulder, through the elbow, then `wr` if present, then the hand.
- The legs are drawn from `hip` through the knee to the ankle.
- The head is drawn at `head`. If `hm` is given, a mark runs through the centre toward `hm`.
- `hip`, `kn`, `an`, `kn2` and `an2` keep the base viewing angle, even when the upper
  body turns (see `turn`). That's how a twist can show the chest turning while the seat
  stays still.

## Writing a new figure

1. Start from a similar exercise and copy its file.
2. Set `head`, `sh`, `hip`, `kn` and `an` first. Get the body roughly right with straight lines.
3. Add the arms (`el`, `ha`, and their `2` versions), then `sc` for the spine if it needs a curve.
4. Add `wr` and `wr2`, `nk` and `hm`, only if the pose needs them.
5. Check the figure in a local page (see `examples/single-figure`) and look at the animation.
6. Generate the spoken clip with the content tools, then add the exercise to a routine.

## Renderer notes

- **Running locally:** the pages load JSON with `fetch`, so they must be served over
  http, not opened as files. A static server such as `python3 -m http.server` will do.
- **Timing:** a two-pose figure (`a` and `b`) goes back and forth over 2.4 seconds, with an
  ease in and out at each pose. A `path` moves through each pose in 1.2 seconds, along a
  smooth curve that passes through every pose and loops back to the first.
- **Camera:** every figure sways gently around a 25° view angle. The sway is about ±11°
  and repeats every 9 seconds.
- **Depth:** joints nearer the viewer are drawn darker, and farther ones lighter. The head
  grows slightly when it's nearer.
- **Accent:** the hip dot takes the page's `--accent` colour. The engine sets it to the text colour. A site sets its own in its stylesheet.

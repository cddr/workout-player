// Runs the timer with a fake clock, so each second is one call to tick()
import { test } from "node:test";
import assert from "node:assert/strict";
import { createTimer, cuePaths } from "../src/index.js";

// A clock that only moves when the test says so
function fakeClock() {
  let fn = null;
  return {
    setInterval(f) { fn = f; return 1; },
    clearInterval() { fn = null; },
    advance(times) {
      for (let i = 0; i < times && fn; i++) fn();
    },
    get running() { return fn !== null; },
  };
}

const routine = {
  getReadyTime: 1,
  countdownBeep: 1,
  workout: [
    { id: "a", name: "A", duration: 4, rest: 1, audio: "audio/a.m4a" },
    { id: "b", name: "B", duration: 1, rest: 1, audio: "audio/b.m4a" },
  ],
};

function record(timer) {
  const events = [];
  for (const type of ["step", "tick", "cue", "exerciseComplete", "exerciseSkipped", "finish"]) {
    timer.on(type, (detail) => events.push({ type, ...detail }));
  }
  return events;
}

test("builds get ready, each exercise, and a rest between them", () => {
  const timer = createTimer(routine, { clock: fakeClock() });
  assert.deepEqual(timer.segments.map((s) => s.state), ["GET READY", "A", "REST", "B"]);
});

test("emits the cues in order, with the halfway encouragement and countdown numbers", () => {
  const clock = fakeClock();
  const timer = createTimer(routine, { clock });
  const events = record(timer);
  timer.start();
  clock.advance(20);

  const cues = events.filter((e) => e.type === "cue").map((e) => e.src ?? `count ${e.count}`);
  assert.deepEqual(cues, [
    cuePaths.getReady,
    "count 1",
    "audio/a.m4a",
    cuePaths.encourage(0),
    "count 1",
    cuePaths.rest,
    "count 1",
    "audio/b.m4a",
    "count 1",
  ]);
});

test("reports each exercise as it completes, then finishes once and stops the clock", () => {
  const clock = fakeClock();
  const timer = createTimer(routine, { clock });
  const events = record(timer);
  timer.start();
  clock.advance(20);

  const completed = events.filter((e) => e.type === "exerciseComplete").map((e) => e.exercise);
  assert.deepEqual(completed, ["a", "b"]);
  assert.equal(events.filter((e) => e.type === "finish").length, 1);
  assert.equal(events.at(-1).type, "finish");
  assert.equal(clock.running, false);
});

test("steps carry the state, what's next, and the figure for the page to draw", () => {
  const clock = fakeClock();
  const timer = createTimer(routine, { clock });
  const steps = [];
  timer.on("step", (s) => steps.push(s));
  timer.start();
  clock.advance(20);

  assert.deepEqual(steps.map((s) => s.state), ["GET READY", "A", "REST", "B"]);
  assert.equal(steps[0].upNext, "First: A");
  assert.equal(steps[1].exercise, "a");
  assert.equal(steps[2].exercise, null);
});

test("pause stops the clock and resume starts it again", () => {
  const clock = fakeClock();
  const timer = createTimer(routine, { clock });
  const events = record(timer);
  timer.start();
  clock.advance(1);
  timer.pause();
  assert.equal(clock.running, false);
  const before = events.length;
  clock.advance(5);
  assert.equal(events.length, before, "nothing happens while paused");
  timer.resume();
  assert.equal(clock.running, true);
});

test("skip ends the current exercise early, reports it as skipped, and moves to its rest", () => {
  const clock = fakeClock();
  const timer = createTimer(routine, { clock });
  const events = record(timer);
  timer.start();
  clock.advance(1); // get ready is over, so exercise A starts
  timer.skip();
  const skipped = events.filter((e) => e.type === "exerciseSkipped");
  assert.deepEqual(skipped.map((e) => e.exercise), ["a"]);
  assert.equal(events.some((e) => e.type === "exerciseComplete"), false, "a skip is not a completion");
  const steps = events.filter((e) => e.type === "step");
  assert.equal(steps.at(-1).state, "REST");
});

test("skip does nothing during get ready", () => {
  const clock = fakeClock();
  const timer = createTimer(routine, { clock });
  const events = record(timer);
  timer.start();
  timer.skip();
  assert.equal(events.filter((e) => e.type === "exerciseSkipped").length, 0);
  assert.equal(events.filter((e) => e.type === "step").at(-1).state, "GET READY");
});

test("skip ends a rest early and starts the next exercise, without reporting it as skipped", () => {
  const clock = fakeClock();
  const timer = createTimer(routine, { clock });
  const events = record(timer);
  timer.start();
  clock.advance(1); // exercise A
  clock.advance(4); // A ends -> rest
  assert.equal(events.filter((e) => e.type === "step").at(-1).state, "REST");
  timer.skip();
  assert.equal(events.filter((e) => e.type === "step").at(-1).state, "B");
  assert.equal(events.filter((e) => e.type === "exerciseSkipped").length, 0);
});

test("skipping the last exercise finishes the workout", () => {
  const clock = fakeClock();
  const timer = createTimer(routine, { clock });
  const events = record(timer);
  timer.start();
  clock.advance(1); // get ready -> A
  clock.advance(5); // A ends -> rest -> B starts
  assert.equal(events.filter((e) => e.type === "step").at(-1).state, "B");
  timer.skip();
  assert.deepEqual(events.filter((e) => e.type === "exerciseSkipped").map((e) => e.exercise), ["b"]);
  assert.equal(events.at(-1).type, "finish");
  assert.equal(clock.running, false);
});

test("skip does nothing before the timer starts", () => {
  const timer = createTimer(routine, { clock: fakeClock() });
  const events = record(timer);
  timer.skip();
  assert.equal(events.length, 0);
});

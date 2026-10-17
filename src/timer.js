// A workout timer. It works out the steps of a routine and counts through them once a
// second. It draws nothing and plays nothing: it emits events, and the page decides how
// to show them and which audio to play.
//
// Events:
//   step              a new step starts: { index, total, state, upNext, seconds, figure, exercise }
//   tick              once a second, and when a step starts: { remaining }
//   cue               something to say: { src } for a clip, or { count } for a countdown number
//   exerciseComplete  an exercise has finished: { exercise }
//   exerciseSkipped   an exercise was skipped before it finished: { exercise }
//   finish            the last step has finished

import { cuePaths } from "./content.js";

// Flattens a routine into its steps: get ready, then each exercise, with a rest between them
export function buildSegments(routine) {
  const { workout, getReadyTime, countdownBeep } = routine;
  const segs = [{
    state: "GET READY",
    seconds: getReadyTime,
    upNext: `First: ${workout[0].name}`,
    say: cuePaths.getReady,
    beeps: countdownBeep,
  }];
  workout.forEach((ex, i) => {
    segs.push({
      state: ex.name,
      seconds: ex.duration,
      upNext: `Exercise ${i + 1} of ${workout.length}`,
      say: ex.audio,
      beeps: countdownBeep,
      halfway: Math.floor(ex.duration / 2) > countdownBeep ? Math.floor(ex.duration / 2) : null,
      encourage: cuePaths.encourage(i),
      figure: ex.figure,
      exercise: ex.id,
    });
    if (i < workout.length - 1) {
      segs.push({
        state: "REST",
        seconds: ex.rest,
        upNext: `Next: ${workout[i + 1].name}`,
        say: cuePaths.rest,
        beeps: countdownBeep,
      });
    }
  });
  return segs;
}

export function createTimer(routine, { tickMs = 1000, clock = globalThis } = {}) {
  const segments = buildSegments(routine);
  const listeners = new Map();
  let index = 0;
  let remaining = 0;
  let active = false;
  let handle = null;

  function emit(type, detail = {}) {
    for (const fn of listeners.get(type) ?? []) fn(detail);
  }

  function on(type, fn) {
    listeners.set(type, [...(listeners.get(type) ?? []), fn]);
    return () => listeners.set(type, listeners.get(type).filter((f) => f !== fn));
  }

  function startInterval() {
    handle = clock.setInterval(tick, tickMs);
  }

  function stopInterval() {
    clock.clearInterval(handle);
    handle = null;
  }

  function enter() {
    const s = segments[index];
    remaining = s.seconds;
    emit("step", {
      index,
      total: segments.length,
      state: s.state,
      upNext: s.upNext,
      seconds: s.seconds,
      figure: s.figure ?? null,
      exercise: s.exercise ?? null,
    });
    if (s.say) emit("cue", { src: s.say });
    showRemaining();
  }

  function showRemaining() {
    const s = segments[index];
    emit("tick", { remaining });
    if (s.beeps && remaining <= s.beeps) emit("cue", { count: remaining });
  }

  function tick() {
    remaining--;
    const s = segments[index];
    if (s.halfway && remaining === s.halfway) emit("cue", { src: s.encourage });
    if (remaining > 0) {
      showRemaining();
      return;
    }
    if (s.exercise) emit("exerciseComplete", { exercise: s.exercise });
    nextStep();
  }

  // Moves to the next step, or finishes after the last one
  function nextStep() {
    index++;
    if (index >= segments.length) {
      stop();
      emit("finish");
      return;
    }
    enter();
  }

  // Ends the current step early and moves on to the next one. An exercise also emits exerciseSkipped.
  // Nothing happens when the timer isn't running.
  function skip() {
    const s = segments[index];
    if (!active) return;
    if (s.exercise) emit("exerciseSkipped", { exercise: s.exercise });
    nextStep();
  }

  function start() {
    stop();
    active = true;
    index = 0;
    enter();
    startInterval();
  }

  function pause() {
    if (!handle) return;
    stopInterval();
  }

  function resume() {
    if (!active || handle) return;
    startInterval();
  }

  function stop() {
    stopInterval();
    active = false;
  }

  return { segments, on, start, pause, resume, skip, stop };
}

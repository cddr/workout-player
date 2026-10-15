// Where the spoken cues live in the content. Each name is a clip under audio/, made by
// the content tools. A site can use its own clips by passing its own paths to the timer.
export const cuePaths = {
  getReady: "audio/get-ready.m4a",
  rest: "audio/rest.m4a",
  done: "audio/workout-complete.m4a",
  count: (n) => `audio/${n}.m4a`,
  // Halfway-through encouragement. Rotates through the five clips by exercise.
  encourage: (n) => `audio/encourage-${(n % 5) + 1}.m4a`,
};

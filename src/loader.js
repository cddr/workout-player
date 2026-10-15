// Loads routines, exercises and their figures. The caller says where the content is and
// what extra headers to send with each request, for example to unlock protected content.

export function createLoader({ contentBase = "", contentHeaders = () => ({}) } = {}) {
  function contentUrl(path) {
    return contentBase && !contentBase.endsWith("/") ? `${contentBase}/${path}` : contentBase + path;
  }

  function headers() {
    return contentHeaders();
  }

  async function fetchJson(path) {
    const res = await fetch(contentUrl(path), { headers: headers() });
    if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
    return res.json();
  }

  async function loadRoutineList() {
    return fetchJson("routines.json");
  }

  // Returns the routine with its exercises in order, as `workout`. Figure angles are
  // converted from degrees to radians here, so the renderer works in radians throughout.
  async function loadRoutine(id) {
    const routine = await fetchJson(`routines/${id}.json`);
    const exercises = await Promise.all(
      routine.exercises.map((entry) => {
        const { id, duration, rest } = typeof entry === "string" ? { id: entry } : entry;
        return fetchJson(`exercises/${id}.json`).then((ex) => ({
          id,
          ...ex,
          duration: duration ?? ex.duration,
          rest: rest ?? routine.defaultRest ?? 15,
        }));
      })
    );
    for (const ex of exercises) {
      if (ex.figure) {
        ex.figure.yawOffset = ((ex.figure.yawOffset || 0) * Math.PI) / 180;
        if (ex.figure.turn) ex.figure.turn = ex.figure.turn.map((d) => (d * Math.PI) / 180);
      }
    }
    return { ...routine, workout: exercises };
  }

  return { contentUrl, headers, fetchJson, loadRoutineList, loadRoutine };
}

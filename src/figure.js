// The stick-figure renderer. It works out a pose at a moment in time and draws it as SVG
// markup. It has no DOM or audio dependencies, so it runs in a browser or in Node.

const figureCycleMs = 2400;
const figureStepMs = figureCycleMs / 2;

export const viewYaw = 25 * Math.PI / 180;
const swayRad = 0.2;
const swayMs = 9000;

function currentYaw(now) {
  return viewYaw + swayRad * Math.sin((2 * Math.PI * now) / swayMs);
}

function catmullRom(p0, p1, p2, p3, u) {
  const u2 = u * u, u3 = u2 * u;
  return 0.5 * (2 * p1 + (-p0 + p2) * u
    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2
    + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
}

function pathPose(poses, i, u) {
  const n = poses.length;
  const at = (k) => poses[((k % n) + n) % n];
  const pose = {};
  const joints = new Set(poses.flatMap((p) => Object.keys(p)));
  for (const j of joints) {
    const fallback = poses.find((p) => p[j])[j];
    const pts = [i - 1, i, i + 1, i + 2].map((k) => at(k)[j] || fallback);
    pose[j] = [0, 1, 2].map((c) => catmullRom(
      pts[0][c] || 0, pts[1][c] || 0, pts[2][c] || 0, pts[3][c] || 0, u));
  }
  return pose;
}

export function figureFrame(figure, elapsed, now) {
  const poses = figure.path || [figure.a, figure.b];
  const turns = figure.turn || poses.map(() => 0);
  const n = poses.length;
  const step = (elapsed / figureStepMs) % n;
  const i = Math.floor(step);
  const j = (i + 1) % n;
  const base = currentYaw(now) + (figure.yawOffset || 0);
  const yawFor = (turn) => ({ upper: base + turn, lower: base });
  if (figure.path) {
    const u = step - i;
    const at = (k) => turns[((k % n) + n) % n];
    const turn = catmullRom(at(i - 1), at(i), at(i + 1), at(i + 2), u);
    return {
      pose: pathPose(poses, i, u),
      yaw: yawFor(turn),
    };
  }
  const t = 0.5 - 0.5 * Math.cos(Math.PI * (step - i));
  const turn = turns[i] + (turns[j] - turns[i]) * t;
  return {
    pose: lerpPose(poses[i], poses[j], t),
    yaw: yawFor(turn),
  };
}

function lerpPose(a, b, t) {
  const pose = {};
  const joints = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const j of joints) {
    const pa = a[j] || b[j];
    const pb = b[j] || a[j];
    const [ax, ay, az = 0] = pa;
    const [bx, by, bz = 0] = pb;
    pose[j] = [ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t];
  }
  return pose;
}

const lowerBodyJoints = new Set(["hip", "kn", "an", "kn2", "an2"]);

function projectPose(p, yaw) {
  const { upper, lower } = typeof yaw === "number" ? { upper: yaw, lower: yaw } : yaw;
  const points = {}, depth = {};
  for (const j in p) {
    const a = lowerBodyJoints.has(j) ? lower : upper;
    const c = Math.cos(a), s = Math.sin(a);
    const x = p[j][0] - 100;
    const z = p[j][2] || 0;
    points[j] = [100 + x * c + z * s, p[j][1]];
    depth[j] = z * c - x * s;
  }
  return { points, depth };
}

export function figureParts(p, yaw = viewYaw) {
  const { points: q, depth } = projectPose(p, yaw);
  const fade = (d) => (0.35 + 0.65 * Math.min(1, Math.max(0, (d + 30) / 60))).toFixed(2);
  const avgDepth = (...joints) => joints.reduce((sum, j) => sum + depth[j], 0) / joints.length;
  const line = (...joints) => joints.every((j) => q[j])
    ? `<polyline points="${joints.map((j) => q[j].join(",")).join(" ")}" stroke-opacity="${fade(avgDepth(...joints))}"/>`
    : "";
  const s1 = q.sh1 ? "sh1" : "sh";
  const s2 = q.sh2 ? "sh2" : "sh";
  const spine = q.sc && q.sh && q.hip
    ? `<path d="M${q.sh.join(",")} Q${q.sc.join(",")} ${q.hip.join(",")}" stroke-opacity="${fade(avgDepth("sh", "hip"))}"/>`
    : line("sh", "hip");
  const headRadius = 11 * (1 + 0.1 * Math.min(1, Math.max(-1, depth.head / 30)));
  let headMark = "";
  if (q.hm && q.head) {
    const dx = q.hm[0] - q.head[0], dy = q.hm[1] - q.head[1];
    const k = (0.8 * headRadius) / (Math.hypot(dx, dy) || 1);
    const [x, y] = [dx * k, dy * k];
    headMark = `<line x1="${(q.head[0] - x).toFixed(2)}" y1="${(q.head[1] - y).toFixed(2)}" x2="${(q.head[0] + x).toFixed(2)}" y2="${(q.head[1] + y).toFixed(2)}" stroke-width="1.5" stroke-opacity="${fade(depth.head)}"/>`;
  }
  return `<line x1="10" y1="192" x2="190" y2="192" stroke-width="3" opacity="0.3"/>`
    + (q.head ? `<circle cx="${q.head[0]}" cy="${q.head[1]}" r="${headRadius.toFixed(1)}" stroke-opacity="${fade(depth.head)}"/>` : "")
    + headMark
    + (q.nk ? line("sh", "nk") : "")
    + spine
    + (q.hip ? `<circle cx="${q.hip[0]}" cy="${q.hip[1]}" r="5.5" style="fill:var(--accent);stroke:none"/>` : "")
    + line("sh1", "sh2")
    + line("hip", "kn", "an") + line("hip", "kn2", "an2")
    + (q.wr ? line(s1, "el", "wr", "ha") : line(s1, "el", "ha"))
    + (q.wr2 ? line(s2, "el2", "wr2", "ha2") : line(s2, "el2", "ha2"));
}

export function figureMarkup(p, yaw = viewYaw) {
  return `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor"
      stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${figureParts(p, yaw)}</svg>`;
}

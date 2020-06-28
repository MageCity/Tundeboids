// Size of canvas. These get updated to fill the whole browser.
let width = 600;
let height = 600;

// Boids variables:
const numBoids = 15;
let coherence = 0.005; // 0 to .01
let separation = 0.05; // 0 to .1
let alignment = 0.05; // 0 to .1
let visualRange = 50; // 0 to 200
const speedLimit = 3;

// Music variables
const minNote = -38;
const maxNote = 24;
const minVolume = -45;
const maxVolume = -15;

let mode = "pentatonic"
var boids = [];

function mod(x, n) {
    return ((x%n)+n)%n;
};

function initBoids() {
  for (var i = 0; i < numBoids; i += 1) {
    boids[i] = {
      x: Math.random() * width,
      y: Math.random() * height,
      dx: Math.random() * 10 - 5,
      dy: Math.random() * 10 - 5,
      history: [],
      osc: new Tone.Oscillator(440, "sine1").toMaster()
    };
    boids[i].osc.frequency.value = calculateFrequency(boids[i].x)
    boids[i].osc.volume.value = calculateVolume(boids[i].y)
    boids[i].osc.start()
  }
}

function distance(boid1, boid2) {
  return Math.sqrt(
    (boid1.x - boid2.x) * (boid1.x - boid2.x) +
      (boid1.y - boid2.y) * (boid1.y - boid2.y),
  );
}

// TODO: This is naive and inefficient.
function nClosestBoids(boid, n) {
  // Make a copy
  const sorted = boids.slice();
  // Sort the copy by distance from `boid`
  sorted.sort((a, b) => distance(boid, a) - distance(boid, b));
  // Return the `n` closest
  return sorted.slice(1, n + 1);
}

// Called initially and whenever the window resizes to update the canvas
// size and width/height variables.
function sizeCanvas() {
  const canvas = document.getElementById("boids");
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
}

// Constrain a boid to within the window. If it gets too close to an edge,
// nudge it back in and reverse its direction.
function keepWithinBounds(boid) {
  const margin = 100;
  const turnFactor = .5;

  if (boid.x < margin) {
    boid.dx += turnFactor;
  }
  if (boid.x > width - margin) {
    boid.dx -= turnFactor
  }
  if (boid.y < margin) {
    boid.dy += turnFactor;
  }
  if (boid.y > height - margin) {
    boid.dy -= turnFactor;
  }
}

// Find the center of mass of the other boids and adjust velocity slightly to
// point towards the center of mass.
function flyTowardsCenter(boid) {

  let centerX = 0;
  let centerY = 0;
  let numNeighbors = 0;

  for (let otherBoid of boids) {
    if (distance(boid, otherBoid) < visualRange) {
      centerX += otherBoid.x;
      centerY += otherBoid.y;
      numNeighbors += 1;
    }
  }

  if (numNeighbors) {
    centerX = centerX / numNeighbors;
    centerY = centerY / numNeighbors;

    boid.dx += (centerX - boid.x) * coherence;
    boid.dy += (centerY - boid.y) * coherence;
  }
}

// Move away from other boids that are too close to avoid colliding
function avoidOthers(boid) {
  const minDistance = 20; // The distance to stay away from other boids
  let moveX = 0;
  let moveY = 0;
  for (let otherBoid of boids) {
    if (otherBoid !== boid) {
      if (distance(boid, otherBoid) < minDistance) {
        moveX += boid.x - otherBoid.x;
        moveY += boid.y - otherBoid.y;
      }
    }
  }

  boid.dx += moveX * separation;
  boid.dy += moveY * separation;
}

// Find the average velocity (speed and direction) of the other boids and
// adjust velocity slightly to match.
function matchVelocity(boid) {
  let avgDX = 0;
  let avgDY = 0;
  let numNeighbors = 0;

  for (let otherBoid of boids) {
    if (distance(boid, otherBoid) < visualRange) {
      avgDX += otherBoid.dx;
      avgDY += otherBoid.dy;
      numNeighbors += 1;
    }
  }

  if (numNeighbors) {
    avgDX = avgDX / numNeighbors;
    avgDY = avgDY / numNeighbors;

    boid.dx += (avgDX - boid.dx) * alignment;
    boid.dy += (avgDY - boid.dy) * alignment;
  }
}

// Speed will naturally vary in flocking behavior, but real animals can't go
// arbitrarily fast.
function limitSpeed(boid) {

  const speed = Math.sqrt(boid.dx * boid.dx + boid.dy * boid.dy);
  if (speed > speedLimit) {
    boid.dx = (boid.dx / speed) * speedLimit;
    boid.dy = (boid.dy / speed) * speedLimit;
  }
}

const DRAW_TRAIL = false;

function drawBoid(ctx, boid) {
  const angle = Math.atan2(boid.dy, boid.dx);
  ctx.translate(boid.x, boid.y);
  ctx.rotate(angle);
  ctx.translate(-boid.x, -boid.y);
  ctx.fillStyle = "#5fb";
  ctx.beginPath();
  ctx.moveTo(boid.x, boid.y);
  ctx.lineTo(boid.x - 15, boid.y + 5);
  ctx.lineTo(boid.x - 15, boid.y - 5);
  ctx.lineTo(boid.x, boid.y);
  ctx.fill();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  if (DRAW_TRAIL) {
    ctx.strokeStyle = "#558cf466";
    ctx.beginPath();
    ctx.moveTo(boid.history[0][0], boid.history[0][1]);
    for (const point of boid.history) {
      ctx.lineTo(point[0], point[1]);
    }
    ctx.stroke();
  }
}

function updateTone(boid) {
  boid.osc.frequency.value = calculateFrequency(boid.x)
  boid.osc.volume.value = calculateVolume(boid.y)
}

// Main animation loop
function animationLoop() {
  // Update each boid
  for (let boid of boids) {
    // Update the velocities according to each rule
    flyTowardsCenter(boid);
    avoidOthers(boid);
    matchVelocity(boid);
    limitSpeed(boid);
    keepWithinBounds(boid);

    // Update the position based on the current velocity
    boid.x += boid.dx;
    boid.y += boid.dy;
    boid.history.push([boid.x, boid.y])
    boid.history = boid.history.slice(-50);
  }

  // Clear the canvas and redraw all the boids in their current positions
  const ctx = document.getElementById("boids").getContext("2d");
  ctx.clearRect(0, 0, width, height);
  for (let boid of boids) {
    drawBoid(ctx, boid);
    updateTone(boid);
  }

  // Schedule the next frame
  animId = window.requestAnimationFrame(animationLoop);
}

modes = {
  "diatonic": [0, 2, 4, 5, 7, 9, 11],
  "pentatonic": [0, 2, 4, 7, 9],
  "wholetone": [0, 2, 4, 6, 8, 10],
  "diminished": [0, 3, 6, 9],
  "augmented": [0, 4, 8],
  "major": [0, 4, 7],
  "minor": [0, 3, 7],
}
function calculateFrequency(x) {
  pitchDiff = x * (maxNote - minNote) / width + minNote;
  if (mode==="chromatic") {
    pitchDiff = Math.round(pitchDiff)
  }
  else if (mode !== "smooth") {
    pitchDiff = Math.round(pitchDiff)
    while(!modes[mode].includes(mod(pitchDiff, 12))) {
      pitchDiff++
    }
  }
  return 440 * Math.pow(1.059463094359, pitchDiff)
}

function calculateVolume(x) {
  return x * (maxVolume - minVolume) / height + minVolume;
}

async function start() {
  await Tone.start()
  if (boids.length > 0) {
    boids.forEach(boid => boid.osc.stop())
    window.cancelAnimationFrame(animId)
  }
  isPaused = false;
  // Make sure the canvas always fills the whole window
  window.addEventListener("resize", sizeCanvas, false);
  sizeCanvas();

  // Randomly distribute the boids to start
  initBoids();

  // Schedule the main animation loop
  animId = window.requestAnimationFrame(animationLoop);
};

isPaused = false
function pause() {
  if(isPaused) {
    return unpause()
  }
  boids.forEach(boid => boid.osc.stop())
  window.cancelAnimationFrame(animId)
  isPaused = true
}

function unpause() {
  boids.forEach(boid => boid.osc.start())
  animId = window.requestAnimationFrame(animationLoop)
  isPaused = false
}

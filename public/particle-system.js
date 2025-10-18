/*
 * Particle System for ImproterAI Pose Detection
 * Optimized for performance with configurable limits and pooling
 */

// HSV to RGB conversion for dynamic colors
function hsv2rgb(h, s, v) {
  let c = v * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = v - c,
    r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  return `rgb(${r},${g},${b})`;
}

// Optimized Particle class with Perlin noise movement
class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.size = 0;
    this.active = false;
    this.noiseOffsetX = 0;
    this.noiseOffsetY = 0;
    this.noiseScale = 0.01;
    this.noiseStrength = 0.5;
  }

  init(x, y, vx, vy, size) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = 1;
    this.size = size;
    this.active = true;

    // Initialize Perlin noise offsets with random values
    this.noiseOffsetX = random(1000);
    this.noiseOffsetY = random(1000);

    // Randomize noise parameters for variety
    this.noiseScale = random(0.005, 0.02);
    this.noiseStrength = random(0.3, 1.0);
  }

  update() {
    if (!this.active) return;

    // Apply Perlin noise to create organic movement
    const noiseX = noise(this.noiseOffsetX) - 0.5;
    const noiseY = noise(this.noiseOffsetY) - 0.5;

    // Update noise offsets for next frame
    this.noiseOffsetX += this.noiseScale;
    this.noiseOffsetY += this.noiseScale;

    // Apply noise force to velocity
    this.vx += noiseX * this.noiseStrength;
    this.vy += noiseY * this.noiseStrength;

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Apply friction (slower for longer trails)
    this.vx *= 0.995;
    this.vy *= 0.995;

    // Decay life (much slower for painting effect)
    this.life -= 0.003;

    if (this.life <= 0) {
      this.active = false;
    }
  }

  draw() {
    if (!this.active) return;

    push();
    noStroke();

    // Add some transparency based on life
    const alpha = this.life * 255;
    fill(red(this.color), green(this.color), blue(this.color), alpha);

    circle(this.x, this.y, this.size * this.life);
    pop();
  }
}

// Optimized Particle Emitter with burst emission
class ParticleEmitter {
  constructor(color, maxParticles = 200) {
    this.color = color;
    this.maxParticles = maxParticles;
    this.particles = [];
    this.particlePool = [];
    this.baseSize = 3; // Default particle size

    // Burst emission properties for painting effect
    this.lastEmissionTime = 0;
    this.emissionInterval = 100; // Much more frequent emission for painting
    this.burstSize = 3; // Fewer particles per burst for smoother painting
    this.minParticlesForNewBurst = 1; // Emit more frequently

    // Pre-create particle pool
    for (let i = 0; i < maxParticles; i++) {
      this.particlePool.push(new Particle());
    }
  }

  getParticle() {
    // Find inactive particle from pool
    for (let particle of this.particlePool) {
      if (!particle.active) {
        return particle;
      }
    }
    // If no inactive particles, remove oldest active particle
    if (this.particles.length > 0) {
      const oldestParticle = this.particles.shift();
      oldestParticle.active = false;
      return oldestParticle;
    }
    return null;
  }

  emit(x, y, intensity = 1) {
    const currentTime = millis();
    const activeParticleCount = this.particles.filter((p) => p.active).length;

    // Check if we should emit a new burst
    const timeSinceLastEmission = currentTime - this.lastEmissionTime;
    const shouldEmit =
      timeSinceLastEmission > this.emissionInterval ||
      activeParticleCount <= this.minParticlesForNewBurst;

    if (shouldEmit) {
      this.emitBurst(x, y, intensity);
      this.lastEmissionTime = currentTime;
    }
  }

  emitBurst(x, y, intensity = 1) {
    const numParticles = Math.min(this.burstSize, 2 + Math.floor(intensity * 4));

    for (let i = 0; i < numParticles; i++) {
      const particle = this.getParticle();
      if (particle) {
        // Set the particle color
        particle.color = this.color;

        particle.init(
          x,
          y,
          (Math.random() - 0.5) * 1, // Gentler initial velocity for painting
          (Math.random() - 0.5) * 1,
          this.baseSize + Math.random() * this.baseSize * 0.5 // Configurable particle size
        );

        if (!this.particles.includes(particle)) {
          this.particles.push(particle);
        }
      }
    }
  }

  update() {
    // Update all active particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update();

      // Remove inactive particles
      if (!particle.active) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw() {
    push();
    fill(this.color);

    // Draw all active particles
    for (let particle of this.particles) {
      particle.draw();
    }

    pop();
  }

  clear() {
    for (let particle of this.particles) {
      particle.active = false;
    }
    this.particles = [];
  }

  // Configure burst parameters
  setBurstParameters(interval, burstSize, minParticles) {
    this.emissionInterval = interval;
    this.burstSize = burstSize;
    this.minParticlesForNewBurst = minParticles;
  }
}

// Particle System Manager
class ParticleSystem {
  constructor() {
    this.emitters = [];
    this.maxEmitters = 3; // One for each painting keypoint (nose, leftWrist, rightWrist)
    this.initialized = false;
    this.keypointColors = [];
    this.particleCount = 100; // Current max particles per emitter
    this.particleSize = 3; // Current base particle size
  }

  initialize() {
    if (this.initialized) return;

    this.emitters = [];
    this.keypointColors = [];

    // Create emitters for painting keypoints with distinct colors
    const paintingColors = [
      hsv2rgb(0, 0.9, 1.0), // Red for nose
      hsv2rgb(120, 0.9, 1.0), // Green for left wrist
      hsv2rgb(240, 0.9, 1.0), // Blue for right wrist
    ];

    for (let i = 0; i < this.maxEmitters; i++) {
      const color = paintingColors[i];
      this.keypointColors.push(color);
      const emitter = new ParticleEmitter(color, this.particleCount);
      emitter.baseSize = this.particleSize;
      this.emitters.push(emitter);
    }

    this.initialized = true;
  }

  emitFromPose(pose, connections, minConfidence = 0.1) {
    if (!this.initialized) this.initialize();

    // Define keypoints for painting effect: nose (0), leftWrist (9), rightWrist (10)
    const paintingKeypoints = [0, 9, 10]; // nose, leftWrist, rightWrist

    for (let i = 0; i < paintingKeypoints.length; i++) {
      const keypointIndex = paintingKeypoints[i];
      const keypoint = pose.keypoints[keypointIndex];

      if (keypoint && keypoint.confidence > minConfidence) {
        // Use different emitters for different keypoints
        const emitterIndex = i % this.emitters.length;
        const intensity = keypoint.confidence * 1.2;

        // Emit more frequently for continuous painting effect
        this.emitters[emitterIndex].emit(keypoint.x, keypoint.y, intensity);
      }
    }
  }

  update() {
    if (!this.initialized) return;

    for (let emitter of this.emitters) {
      emitter.update();
    }
  }

  draw() {
    if (!this.initialized) return;

    for (let emitter of this.emitters) {
      emitter.draw();
    }
  }

  clear() {
    if (!this.initialized) return;

    for (let emitter of this.emitters) {
      emitter.clear();
    }
  }

  // Performance monitoring
  getTotalParticles() {
    if (!this.initialized) return 0;

    let total = 0;
    for (let emitter of this.emitters) {
      total += emitter.particles.length;
    }
    return total;
  }

  // Set noise strength for all particles
  setNoiseStrength(strength) {
    if (!this.initialized) return;

    for (let emitter of this.emitters) {
      for (let particle of emitter.particles) {
        if (particle.active) {
          particle.noiseStrength = strength;
        }
      }
    }
  }

  // Configure burst parameters for all emitters
  setBurstParameters(interval, burstSize, minParticles) {
    if (!this.initialized) return;

    for (let emitter of this.emitters) {
      emitter.setBurstParameters(interval, burstSize, minParticles);
    }
  }

  // Set painting intensity (emission frequency for painting effect)
  setPaintingIntensity(intensity) {
    for (let emitter of this.emitters) {
      emitter.emissionInterval = intensity;
    }
  }

  // Set particle count (max particles per emitter)
  setParticleCount(count) {
    this.particleCount = count;
    // Reinitialize emitters with new particle count
    if (this.initialized) {
      this.initialize();
    }
  }

  // Set particle size (base size for new particles)
  setParticleSize(size) {
    this.particleSize = size;
    // Update all emitters with new base size
    if (this.initialized) {
      for (let emitter of this.emitters) {
        emitter.baseSize = size;
      }
    }
  }
}

// Smoke Particle System for Pose Detection
// Based on the reference code but adapted for our pose detection system

// Global variable for smoke texture
let smokeTexture;

class SmokeParticle {
  constructor(x, y, size = 50) {
    this.position = createVector(x, y);

    // Random initial velocity with upward bias (like reference code)
    let vx = randomGaussian(0, 0.3);
    let vy = randomGaussian(-1, 0.3);
    this.velocity = createVector(vx, vy);

    this.acceleration = createVector(0, 0);
    this.lifespan = 100.0;
    this.size = size; // Make size configurable
  }

  // Update and draw the particle (like reference code)
  run() {
    this.update();
    this.show();
  }

  // Draw the particle using texture (optimized like reference code)
  show() {
    push(); // Isolate drawing state

    if (smokeTexture && smokeTexture.width > 0) {
      tint(255, this.lifespan);
      imageMode(CENTER);
      image(smokeTexture, this.position.x, this.position.y, this.size, this.size);
    } else {
      // Simple fallback circle
      fill(255, this.lifespan);
      noStroke();
      circle(this.position.x, this.position.y, this.size);
    }

    pop(); // Restore previous drawing state
  }

  // Method to apply a force vector to the Particle object (like reference code)
  applyForce(force) {
    this.acceleration.add(force);
  }

  // Method to update position (like reference code)
  update() {
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);
    this.lifespan -= 2;
    this.acceleration.mult(0); // clear Acceleration
  }

  // Is the particle still useful? (like reference code)
  isDead() {
    return this.lifespan < 0.0;
  }
}

class SmokeSystem {
  constructor() {
    this.particles = [];
    this.maxParticles = 100; // Reduced for better performance
    this.smokeDensity = 1; // Reduced density
    this.windStrength = 0.2;
    this.smokeSize = 50; // Default smoke particle size
  }

  // Emit smoke from pose keypoints (optimized)
  emitFromPose(pose, minConfidence = 0.1) {
    // Define keypoints for smoke emission: nose, leftWrist, rightWrist
    const smokeKeypoints = [9, 10]; // nose, leftWrist, rightWrist

    for (let i = 0; i < smokeKeypoints.length; i++) {
      const keypointIndex = smokeKeypoints[i];
      const keypoint = pose.keypoints[keypointIndex];

      if (keypoint && keypoint.confidence > minConfidence) {
        // Emit only one particle per keypoint for better performance
        if (this.particles.length < this.maxParticles) {
          this.particles.push(new SmokeParticle(keypoint.x, keypoint.y, this.smokeSize));
        }
      }
    }
  }

  // Apply wind force to all particles (like reference code)
  applyForce(force) {
    for (let particle of this.particles) {
      particle.applyForce(force);
    }
  }

  // Update all particles (optimized like reference code)
  run() {
    for (let particle of this.particles) {
      particle.run();
    }
    // Efficient particle removal using filter (like reference code)
    this.particles = this.particles.filter((particle) => !particle.isDead());
  }

  // Clear all particles
  clear() {
    this.particles = [];
  }

  // Set smoke density (particles per emission)
  setSmokeDensity(density) {
    this.smokeDensity = density;
  }

  // Set wind strength
  setWindStrength(strength) {
    this.windStrength = strength / 100; // Convert percentage to decimal
  }

  // Set smoke particle size
  setSmokeSize(size) {
    this.smokeSize = size;
  }

  // Get total particle count for performance monitoring
  getTotalParticles() {
    return this.particles.length;
  }
}

// Function to load smoke texture
function loadSmokeTexture() {
  smokeTexture = loadImage("assets/texture.png");
}

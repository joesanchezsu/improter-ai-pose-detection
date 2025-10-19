// Smoke Particle System for Pose Detection

// Global variable for smoke texture (disabled for better performance)
// let smokeTexture;

// Warm color palette for smoke effect
const warmColors = [
  [255, 150, 100], // Orange-red
  [255, 200, 100], // Orange
  [255, 255, 150], // Yellow
  [255, 255, 255], // White
];

class SmokeParticle {
  constructor(x, y, size = 50, colorIndex = 0) {
    this.position = createVector(x, y);

    // Random initial velocity with upward bias (like reference code)
    let vx = randomGaussian(0, 0.3);
    let vy = randomGaussian(-1, 0.3);
    this.velocity = createVector(vx, vy);

    this.acceleration = createVector(0, 0);
    this.lifespan = 100.0;
    this.maxLifespan = 100.0;
    this.size = size; // Make size configurable
    this.colorIndex = colorIndex; // Index for warm color palette
    this.baseSize = size; // Store original size for scaling
  }

  // Update and draw the particle (like reference code)
  run() {
    this.update();
    this.show();
  }

  // Draw the particle using texture (optimized like reference code)
  show() {
    push(); // Isolate drawing state

    // Calculate color based on lifespan (start yellow, become orange/red)
    const lifeRatio = this.lifespan / this.maxLifespan;
    // Start from index 2 (yellow) and go backwards to 0 (orange-red) as particle ages
    const colorIndex = Math.floor((1 - lifeRatio) * 2); // Only use indices 0-2 (orange-red to yellow)
    const currentColor = warmColors[Math.min(colorIndex, 2)];

    // Calculate dynamic size based on lifespan (start smaller, grow larger)
    const sizeMultiplier = 0.4 + lifeRatio * 1.2; // Start at 0.4x, grow to 1.6x max
    const currentSize = Math.min(this.baseSize * sizeMultiplier, 60); // Cap at 60px for fullscreen

    // Use simple circles for better performance
    fill(currentColor[0], currentColor[1], currentColor[2], this.lifespan);
    noStroke();
    circle(this.position.x, this.position.y, currentSize);

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
    this.maxParticles = 300; // Reduced for better performance
    this.smokeDensity = 2; // Reduced density
    this.windStrength = 0.2;
    this.smokeSize = 80; // Default smoke particle size (bigger for fullscreen)

    // Movement tracking for dynamic sizing
    this.lastPositions = []; // Store last positions of keypoints
    this.baseMovementThreshold = 10; // Base movement threshold
    this.movementThreshold = 10; // Current movement threshold (will be adjusted)
    this.stillnessTime = 0; // Time spent still
    this.maxStillnessTime = 4000; // Max time for size growth (3 seconds)
    this.sizeMultiplier = 0.7; // Start smaller
    this.targetSizeMultiplier = 0.7; // Start smaller

    // Wind system based on movement
    this.currentWind = createVector(0, 0); // Current wind force
    this.targetWind = createVector(0, 0); // Target wind force
    this.windSmoothing = 0.2; // How quickly wind changes
    this.maxWindStrength = 0.3; // Maximum wind force
  }

  // Emit smoke from pose keypoints (optimized)
  emitFromPose(pose, minConfidence = 0.1) {
    // Define keypoints for smoke emission: nose, leftWrist, rightWrist
    const smokeKeypoints = [9, 10]; // leftWrist, rightWrist

    // Adjust movement threshold based on canvas size for better fullscreen responsiveness
    this.adjustMovementThreshold();

    // Track movement for dynamic sizing
    this.updateMovementTracking(pose, smokeKeypoints, minConfidence);

    // Update size multiplier smoothly
    this.sizeMultiplier += (this.targetSizeMultiplier - this.sizeMultiplier) * 0.05;
    if (this.sizeMultiplier > 4.5) {
      this.sizeMultiplier = 4.5;
    }

    for (let i = 0; i < smokeKeypoints.length; i++) {
      const keypointIndex = smokeKeypoints[i];
      const keypoint = pose.keypoints[keypointIndex];

      if (keypoint && keypoint.confidence > minConfidence) {
        // Emit only one particle per keypoint for better performance
        if (this.particles.length < this.maxParticles) {
          const dynamicSize = this.smokeSize * this.sizeMultiplier;
          const colorIndex = Math.floor(Math.random() * warmColors.length);
          this.particles.push(
            new SmokeParticle(keypoint.x, keypoint.y, dynamicSize, colorIndex)
          );
        }
      }
    }
  }

  // Adjust movement threshold and wind smoothing based on canvas size
  adjustMovementThreshold() {
    // Calculate canvas size factor (1.0 for 640x480, larger for fullscreen)
    const baseCanvasSize = 640 * 480;
    const currentCanvasSize = width * height;
    const sizeFactor = Math.sqrt(currentCanvasSize / baseCanvasSize);

    // Adjust movement threshold - larger canvas needs higher threshold
    this.movementThreshold = this.baseMovementThreshold * sizeFactor;

    // Adjust wind smoothing - larger canvas needs faster response
    this.windSmoothing = Math.min(0.2 * sizeFactor, 0.5); // Cap at 0.5 for stability
  }

  // Track movement to adjust smoke size and wind
  updateMovementTracking(pose, smokeKeypoints, minConfidence) {
    const currentTime = millis();
    let totalMovement = 0;
    let validKeypoints = 0;
    let totalWindVector = createVector(0, 0);

    for (let i = 0; i < smokeKeypoints.length; i++) {
      const keypointIndex = smokeKeypoints[i];
      const keypoint = pose.keypoints[keypointIndex];

      if (keypoint && keypoint.confidence > minConfidence) {
        const currentPos = { x: keypoint.x, y: keypoint.y };

        if (this.lastPositions[i]) {
          const lastPos = this.lastPositions[i];
          const distance = Math.sqrt(
            Math.pow(currentPos.x - lastPos.x, 2) + Math.pow(currentPos.y - lastPos.y, 2)
          );
          totalMovement += distance;
          validKeypoints++;

          // Calculate movement vector for wind direction
          const movementVector = createVector(
            currentPos.x - lastPos.x,
            currentPos.y - lastPos.y
          );

          // Scale wind vector by movement speed (stronger movement = stronger wind)
          const windStrength = Math.min(distance * 0.02, this.maxWindStrength);
          movementVector.normalize();
          movementVector.mult(windStrength);

          // Add some randomness to make it more natural
          const randomFactor = 0.8 + random(0.4); // 0.8 to 1.2
          movementVector.mult(randomFactor);

          totalWindVector.add(movementVector);
        }

        this.lastPositions[i] = currentPos;
      }
    }

    // Calculate average movement
    const avgMovement = validKeypoints > 0 ? totalMovement / validKeypoints : 0;

    // Calculate wind from movement
    if (validKeypoints > 0 && totalWindVector.mag() > 0.01) {
      // Average wind direction from all keypoints
      totalWindVector.div(validKeypoints);

      // Smooth wind changes
      this.targetWind = totalWindVector;
      this.currentWind.lerp(this.targetWind, this.windSmoothing);
    } else {
      // No movement - wind dies down gradually
      this.targetWind = createVector(0, 0);
      this.currentWind.lerp(this.targetWind, this.windSmoothing * 2); // Faster decay
    }

    // Update stillness time and target size multiplier
    if (avgMovement < this.movementThreshold) {
      // Still - increase size over time
      this.stillnessTime += 16; // Assuming ~60fps
      const stillnessRatio = Math.min(this.stillnessTime / this.maxStillnessTime, 1);
      this.targetSizeMultiplier = 0.6 + stillnessRatio * 3.5; // Grow from 0.6x to 4.1x size
    } else {
      // Moving - decrease size
      this.stillnessTime = 0;
      this.targetSizeMultiplier = 0.3 + avgMovement / 30; // Start smaller when moving
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
    // Apply wind force to all particles
    for (let particle of this.particles) {
      particle.applyForce(this.currentWind);
      particle.run();
    }
    // Efficient particle removal using filter (like reference code)
    this.particles = this.particles.filter((particle) => !particle.isDead());
  }

  // Clear all particles
  clear() {
    this.particles = [];
    this.lastPositions = [];
    this.stillnessTime = 0;
    this.sizeMultiplier = 0.7;
    this.targetSizeMultiplier = 0.7;
    this.currentWind = createVector(0, 0);
    this.targetWind = createVector(0, 0);
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

  // Get current wind information for debugging
  getWindInfo() {
    return {
      direction: this.currentWind.copy(),
      strength: this.currentWind.mag(),
      targetDirection: this.targetWind.copy(),
      targetStrength: this.targetWind.mag(),
    };
  }
}

// Function to load smoke texture (disabled for better performance)
function loadSmokeTexture() {
  // Texture loading disabled - using simple circles instead
  // smokeTexture = loadImage("assets/texture.png");
}

/*
 * Pose Visualization Classes for ImproterAI
 * Handles different visualization modes for pose data
 */

// Base class for pose visualizations
class PoseVisualizer {
  constructor() {
    this.paintMode = "keypoints";
    this.paintColor = "#ff0000";
    this.paintSize = 10;
    this.paintOpacity = 80;
    this.poseTrails = [];

    // Enhanced growing circles properties

    this.colorPalette = [
      "#CFF8F4", // Bright cyan mint
      "#5CD4E1", // Aqua-blue
      "#B167E6", // Vibrant purple
      "#7232A8", // Deep violet
      "#2C133F", // Almost black purple
    ];
    this.poseColors = []; // Store colors for each pose (array of colors per keypoint)
    this.poseLastPositions = []; // Track last positions for movement detection
    this.poseMovementThreshold = 15; // Movement threshold for color changes
    this.poseStillnessTime = []; // Track stillness time for each pose

    // Hands up detection for growing circles
    this.handsUpGrowth = 0; // Growth multiplier when hands are up
    this.maxGrowthMultiplier = 3.0; // Maximum growth when all hands are up
    this.growthSpeed = 0.02; // How fast circles grow when hands are up
    this.allHandsUpTime = 0; // Time all hands have been up
    this.handsUpThreshold = 48; // 2 seconds of all hands up to trigger fireworks
    this.triggerFireworksMode = false; // Signal to switch to fireworks mode
  }

  setMode(mode) {
    this.paintMode = mode;
  }

  setColor(color) {
    this.paintColor = color;
  }

  setSize(size) {
    this.paintSize = size;
  }

  setOpacity(opacity) {
    this.paintOpacity = opacity;
  }

  // Convert hex color to RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  visualize(poses, connections, minConfidence = 0.1) {
    if (poses.length === 0) return;

    // Handle mode switching logic for growing circles
    // if (this.paintMode === "circles") {
    //   // Check if all hands are up to trigger fireworks mode
    //   if (this.checkAllHandsUp(poses, minConfidence)) {
    //     console.log("All hands up, switching to fireworks mode");
    //     // Signal to switch to fireworks mode (particles)
    //     // this.triggerFireworksMode = true;
    //     return;
    //   }
    // }

    for (let i = 0; i < poses.length; i++) {
      const pose = poses[i];

      switch (this.paintMode) {
        case "keypoints":
          this.drawKeypoints(pose, minConfidence);
          break;
        case "skeleton":
          this.drawSkeleton(pose, connections, minConfidence);
          break;
        case "trails":
          this.drawTrails(pose, i, minConfidence);
          break;
        case "circles":
          this.drawGrowingCircles(pose, minConfidence, i);
          break;
      }
    }
  }

  drawKeypoints(pose, minConfidence) {
    for (let j = 0; j < pose.keypoints.length; j++) {
      const keypoint = pose.keypoints[j];
      if (keypoint.confidence > minConfidence) {
        const rgb = this.hexToRgb(this.paintColor);
        fill(rgb.r, rgb.g, rgb.b, this.paintOpacity);
        noStroke();
        circle(keypoint.x, keypoint.y, this.paintSize);
      }
    }
  }

  drawSkeleton(pose, connections, minConfidence) {
    for (let j = 0; j < connections.length; j++) {
      const pointAIndex = connections[j][0];
      const pointBIndex = connections[j][1];
      const pointA = pose.keypoints[pointAIndex];
      const pointB = pose.keypoints[pointBIndex];

      if (pointA.confidence > minConfidence && pointB.confidence > minConfidence) {
        const rgb = this.hexToRgb(this.paintColor);
        stroke(rgb.r, rgb.g, rgb.b, this.paintOpacity);
        strokeWeight(this.paintSize / 2);
        line(pointA.x, pointA.y, pointB.x, pointB.y);
      }
    }
  }

  drawTrails(pose, poseIndex, minConfidence) {
    // Store current pose for trails
    if (!this.poseTrails[poseIndex]) {
      this.poseTrails[poseIndex] = [];
    }

    // Add current keypoints to trail
    const currentKeypoints = [];
    for (let j = 0; j < pose.keypoints.length; j++) {
      const keypoint = pose.keypoints[j];
      if (keypoint.confidence > minConfidence) {
        currentKeypoints.push({ x: keypoint.x, y: keypoint.y });
      }
    }

    this.poseTrails[poseIndex].push(currentKeypoints);

    // Limit trail length for performance
    if (this.poseTrails[poseIndex].length > 15) {
      this.poseTrails[poseIndex].shift();
    }

    // Draw trail
    for (let t = 1; t < this.poseTrails[poseIndex].length; t++) {
      const currKeypoints = this.poseTrails[poseIndex][t];
      for (let k = 0; k < currKeypoints.length; k++) {
        const alpha = (t / this.poseTrails[poseIndex].length) * this.paintOpacity;
        const rgb = this.hexToRgb(this.paintColor);
        fill(rgb.r, rgb.g, rgb.b, alpha);
        noStroke();
        circle(currKeypoints[k].x, currKeypoints[k].y, this.paintSize * 0.5);
      }
    }
  }

  drawGrowingCircles(pose, minConfidence, poseIndex = 0) {
    // Initialize pose tracking if needed
    if (!this.poseColors[poseIndex]) {
      this.poseColors[poseIndex] = []; // Array of colors for each keypoint
      this.poseLastPositions[poseIndex] = [];
      this.poseStillnessTime[poseIndex] = 0;
    }

    // Track movement for color changes
    this.updateMovementTracking(pose, poseIndex, minConfidence);

    // Check if hands are up for this pose
    const handsUp = this.checkHandsUp(pose, minConfidence);

    for (let j = 0; j < pose.keypoints.length; j++) {
      // Skip ears keypoints (indices 3 and 4)
      if (j === 3 || j === 4) continue;

      const keypoint = pose.keypoints[j];
      if (keypoint.confidence > minConfidence) {
        // Initialize color for this keypoint if not set
        if (!this.poseColors[poseIndex][j]) {
          this.poseColors[poseIndex][j] = this.getRandomColor();
        }

        const time = millis() * 0.001;

        // Wave-like size changes (bigger base size: 90)
        const baseSize = 90;
        const sizeWave = sin(time * 2 + j * 0.5) * 30; // Wave amplitude of 30
        let size = baseSize + sizeWave;

        // Apply hands-up growth
        if (handsUp) {
          this.handsUpGrowth += this.growthSpeed;
          this.handsUpGrowth = Math.min(this.handsUpGrowth, this.maxGrowthMultiplier);
          size *= 1 + this.handsUpGrowth;
        } else {
          // Gradually reduce growth when hands come down
          this.handsUpGrowth *= 0.95;
        }

        // Wave-like opacity changes with minimum opacity of 0.9
        const opacityWave = sin(time * 1.5 + j * 0.3) * 0.2; // Wave amplitude of 20%
        const minOpacity = 0.9; // Minimum opacity of 90%
        const dynamicOpacity = Math.max(
          minOpacity,
          this.paintOpacity * (0.9 + opacityWave)
        ); // Range: 90% to 100%

        // Apply glowing effect with radial gradient
        this.drawGlowingCircle(
          keypoint.x,
          keypoint.y,
          size,
          this.poseColors[poseIndex][j],
          dynamicOpacity
        );
      }
    }
  }

  // Get a random color from the palette
  getRandomColor() {
    return this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
  }

  // Check if hands are up (above the head/nose)
  checkHandsUp(pose, minConfidence) {
    const nose = pose.keypoints[0]; // nose
    const leftWrist = pose.keypoints[9]; // leftWrist
    const rightWrist = pose.keypoints[10]; // rightWrist

    if (nose.confidence < minConfidence) return false;

    let handsUpCount = 0;

    // Check left wrist
    if (leftWrist.confidence > minConfidence && leftWrist.y < nose.y) {
      handsUpCount++;
    }

    // Check right wrist
    if (rightWrist.confidence > minConfidence && rightWrist.y < nose.y) {
      handsUpCount++;
    }

    // Return true if at least one hand is up
    return handsUpCount > 0;
  }

  // Check if all people have hands up and handle mode switching
  checkAllHandsUp(poses, minConfidence) {
    if (poses.length === 0) return false;

    let allHandsUp = true;
    for (let pose of poses) {
      if (!this.checkHandsUp(pose, minConfidence)) {
        allHandsUp = false;
        break;
      }
    }

    if (allHandsUp) {
      this.allHandsUpTime += 16; // Assuming ~60fps

      // If all hands up for threshold time, trigger fireworks mode
      if (this.allHandsUpTime >= this.handsUpThreshold) {
        return true; // Signal to switch to fireworks mode
      }
    } else {
      this.allHandsUpTime = 0; // Reset timer
    }

    return false;
  }

  // Reset hands up tracking
  resetHandsUpTracking() {
    this.handsUpGrowth = 0;
    this.allHandsUpTime = 0;
  }

  // Draw a glowing circle with radial gradient effect
  drawGlowingCircle(x, y, size, colorHex, opacity) {
    const ctx = drawingContext; // Access the 2D drawing context from p5.js
    push();
    blendMode(ADD); // Makes light/glow additive for fire-like effect

    // Convert hex color to RGB
    const rgb = this.hexToRgb(colorHex);
    const r = rgb.r;
    const g = rgb.g;
    const b = rgb.b;
    const a = opacity; // Use the dynamic opacity

    // Create a radial gradient for subtle glowing effect
    const grd = ctx.createRadialGradient(
      x,
      y,
      0, // Center of gradient
      x,
      y,
      size * 0.6 // Smaller gradient radius for more solid center
    );

    // Add color stops: bright center with subtle fade
    grd.addColorStop(0, `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`); // Full opacity center
    grd.addColorStop(0.9, `rgba(${r},${g},${b},${((a / 255) * 0.9).toFixed(3)})`); // 80% opacity at 80%
    grd.addColorStop(1, `rgba(${r},${g},${b},${((a / 255) * 0.4).toFixed(3)})`); // 30% opacity edge (not fully transparent)

    // Draw the glowing circle
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    pop(); // Restore previous drawing state
  }

  // Track movement to determine if colors should change
  updateMovementTracking(pose, poseIndex, minConfidence) {
    const currentTime = millis();
    let totalMovement = 0;
    let validKeypoints = 0;

    // Calculate movement from key positions (head, shoulders, hips)
    const trackingKeypoints = [0, 5, 6, 11, 12]; // nose, leftShoulder, rightShoulder, leftHip, rightHip

    for (let i = 0; i < trackingKeypoints.length; i++) {
      const keypointIndex = trackingKeypoints[i];
      const keypoint = pose.keypoints[keypointIndex];

      if (keypoint && keypoint.confidence > minConfidence) {
        const currentPos = { x: keypoint.x, y: keypoint.y };

        if (this.poseLastPositions[poseIndex][i]) {
          const lastPos = this.poseLastPositions[poseIndex][i];
          const distance = Math.sqrt(
            Math.pow(currentPos.x - lastPos.x, 2) + Math.pow(currentPos.y - lastPos.y, 2)
          );
          totalMovement += distance;
          validKeypoints++;
        }

        this.poseLastPositions[poseIndex][i] = currentPos;
      }
    }

    // Calculate average movement
    const avgMovement = validKeypoints > 0 ? totalMovement / validKeypoints : 0;

    // Update stillness time
    if (avgMovement < this.poseMovementThreshold) {
      this.poseStillnessTime[poseIndex] += 16; // Assuming ~60fps
    } else {
      this.poseStillnessTime[poseIndex] = 0;
    }

    // Change colors if person is moving a lot
    if (avgMovement > this.poseMovementThreshold * 2) {
      // High movement - change colors frequently for random keypoints
      if (Math.random() < 0.15) {
        // 15% chance per frame to change a random keypoint color
        const randomKeypointIndex = Math.floor(Math.random() * 17); // 17 keypoints total
        this.poseColors[poseIndex][randomKeypointIndex] = this.getRandomColor();
      }
    } else if (avgMovement > this.poseMovementThreshold) {
      // Medium movement - change colors occasionally for random keypoints
      if (Math.random() < 0.03) {
        // 3% chance per frame to change a random keypoint color
        const randomKeypointIndex = Math.floor(Math.random() * 17); // 17 keypoints total
        this.poseColors[poseIndex][randomKeypointIndex] = this.getRandomColor();
      }
    }
    // Low movement - colors stay the same (no color change)
  }

  clearTrails() {
    this.poseTrails = [];
  }

  // Clear all pose tracking data
  clearPoseTracking() {
    this.poseColors = [];
    this.poseLastPositions = [];
    this.poseStillnessTime = [];
  }
}

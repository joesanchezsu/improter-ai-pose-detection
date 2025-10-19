/*
 * Pose Visualization Classes for ImproterAI
 * Handles different visualization modes for pose data
 */

/* ---------------- Fireworks system (from colleague) ---------------- */

class Spark {
  constructor(x, y, angle, speed, colorHex) {
    this.pos = createVector(x, y);
    this.prev = this.pos.copy(); // for motion trail
    this.vel = p5.Vector.fromAngle(angle).mult(speed);
    this.life = 255;
    this.decay = random(3, 6);
    this.size = random(3.5, 7); // bigger core particles
    this.color = this.hexToRgb(colorHex);
  }

  // Hex → RGB (keep minimal)
  hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m
      ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
      : { r: 255, g: 255, b: 255 };
  }

  update() {
    // Save previous position for the trail
    this.prev.set(this.pos);

    // Slightly weaker air drag → wider spread
    this.vel.mult(0.992);

    // Gentle gravity → smoother downward fall
    this.vel.y += 0.07;

    // Tiny jitter adds sparkle realism
    this.vel.x += random(-0.05, 0.05);
    this.vel.y += random(-0.03, 0.03);

    // Move and fade (slower fade = longer persistence)
    this.pos.add(this.vel);
    this.life -= this.decay * 0.7;
  }

  draw() {
    // Soft flicker for a twinkling look
    const flicker = 0.7 + 0.3 * sin(frameCount * 0.4 + this.pos.x * 0.02);

    // 1) Draw a thicker trail between prev → current
    stroke(this.color.r, this.color.g, this.color.b, this.life * 0.5 * flicker);
    strokeWeight(this.size * 0.6); // wider trail "brush"
    line(this.prev.x, this.prev.y, this.pos.x, this.pos.y);

    // 2) Draw the core (larger & brighter)
    noStroke();
    const coreSize = this.size * 1.3;
    fill(this.color.r, this.color.g, this.color.b, this.life * flicker);
    circle(this.pos.x, this.pos.y, coreSize);
  }

  isDead() {
    return this.life <= 0;
  }
}

class Firework {
  constructor(x, y, colorHex) {
    this.sparks = [];
    // Fewer sparks per burst → less noisy; looks full thanks to streaks
    const n = 90;
    for (let i = 0; i < n; i++) {
      const ang = (TWO_PI * i) / n + random(-0.03, 0.03); // tighter spread
      const sp = random(2.5, 6.5); // slightly slower
      this.sparks.push(new Spark(x, y, ang, sp, colorHex));
    }
  }
  update() {
    for (const s of this.sparks) s.update();
    this.sparks = this.sparks.filter((s) => !s.isDead());
  }
  draw() {
    // Additive blending for glow
    push();
    blendMode(ADD);
    for (const s of this.sparks) s.draw();
    pop();
  }
  isDead() {
    return this.sparks.length === 0;
  }
}

class FireworksManager {
  constructor() {
    this.fireworks = [];
  }
  trigger(x, y, colorHex) {
    this.fireworks.push(new Firework(x, y, colorHex));
  }
  updateAndDraw() {
    for (const f of this.fireworks) {
      f.update();
      f.draw();
    }
    this.fireworks = this.fireworks.filter((f) => !f.isDead());
  }
  clear() {
    this.fireworks = [];
  }
}

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
      "#FF006E", // Electric Magenta
      "#FFBE0B", // Bright Warm Yellow
      "#3A86FF", // Electric Blue
      "#8338EC", // Vivid Purple
      "#FB5607", // Orange-Red
      "#00F5D4", // Cyan-Green
    ];
    this.poseColors = []; // Store colors for each pose (array of colors per keypoint)
    this.poseLastPositions = []; // Track last positions for movement detection
    this.poseMovementThreshold = 15; // Movement threshold for color changes
    this.poseStillnessTime = []; // Track stillness time for each pose

    // Hands up detection for growing circles
    this.handsUpGrowth = 0; // Growth multiplier when hands are up
    this.maxGrowthMultiplier = 3.0; // Maximum growth when all hands are up
    this.growthSpeed = 0.02; // How fast circles grow when hands are up

    // Fireworks system (from colleague)
    this.fireworks = new FireworksManager();
    this.fireworksActiveUntil = 0; // Timestamp until which bursts keep firing
    this.fireworksCooldown = 0; // Burst cooldown timestamp (ms)
    this.fireworksInterval = 320; // Slower cadence for calmer rhythm
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
    if (poses.length === 0) {
      // Still update/draw fireworks layer (lets remaining sparks fade out)
      this.fireworks.updateAndDraw();
      return;
    }

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
        case "fireworks":
          // Reuse glowing circles as a soft base under fireworks
          this.drawGrowingCircles(pose, minConfidence, i);
          // Trigger logic lives in updateMovementTracking()
          break;
      }
    }

    // Draw the fireworks overlay on top every frame
    this.fireworks.updateAndDraw();
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
    let totalMovement = 0;
    let validKeypoints = 0;

    // Track core posture points (nose, shoulders, hips)
    const trackingKeypoints = [0, 5, 6, 11, 12];

    for (let i = 0; i < trackingKeypoints.length; i++) {
      const idx = trackingKeypoints[i];
      const k = pose.keypoints[idx];

      if (k && k.confidence > minConfidence) {
        const cur = { x: k.x, y: k.y };
        if (this.poseLastPositions[poseIndex][i]) {
          const last = this.poseLastPositions[poseIndex][i];
          const dx = cur.x - last.x;
          const dy = cur.y - last.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          totalMovement += dist;
          validKeypoints++;
        }
        this.poseLastPositions[poseIndex][i] = cur;
      }
    }

    const avgMovement = validKeypoints > 0 ? totalMovement / validKeypoints : 0;

    // Stillness timer (kept for potential future dynamics)
    if (avgMovement < this.poseMovementThreshold) {
      this.poseStillnessTime[poseIndex] += 16; // ~60 fps
    } else {
      this.poseStillnessTime[poseIndex] = 0;
    }

    // Color dynamics for circles/trails (kept lightweight)
    if (avgMovement > this.poseMovementThreshold * 2) {
      if (Math.random() < 0.15) {
        const randomKeypointIndex = Math.floor(Math.random() * 17);
        this.poseColors[poseIndex][randomKeypointIndex] = this.getRandomColor();
      }
    } else if (avgMovement > this.poseMovementThreshold) {
      if (Math.random() < 0.03) {
        const randomKeypointIndex = Math.floor(Math.random() * 17);
        this.poseColors[poseIndex][randomKeypointIndex] = this.getRandomColor();
      }
    }

    /* ---------------- Fireworks trigger ----------------
     * Condition: mode === "fireworks" AND (both hands above shoulder line) AND sufficient movement
     * Behavior: open/extend a sustain window and emit chained bursts at a slower cadence
     */
    if (this.paintMode === "fireworks") {
      const lw = pose.keypoints[9]; // leftWrist
      const rw = pose.keypoints[10]; // rightWrist
      const ls = pose.keypoints[5]; // leftShoulder
      const rs = pose.keypoints[6]; // rightShoulder

      const haveAll =
        lw &&
        rw &&
        ls &&
        rs &&
        lw.confidence > minConfidence &&
        rw.confidence > minConfidence &&
        ls.confidence > minConfidence &&
        rs.confidence > minConfidence;

      if (haveAll) {
        const shoulderY = (ls.y + rs.y) / 2;

        // Small margin so slight noise doesn't kill the trigger
        const handsUp = lw.y < shoulderY - 10 && rw.y < shoulderY - 10;

        // More permissive sustained window:
        //  - High movement relative to (lowered) threshold, OR
        //  - Hands-up fallback if we've been quiet for a while.
        if (
          (avgMovement > this.poseMovementThreshold * 1.3 && handsUp) ||
          (handsUp && millis() - this.fireworksCooldown > 1000)
        ) {
          this.fireworksActiveUntil = millis() + 2500; // longer sustain window
        }

        // While inside sustain window, emit chained bursts at a fixed interval
        if (millis() < this.fireworksActiveUntil) {
          if (millis() - this.fireworksCooldown > this.fireworksInterval) {
            const pick = () =>
              this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];

            // Alternate hands to reduce density (left this tick, right next tick)
            this._fwAlt = (this._fwAlt || 0) ^ 1;
            if (this._fwAlt === 0) {
              this.fireworks.trigger(lw.x, lw.y, pick()); // left hand burst
            } else {
              this.fireworks.trigger(rw.x, rw.y, pick()); // right hand burst
            }

            // Occasionally add a small crown above the head (rare, intentional)
            const head = pose.keypoints[0]; // nose
            if (head && head.confidence > minConfidence && Math.random() < 0.25) {
              this.fireworks.trigger(head.x, head.y - 40, pick());
            }

            // Rare torso halo (subtle, fewer points) to avoid "confetti" feel
            const hasHips =
              pose.keypoints[11] &&
              pose.keypoints[12] &&
              pose.keypoints[11].confidence > minConfidence &&
              pose.keypoints[12].confidence > minConfidence;
            if (hasHips && Math.random() < 0.15) {
              const torso = {
                x: (pose.keypoints[11].x + pose.keypoints[12].x) / 2,
                y: (pose.keypoints[11].y + pose.keypoints[12].y) / 2,
              };
              const ringCount = 4; // fewer points than the explosive version
              const ringRadius = 50; // slightly tighter
              for (let r = 0; r < ringCount; r++) {
                const ang = (TWO_PI * r) / ringCount;
                const rx = torso.x + Math.cos(ang) * ringRadius;
                const ry = torso.y + Math.sin(ang) * ringRadius;
                this.fireworks.trigger(rx, ry, pick());
              }
            }

            // cadence control
            this.fireworksCooldown = millis();
          }
        }
      }
    }
  }

  clearTrails() {
    this.poseTrails = [];
  }

  // Clear all pose tracking data
  clearPoseTracking() {
    this.poseColors = [];
    this.poseLastPositions = [];
    this.poseStillnessTime = [];
    // Also clear fireworks when resetting
    this.fireworks.clear();
  }
}

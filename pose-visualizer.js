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
          this.drawGrowingCircles(pose, minConfidence);
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

  drawGrowingCircles(pose, minConfidence) {
    for (let j = 0; j < pose.keypoints.length; j++) {
      const keypoint = pose.keypoints[j];
      if (keypoint.confidence > minConfidence) {
        const time = millis() * 0.001;
        const size = this.paintSize + sin(time + j) * this.paintSize * 0.5;
        const rgb = this.hexToRgb(this.paintColor);
        fill(rgb.r, rgb.g, rgb.b, this.paintOpacity);
        noStroke();
        circle(keypoint.x, keypoint.y, size);
      }
    }
  }

  clearTrails() {
    this.poseTrails = [];
  }
}

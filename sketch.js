/*
 * ImproterAI Pose Detection Project
 *
 * This project demonstrates real-time pose detection and skeleton visualization
 * using p5.js and ml5.js with the MoveNet model.
 *
 * Features:
 * - Real-time webcam pose detection
 * - Skeleton connection visualization
 * - Keypoint confidence filtering
 * - Multiple pose support
 */

let video;
let bodyPose;
let poses = [];
let connections;

// Canvas and visualization variables
let cameraCanvas;
let isCameraActive = false;
let previousPoses = [];

// Painting variables
let paintMode = "keypoints";
let paintColor = "#ff0000";
let paintSize = 10;
let paintOpacity = 80;
let poseTrails = [];
let cameraOpacity = 100; // New variable to control camera visibility

// Configuration for the pose detection model
const poseConfig = {
  modelType: "MULTIPOSE_LIGHTNING", // "MULTIPOSE_LIGHTNING", "SINGLEPOSE_LIGHTNING", or "SINGLEPOSE_THUNDER"
  enableSmoothing: true,
  minPoseScore: 0.25,
  multiPoseMaxDimension: 256,
  enableTracking: true,
  trackerType: "boundingBox", // "keypoint" or "boundingBox"
  trackerConfig: {},
  modelUrl: undefined,
  flipped: false,
};

// Visual settings
const visualSettings = {
  skeletonColor: [255, 0, 0], // Red for skeleton lines
  keypointColor: [0, 255, 0], // Green for keypoints
  strokeWeight: 2,
  keypointSize: 10,
  minConfidence: 0.1,
};

function preload() {
  // Load the bodyPose model with configuration
  bodyPose = ml5.bodyPose(poseConfig);
}

function setup() {
  // Create camera canvas and attach to container
  cameraCanvas = createCanvas(640, 480);
  cameraCanvas.parent("camera-container");

  // Create the video capture (but don't start it yet)
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
  video.stop(); // Stop the video initially

  // Get the skeleton connection information
  connections = bodyPose.getSkeleton();

  // Setup UI event listeners
  setupUI();

  console.log("ImproterAI Pose Detection initialized");
  console.log("Skeleton connections:", connections);
}

function draw() {
  // Clear background
  background(0);

  // Only draw video and pose detection if camera is active
  if (isCameraActive) {
    // Draw the webcam video with opacity control
    tint(255, cameraOpacity);
    image(video, 0, 0, width, height);
    noTint(); // Reset tint for other drawings

    // Draw the skeleton connections
    drawSkeleton();

    // Draw all the tracked landmark points
    drawKeypoints();

    // Display pose count
    displayPoseInfo();

    // Paint visualizations on the same canvas
    paintOnCanvas();
  } else {
    // Show "Camera Stopped" message
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(24);
    text("🎥 Camera Stopped", width / 2, height / 2);
    textSize(16);
    text("Click 'Start Camera' to begin", width / 2, height / 2 + 40);
  }

  // Visualization canvas will be added later
}

function drawSkeleton() {
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    for (let j = 0; j < connections.length; j++) {
      let pointAIndex = connections[j][0];
      let pointBIndex = connections[j][1];
      let pointA = pose.keypoints[pointAIndex];
      let pointB = pose.keypoints[pointBIndex];

      // Only draw a line if both points are confident enough
      if (
        pointA.confidence > visualSettings.minConfidence &&
        pointB.confidence > visualSettings.minConfidence
      ) {
        stroke(visualSettings.skeletonColor);
        strokeWeight(visualSettings.strokeWeight);
        line(pointA.x, pointA.y, pointB.x, pointB.y);
      }
    }
  }
}

function drawKeypoints() {
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    for (let j = 0; j < pose.keypoints.length; j++) {
      let keypoint = pose.keypoints[j];

      // Only draw a circle if the keypoint's confidence is above threshold
      if (keypoint.confidence > visualSettings.minConfidence) {
        fill(visualSettings.keypointColor);
        noStroke();
        circle(keypoint.x, keypoint.y, visualSettings.keypointSize);
      }
    }
  }
}

function displayPoseInfo() {
  // Display pose count in top-left corner
  fill(255);
  noStroke();
  textAlign(LEFT);
  textSize(16);
  text(`Poses detected: ${poses.length}`, 10, 25);
}

// Callback function for when bodyPose outputs data
function gotPoses(results) {
  // Save the output to the poses variable
  poses = results;

  // Log pose data for debugging (optional)
  if (poses.length > 0) {
    console.log(`Detected ${poses.length} pose(s)`);
  }
}

// Utility function to get pose data (can be used for further processing)
function getPoseData() {
  return poses;
}

// Utility function to get specific keypoint
function getKeypoint(poseIndex, keypointName) {
  if (poses.length > poseIndex) {
    const keypointNames = [
      "nose",
      "leftEye",
      "rightEye",
      "leftEar",
      "rightEar",
      "leftShoulder",
      "rightShoulder",
      "leftElbow",
      "rightElbow",
      "leftWrist",
      "rightWrist",
      "leftHip",
      "rightHip",
      "leftKnee",
      "rightKnee",
      "leftAnkle",
      "rightAnkle",
    ];

    const keypointIndex = keypointNames.indexOf(keypointName);
    if (keypointIndex !== -1) {
      return poses[poseIndex].keypoints[keypointIndex];
    }
  }
  return null;
}

// Setup UI event listeners
function setupUI() {
  // Camera toggle button
  const cameraToggle = document.getElementById("camera-toggle");
  cameraToggle.addEventListener("click", toggleCamera);

  // Save canvas button
  const saveCanvas = document.getElementById("save-canvas");
  saveCanvas.addEventListener("click", saveVisualizationCanvas);

  // Paint mode selector
  const paintModeSelect = document.getElementById("paint-mode");
  paintModeSelect.addEventListener("change", (e) => {
    paintMode = e.target.value;
  });

  // Color picker
  const colorPicker = document.getElementById("paint-color");
  colorPicker.addEventListener("change", (e) => {
    paintColor = e.target.value;
  });

  // Size slider
  const sizeSlider = document.getElementById("paint-size");
  const sizeValue = document.getElementById("size-value");
  sizeSlider.addEventListener("input", (e) => {
    paintSize = parseInt(e.target.value);
    sizeValue.textContent = paintSize;
  });

  // Opacity slider
  const opacitySlider = document.getElementById("opacity");
  const opacityValue = document.getElementById("opacity-value");
  opacitySlider.addEventListener("input", (e) => {
    paintOpacity = parseInt(e.target.value);
    opacityValue.textContent = paintOpacity + "%";
  });

  // Camera opacity slider
  const cameraOpacitySlider = document.getElementById("camera-opacity");
  const cameraOpacityValue = document.getElementById("camera-opacity-value");
  cameraOpacitySlider.addEventListener("input", (e) => {
    cameraOpacity = parseInt(e.target.value);
    cameraOpacityValue.textContent = cameraOpacity + "%";
  });
}

// Toggle camera on/off
function toggleCamera() {
  const button = document.getElementById("camera-toggle");

  if (isCameraActive) {
    // Stop camera
    video.stop();
    bodyPose.detectStop();
    isCameraActive = false;
    button.textContent = "🎥 Start Camera";
    button.classList.remove("btn-primary");
    button.classList.add("btn-secondary");
  } else {
    // Start camera
    video.play();
    bodyPose.detectStart(video, gotPoses);
    isCameraActive = true;
    button.textContent = "⏹️ Stop Camera";
    button.classList.remove("btn-secondary");
    button.classList.add("btn-primary");
  }
}

// Paint visualizations directly on the main canvas
function paintOnCanvas() {
  if (poses.length === 0) return;

  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];

    switch (paintMode) {
      case "keypoints":
        paintKeypointsOnCanvas(pose);
        break;
      case "skeleton":
        paintSkeletonOnCanvas(pose);
        break;
      case "trails":
        paintTrailsOnCanvas(pose, i);
        break;
      case "circles":
        paintGrowingCirclesOnCanvas(pose);
        break;
    }
  }
}

// Paint individual keypoints on main canvas
function paintKeypointsOnCanvas(pose) {
  for (let j = 0; j < pose.keypoints.length; j++) {
    let keypoint = pose.keypoints[j];
    if (keypoint.confidence > visualSettings.minConfidence) {
      // Convert hex color to RGB
      const rgb = hexToRgb(paintColor);
      fill(rgb.r, rgb.g, rgb.b, paintOpacity);
      noStroke();
      circle(keypoint.x, keypoint.y, paintSize);
    }
  }
}

// Paint skeleton connections on main canvas
function paintSkeletonOnCanvas(pose) {
  for (let j = 0; j < connections.length; j++) {
    let pointAIndex = connections[j][0];
    let pointBIndex = connections[j][1];
    let pointA = pose.keypoints[pointAIndex];
    let pointB = pose.keypoints[pointBIndex];

    if (
      pointA.confidence > visualSettings.minConfidence &&
      pointB.confidence > visualSettings.minConfidence
    ) {
      // Convert hex color to RGB
      const rgb = hexToRgb(paintColor);
      stroke(rgb.r, rgb.g, rgb.b, paintOpacity);
      strokeWeight(paintSize / 2);
      line(pointA.x, pointA.y, pointB.x, pointB.y);
    }
  }
}

// Paint pose trails on main canvas
function paintTrailsOnCanvas(pose, poseIndex) {
  // Store current pose for trails
  if (!poseTrails[poseIndex]) {
    poseTrails[poseIndex] = [];
  }

  // Add current keypoints to trail
  let currentKeypoints = [];
  for (let j = 0; j < pose.keypoints.length; j++) {
    let keypoint = pose.keypoints[j];
    if (keypoint.confidence > visualSettings.minConfidence) {
      currentKeypoints.push({ x: keypoint.x, y: keypoint.y });
    }
  }

  poseTrails[poseIndex].push(currentKeypoints);

  // Limit trail length
  if (poseTrails[poseIndex].length > 20) {
    poseTrails[poseIndex].shift();
  }

  // Draw trail
  for (let t = 1; t < poseTrails[poseIndex].length; t++) {
    let currKeypoints = poseTrails[poseIndex][t];
    for (let k = 0; k < currKeypoints.length; k++) {
      let alpha = (t / poseTrails[poseIndex].length) * paintOpacity;
      const rgb = hexToRgb(paintColor);
      fill(rgb.r, rgb.g, rgb.b, alpha);
      noStroke();
      circle(currKeypoints[k].x, currKeypoints[k].y, paintSize * 0.5);
    }
  }
}

// Paint growing circles on main canvas
function paintGrowingCirclesOnCanvas(pose) {
  for (let j = 0; j < pose.keypoints.length; j++) {
    let keypoint = pose.keypoints[j];
    if (keypoint.confidence > visualSettings.minConfidence) {
      let time = millis() * 0.001;
      let size = paintSize + sin(time + j) * paintSize * 0.5;
      const rgb = hexToRgb(paintColor);
      fill(rgb.r, rgb.g, rgb.b, paintOpacity);
      noStroke();
      circle(keypoint.x, keypoint.y, size);
    }
  }
}

// Save visualization canvas
function saveVisualizationCanvas() {
  saveCanvas("pose-artwork.png");
}

// Convert hex color to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

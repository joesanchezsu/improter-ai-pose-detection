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
let isFullscreen = false;
let isPresentationMode = false;
let scaleX = 1;
let scaleY = 1;
let offsetX = 0;
let offsetY = 0;

// Visualization and particle system instances
let poseVisualizer;
let particleSystem;
let smokeSystem;
let fireworksSystem;
let cameraOpacity = 100; // New variable to control camera visibility
let cameraMirror = true; // Variable to control camera mirroring

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

  // Load smoke texture
  loadSmokeTexture();
}

function setup() {
  // Create camera canvas and attach to container
  cameraCanvas = createCanvas(640, 480);
  cameraCanvas.parent("camera-container");

  // Create the video capture with standard resolution to avoid cropping
  video = createCapture(VIDEO);
  // Use standard webcam resolution to avoid aspect ratio issues
  video.size(640, 480);
  video.hide();
  video.stop(); // Stop the video initially

  // Get the skeleton connection information
  connections = bodyPose.getSkeleton();

  // Setup UI event listeners
  setupUI();

  // Initialize visualization and particle systems
  poseVisualizer = new PoseVisualizer();
  particleSystem = new ParticleSystem();
  smokeSystem = new SmokeSystem();
  fireworksSystem = new FireworksSystem();

  // Set initial frame rate
  frameRate(60);

  // console.log("ImproterAI Pose Detection initialized");
  // console.log("Skeleton connections:", connections);
}

function draw() {
  // Clear background
  background(0);

  // Only draw video and pose detection if camera is active
  if (isCameraActive) {
    // Calculate scaling factors for pose coordinates
    scaleX = width / video.width;
    scaleY = height / video.height;

    // Draw the webcam video with opacity control
    push(); // Isolate drawing state for camera
    tint(255, cameraOpacity);

    if (cameraMirror) {
      // Mirror the camera horizontally
      translate(width, 0);
      scale(-1, 1);
    }

    // Draw video at full canvas size (no cropping)
    image(video, 0, 0, width, height);

    pop(); // Restore drawing state

    // Draw the skeleton connections
    // drawSkeleton();

    // Draw all the tracked landmark points
    // drawKeypoints();

    // Display pose count (hidden in presentation mode)
    if (!isPresentationMode) {
      displayPoseInfo();
    }

    // Handle presentation mode automatic switching
    if (isPresentationMode) {
      handlePresentationMode();
    }

    // Paint visualizations on the same canvas
    paintOnCanvas();

    // Update and draw particles
    updateParticles();

    // Handle mode switching from growing circles to fireworks
    handleModeSwitching();
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

        // Calculate coordinates with mirroring
        let x1 = pointA.x * scaleX;
        let y1 = pointA.y * scaleY;
        let x2 = pointB.x * scaleX;
        let y2 = pointB.y * scaleY;

        // Flip X coordinates if camera is mirrored
        if (cameraMirror) {
          x1 = width - x1;
          x2 = width - x2;
        }

        line(x1, y1, x2, y2);
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

        // Calculate coordinates with mirroring
        let x = keypoint.x * scaleX;
        let y = keypoint.y * scaleY;

        // Flip X coordinate if camera is mirrored
        if (cameraMirror) {
          x = width - x;
        }

        circle(x, y, visualSettings.keypointSize);
      }
    }
  }
}

function displayPoseInfo() {
  // Display pose count and particle count in top-left corner
  fill(255);
  noStroke();
  textAlign(LEFT);
  textSize(16);
  text(`Poses: ${poses.length}`, 10, 25);

  // Show particle count for performance monitoring
  if (poseVisualizer.paintMode === "particles") {
    const particleCount = particleSystem.getTotalParticles();
    text(`Particles: ${particleCount}`, 10, 45);
  } else if (poseVisualizer.paintMode === "fireworks") {
    const fireworksCount = fireworksSystem.fireworks.length;
    text(`Fireworks: ${fireworksCount}`, 10, 45);
  } else if (poseVisualizer.paintMode === "smoke") {
    const smokeCount = smokeSystem.getTotalParticles();
    text(`Smoke: ${smokeCount}`, 10, 45);
  }
}

// Callback function for when bodyPose outputs data
function gotPoses(results) {
  // Save the output to the poses variable
  poses = results;

  // Log pose data for debugging (optional)
  // if (poses.length > 0) {
  //   console.log(`Detected ${poses.length} pose(s)`);
  // }
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

  // Fullscreen toggle button
  const fullscreenToggle = document.getElementById("fullscreen-toggle");
  fullscreenToggle.addEventListener("click", toggleFullscreen);

  // Presentation mode toggle button
  const presentationToggle = document.getElementById("presentation-toggle");
  presentationToggle.addEventListener("click", togglePresentationMode);

  // Keyboard support for fullscreen and presentation mode
  document.addEventListener("keydown", (e) => {
    if (e.key === "F11" || (e.key === "Escape" && (isFullscreen || isPresentationMode))) {
      e.preventDefault();
      if (isPresentationMode) {
        togglePresentationMode();
      } else {
        toggleFullscreen();
      }
    }
  });

  // Handle native fullscreen changes
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
  document.addEventListener("mozfullscreenchange", handleFullscreenChange);
  document.addEventListener("MSFullscreenChange", handleFullscreenChange);

  // Space bar to trigger fireworks mode (only when in circles mode)
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault(); // prevent page scroll
      console.log("Space pressed! Current mode:", poseVisualizer.paintMode);

      // Only switch to fireworks if currently in circles mode
      if (poseVisualizer.paintMode === "circles") {
        poseVisualizer.setMode("fireworks");
        fireworksSystem.setEnabled(true);
        fireworksSystem.clear(); // clear old fireworks
        console.log("Switched to fireworks mode");
      } else {
        console.log("Space bar ignored - not in circles mode");
      }
    }
  });

  // Paint mode selector
  const paintModeSelect = document.getElementById("paint-mode");
  paintModeSelect.addEventListener("change", (e) => {
    poseVisualizer.setMode(e.target.value);

    // Show/hide particle controls based on mode
    const noiseControls = document.getElementById("noise-controls");
    const burstControls = document.getElementById("burst-controls");
    const paintingControls = document.getElementById("painting-controls");
    const particleCountControls = document.getElementById("particle-count-controls");
    const particleSizeControls = document.getElementById("particle-size-controls");
    const smokeDensityControls = document.getElementById("smoke-density-controls");
    const windStrengthControls = document.getElementById("wind-strength-controls");
    const smokeSizeControls = document.getElementById("smoke-size-controls");

    if (e.target.value === "particles") {
      noiseControls.style.display = "flex";
      burstControls.style.display = "flex";
      paintingControls.style.display = "flex";
      particleCountControls.style.display = "flex";
      particleSizeControls.style.display = "flex";
      smokeDensityControls.style.display = "none";
      windStrengthControls.style.display = "none";
    } else if (e.target.value === "smoke") {
      noiseControls.style.display = "none";
      burstControls.style.display = "none";
      paintingControls.style.display = "none";
      particleCountControls.style.display = "none";
      particleSizeControls.style.display = "none";
      smokeDensityControls.style.display = "flex";
      windStrengthControls.style.display = "flex";
      smokeSizeControls.style.display = "flex";
    } else {
      noiseControls.style.display = "none";
      burstControls.style.display = "none";
      paintingControls.style.display = "none";
      particleCountControls.style.display = "none";
      particleSizeControls.style.display = "none";
      smokeDensityControls.style.display = "none";
      windStrengthControls.style.display = "none";
      smokeSizeControls.style.display = "none";
    }
  });

  // Color picker
  const colorPicker = document.getElementById("paint-color");
  colorPicker.addEventListener("change", (e) => {
    poseVisualizer.setColor(e.target.value);
  });

  // Size slider
  const sizeSlider = document.getElementById("paint-size");
  const sizeValue = document.getElementById("size-value");
  sizeSlider.addEventListener("input", (e) => {
    const size = parseInt(e.target.value);
    poseVisualizer.setSize(size);
    sizeValue.textContent = size;
  });

  // Opacity slider
  const opacitySlider = document.getElementById("opacity");
  const opacityValue = document.getElementById("opacity-value");
  opacitySlider.addEventListener("input", (e) => {
    const opacity = parseInt(e.target.value);
    poseVisualizer.setOpacity(opacity);
    opacityValue.textContent = opacity + "%";
  });

  // Camera opacity slider
  const cameraOpacitySlider = document.getElementById("camera-opacity");
  const cameraOpacityValue = document.getElementById("camera-opacity-value");
  cameraOpacitySlider.addEventListener("input", (e) => {
    cameraOpacity = parseInt(e.target.value);
    cameraOpacityValue.textContent = cameraOpacity + "%";
  });

  // Camera mirror checkbox
  const cameraMirrorCheckbox = document.getElementById("camera-mirror");
  const cameraMirrorValue = document.getElementById("camera-mirror-value");
  cameraMirrorCheckbox.addEventListener("change", (e) => {
    cameraMirror = e.target.checked;
    cameraMirrorValue.textContent = cameraMirror ? "On" : "Off";
  });

  // Noise strength slider
  const noiseStrengthSlider = document.getElementById("noise-strength");
  const noiseStrengthValue = document.getElementById("noise-strength-value");
  noiseStrengthSlider.addEventListener("input", (e) => {
    const strength = parseInt(e.target.value);
    particleSystem.setNoiseStrength(strength / 100); // Convert to 0-2 range
    noiseStrengthValue.textContent = strength + "%";
  });

  // Burst timing slider
  const burstTimingSlider = document.getElementById("burst-timing");
  const burstTimingValue = document.getElementById("burst-timing-value");
  burstTimingSlider.addEventListener("input", (e) => {
    const timing = parseInt(e.target.value);
    particleSystem.setBurstParameters(timing, 8, 2); // interval, burstSize, minParticles
    burstTimingValue.textContent = (timing / 1000).toFixed(1) + "s";
  });

  // Painting intensity slider
  const paintingIntensitySlider = document.getElementById("painting-intensity");
  const paintingIntensityValue = document.getElementById("painting-intensity-value");
  paintingIntensitySlider.addEventListener("input", (e) => {
    const intensity = parseInt(e.target.value);
    particleSystem.setPaintingIntensity(intensity);
    paintingIntensityValue.textContent = intensity + "ms";
  });

  // Particle count slider
  const particleCountSlider = document.getElementById("particle-count");
  const particleCountValue = document.getElementById("particle-count-value");
  particleCountSlider.addEventListener("input", (e) => {
    const count = parseInt(e.target.value);
    particleSystem.setParticleCount(count);
    particleCountValue.textContent = count;
  });

  // Particle size slider
  const particleSizeSlider = document.getElementById("particle-size");
  const particleSizeValue = document.getElementById("particle-size-value");
  particleSizeSlider.addEventListener("input", (e) => {
    const size = parseInt(e.target.value);
    particleSystem.setParticleSize(size);
    particleSizeValue.textContent = size + "px";
  });

  // Smoke density slider
  const smokeDensitySlider = document.getElementById("smoke-density");
  const smokeDensityValue = document.getElementById("smoke-density-value");
  smokeDensitySlider.addEventListener("input", (e) => {
    const density = parseInt(e.target.value);
    smokeSystem.setSmokeDensity(density);
    smokeDensityValue.textContent = density;
  });

  // Wind strength slider
  const windStrengthSlider = document.getElementById("wind-strength");
  const windStrengthValue = document.getElementById("wind-strength-value");
  windStrengthSlider.addEventListener("input", (e) => {
    const strength = parseInt(e.target.value);
    smokeSystem.setWindStrength(strength);
    windStrengthValue.textContent = strength + "%";
  });

  // Smoke size slider
  const smokeSizeSlider = document.getElementById("smoke-size");
  const smokeSizeValue = document.getElementById("smoke-size-value");
  smokeSizeSlider.addEventListener("input", (e) => {
    const size = parseInt(e.target.value);
    smokeSystem.setSmokeSize(size);
    smokeSizeValue.textContent = size + "px";
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

// Toggle fullscreen mode
function toggleFullscreen() {
  const button = document.getElementById("fullscreen-toggle");
  const container = document.querySelector(".container");

  if (!isFullscreen) {
    // Enter fullscreen using browser API
    if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if (container.webkitRequestFullscreen) {
      container.webkitRequestFullscreen();
    } else if (container.msRequestFullscreen) {
      container.msRequestFullscreen();
    }

    container.classList.add("fullscreen-mode");
    isFullscreen = true;
    button.textContent = "📱 Exit Fullscreen";
    button.classList.remove("btn-secondary");
    button.classList.add("btn-primary");

    // Calculate fullscreen canvas size maintaining aspect ratio
    setTimeout(() => {
      const aspectRatio = 640 / 480; // 4:3 aspect ratio
      let canvasWidth, canvasHeight;

      if (window.innerWidth / window.innerHeight > aspectRatio) {
        // Screen is wider than video aspect ratio
        canvasHeight = window.innerHeight;
        canvasWidth = canvasHeight * aspectRatio;
      } else {
        // Screen is taller than video aspect ratio
        canvasWidth = window.innerWidth;
        canvasHeight = canvasWidth / aspectRatio;
      }

      resizeCanvas(canvasWidth, canvasHeight);

      // Set frame rate to 30 FPS for fullscreen performance
      frameRate(30);
    }, 100);
  } else {
    // Exit fullscreen
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }

    container.classList.remove("fullscreen-mode");
    isFullscreen = false;
    button.textContent = "🖥️ Fullscreen";
    button.classList.remove("btn-primary");
    button.classList.add("btn-secondary");

    // Resize canvas back to normal
    resizeCanvas(640, 480);

    // Reset frame rate to 60 FPS for normal mode
    frameRate(60);
  }
}

// Toggle presentation mode
function togglePresentationMode() {
  const button = document.getElementById("presentation-toggle");
  const container = document.querySelector(".container");

  if (!isPresentationMode) {
    // Enter presentation mode - use native fullscreen API
    if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if (container.webkitRequestFullscreen) {
      container.webkitRequestFullscreen();
    } else if (container.msRequestFullscreen) {
      container.msRequestFullscreen();
    }

    container.classList.add("presentation-mode");
    isPresentationMode = true;
    button.textContent = "🎭 Exit Presentation";
    button.classList.remove("btn-secondary");
    button.classList.add("btn-primary");

    // Set frame rate for presentation
    frameRate(30);

    // Set optimal opacity values for presentation
    cameraOpacity = 25; // 25% camera opacity
    poseVisualizer.setOpacity(90); // 90% paint opacity

    // Update UI sliders to reflect the changes
    const cameraOpacitySlider = document.getElementById("camera-opacity");
    const paintOpacitySlider = document.getElementById("opacity");
    const cameraOpacityValue = document.getElementById("camera-opacity-value");
    const paintOpacityValue = document.getElementById("opacity-value");

    if (cameraOpacitySlider) cameraOpacitySlider.value = 25;
    if (paintOpacitySlider) paintOpacitySlider.value = 90;
    if (cameraOpacityValue) cameraOpacityValue.textContent = "25%";
    if (paintOpacityValue) paintOpacityValue.textContent = "90%";

    // Calculate fullscreen canvas size maintaining aspect ratio
    setTimeout(() => {
      const aspectRatio = 640 / 480; // 4:3 aspect ratio
      let canvasWidth, canvasHeight;

      if (window.innerWidth / window.innerHeight > aspectRatio) {
        // Screen is wider than video aspect ratio
        canvasHeight = window.innerHeight;
        canvasWidth = canvasHeight * aspectRatio;
      } else {
        // Screen is taller than video aspect ratio
        canvasWidth = window.innerWidth;
        canvasHeight = canvasWidth / aspectRatio;
      }

      resizeCanvas(canvasWidth, canvasHeight);
    }, 100);
  } else {
    // Exit presentation mode
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }

    container.classList.remove("presentation-mode");
    isPresentationMode = false;
    button.textContent = "🎭 Presentation Mode";
    button.classList.remove("btn-primary");
    button.classList.add("btn-secondary");

    // Reset frame rate
    frameRate(60);

    // Reset opacity values to defaults
    cameraOpacity = 100; // Reset to 100% camera opacity
    poseVisualizer.setOpacity(80); // Reset to 80% paint opacity

    // Update UI sliders to reflect the changes
    const cameraOpacitySlider = document.getElementById("camera-opacity");
    const paintOpacitySlider = document.getElementById("opacity");
    const cameraOpacityValue = document.getElementById("camera-opacity-value");
    const paintOpacityValue = document.getElementById("opacity-value");

    if (cameraOpacitySlider) cameraOpacitySlider.value = 100;
    if (paintOpacitySlider) paintOpacitySlider.value = 80;
    if (cameraOpacityValue) cameraOpacityValue.textContent = "100%";
    if (paintOpacityValue) paintOpacityValue.textContent = "80%";

    // Resize canvas back to normal
    resizeCanvas(640, 480);
  }
}

// Handle presentation mode automatic switching
function handlePresentationMode() {
  const personCount = poses.length;

  // Don't override fireworks mode - let it stay active
  if (poseVisualizer.paintMode === "fireworks") {
    return; // Keep fireworks mode active
  }

  if (personCount === 1) {
    // One person - use smoke system
    if (poseVisualizer.paintMode !== "smoke") {
      poseVisualizer.setMode("smoke");
      // Don't update UI selector in presentation mode
    }
  } else if (personCount > 1) {
    // Multiple people - use growing circles
    if (poseVisualizer.paintMode !== "circles") {
      poseVisualizer.setMode("circles");
      // Don't update UI selector in presentation mode
    }
  }
}

// Handle mode switching from growing circles to fireworks
function handleModeSwitching() {
  // Only handle mode switching in presentation mode
  if (!isPresentationMode) return;

  // Check if growing circles mode wants to switch to fireworks
  // if (poseVisualizer.triggerFireworksMode) {
  //   // switch to dedicated fireworks mode (separate system)
  //   poseVisualizer.setMode("fireworks");
  //   fireworksSystem.setEnabled(true);
  //   fireworksSystem.updateAndDraw();
  //   poseVisualizer.resetHandsUpTracking();
  //   // No UI change — fireworks is trigger-only
  // }

  // Check if we're in fireworks mode and should go back to smoke (only 1 person)
  if (poseVisualizer.paintMode === "fireworks" && poses.length === 1) {
    poseVisualizer.setMode("smoke");
    fireworksSystem.setEnabled(false);
    // poseVisualizer.triggerFireworksMode = false;
    fireworksSystem.clear();
    // No UI change in presentation mode
  }
}

// Handle window resize
function windowResized() {
  if (isFullscreen) {
    const aspectRatio = 640 / 480;
    let canvasWidth, canvasHeight;

    if (window.innerWidth / window.innerHeight > aspectRatio) {
      canvasHeight = window.innerHeight;
      canvasWidth = canvasHeight * aspectRatio;
    } else {
      canvasWidth = window.innerWidth;
      canvasHeight = canvasWidth / aspectRatio;
    }

    resizeCanvas(canvasWidth, canvasHeight);
  }
}

// Handle native fullscreen changes
function handleFullscreenChange() {
  const isCurrentlyFullscreen = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );

  if (!isCurrentlyFullscreen && (isFullscreen || isPresentationMode)) {
    // User exited fullscreen using browser controls
    const fullscreenButton = document.getElementById("fullscreen-toggle");
    const presentationButton = document.getElementById("presentation-toggle");
    const container = document.querySelector(".container");

    if (isFullscreen) {
      container.classList.remove("fullscreen-mode");
      isFullscreen = false;
      fullscreenButton.textContent = "🖥️ Fullscreen";
      fullscreenButton.classList.remove("btn-primary");
      fullscreenButton.classList.add("btn-secondary");
    }

    if (isPresentationMode) {
      container.classList.remove("presentation-mode");
      isPresentationMode = false;
      presentationButton.textContent = "🎭 Presentation Mode";
      presentationButton.classList.remove("btn-primary");
      presentationButton.classList.add("btn-secondary");

      // Reset opacity values to defaults
      cameraOpacity = 100; // Reset to 100% camera opacity
      poseVisualizer.setOpacity(80); // Reset to 80% paint opacity

      // Update UI sliders to reflect the changes
      const cameraOpacitySlider = document.getElementById("camera-opacity");
      const paintOpacitySlider = document.getElementById("opacity");
      const cameraOpacityValue = document.getElementById("camera-opacity-value");
      const paintOpacityValue = document.getElementById("opacity-value");

      if (cameraOpacitySlider) cameraOpacitySlider.value = 100;
      if (paintOpacitySlider) paintOpacitySlider.value = 80;
      if (cameraOpacityValue) cameraOpacityValue.textContent = "100%";
      if (paintOpacityValue) paintOpacityValue.textContent = "80%";
    }

    resizeCanvas(640, 480);

    // Reset frame rate to 60 FPS when exiting fullscreen
    frameRate(60);
  }
}

// Paint visualizations directly on the main canvas
function paintOnCanvas() {
  if (poses.length === 0) return;

  // Handle particle mode separately
  if (poseVisualizer.paintMode === "particles") {
    for (let pose of poses) {
      // Create a scaled copy of the pose for particles
      let scaledPose = {
        keypoints: pose.keypoints.map((keypoint) => {
          let x = keypoint.x * scaleX;
          let y = keypoint.y * scaleY;

          // Flip X coordinate if camera is mirrored
          if (cameraMirror) {
            x = width - x;
          }

          return {
            x: x,
            y: y,
            confidence: keypoint.confidence,
          };
        }),
      };
      particleSystem.emitFromPose(scaledPose, connections, visualSettings.minConfidence);
    }
  } else if (poseVisualizer.paintMode === "fireworks") {
    // Fireworks mode: emit bursts and draw
    for (let pose of poses) {
      let scaledPose = {
        keypoints: pose.keypoints.map((keypoint) => {
          // Convert to WEBGL coordinates (centered coordinate system)
          let x = keypoint.x * scaleX - width / 2;
          let y = keypoint.y * scaleY - height / 2;

          // Flip X coordinate if camera is mirrored
          if (cameraMirror) {
            x = -x;
          }

          return { x, y, confidence: keypoint.confidence };
        }),
      };

      fireworksSystem.emitFromPose(scaledPose, visualSettings.minConfidence);
    }
    return; // Don't draw circles when in fireworks mode
  } else if (poseVisualizer.paintMode === "smoke") {
    for (let pose of poses) {
      // Create a scaled copy of the pose for smoke
      let scaledPose = {
        keypoints: pose.keypoints.map((keypoint) => {
          let x = keypoint.x * scaleX;
          let y = keypoint.y * scaleY;

          // Flip X coordinate if camera is mirrored
          if (cameraMirror) {
            x = width - x;
          }

          return {
            x: x,
            y: y,
            confidence: keypoint.confidence,
          };
        }),
      };
      smokeSystem.emitFromPose(scaledPose, visualSettings.minConfidence);
    }
  } else {
    // Use the pose visualizer for other modes with scaled poses
    let scaledPoses = poses.map((pose) => ({
      keypoints: pose.keypoints.map((keypoint) => {
        let x = keypoint.x * scaleX;
        let y = keypoint.y * scaleY;

        // Flip X coordinate if camera is mirrored
        if (cameraMirror) {
          x = width - x;
        }

        return {
          x: x,
          y: y,
          confidence: keypoint.confidence,
        };
      }),
    }));
    poseVisualizer.visualize(scaledPoses, connections, visualSettings.minConfidence);
  }
}

// Old painting functions removed - now handled by PoseVisualizer class

// Clear visualization (clear the entire canvas)
function clearVisualizationCanvas() {
  background(0);
  poseVisualizer.clearTrails();
  poseVisualizer.clearPoseTracking();
  particleSystem.clear();
  smokeSystem.clear();
  fireworksSystem.clear();
}

// Save visualization canvas
function saveVisualizationCanvas() {
  saveCanvas("pose-artwork.png");
}

// Old particle system functions removed - now handled by ParticleSystem class

// Update all particle emitters
function updateParticles() {
  // Update per-mode systems exclusively
  if (poseVisualizer.paintMode === "particles") {
    particleSystem.update();
    particleSystem.draw();
  } else if (poseVisualizer.paintMode === "fireworks") {
    fireworksSystem.updateAndDraw();
  } else if (poseVisualizer.paintMode === "smoke") {
    // Apply wind force based on mouse position (like reference code)
    // Ensure we're using the correct canvas dimensions
    let canvasWidth = width;
    let mousePosX = mouseX;

    // Clamp mouse position to canvas bounds to avoid issues
    mousePosX = constrain(mousePosX, 0, canvasWidth);

    let dx = map(mousePosX, 0, canvasWidth, -0.2, 0.2);
    let wind = createVector(dx, 0);
    smokeSystem.applyForce(wind);
    smokeSystem.run();
  }
}

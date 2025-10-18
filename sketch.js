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
  flipped: false
};

// Visual settings
const visualSettings = {
  skeletonColor: [255, 0, 0], // Red for skeleton lines
  keypointColor: [0, 255, 0], // Green for keypoints
  strokeWeight: 2,
  keypointSize: 10,
  minConfidence: 0.1
};

function preload() {
  // Load the bodyPose model with configuration
  bodyPose = ml5.bodyPose(poseConfig);
}

function setup() {
  // Create canvas and attach to container
  const canvas = createCanvas(640, 480);
  canvas.parent('sketch-container');

  // Create the video capture
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  // Start detecting poses in the webcam video
  bodyPose.detectStart(video, gotPoses);
  
  // Get the skeleton connection information
  connections = bodyPose.getSkeleton();
  
  console.log('ImproterAI Pose Detection initialized');
  console.log('Skeleton connections:', connections);
}

function draw() {
  // Clear background
  background(0);
  
  // Draw the webcam video
  image(video, 0, 0, width, height);

  // Draw the skeleton connections
  drawSkeleton();
  
  // Draw all the tracked landmark points
  drawKeypoints();
  
  // Display pose count
  displayPoseInfo();
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
      if (pointA.confidence > visualSettings.minConfidence && 
          pointB.confidence > visualSettings.minConfidence) {
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
      'nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar',
      'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow',
      'leftWrist', 'rightWrist', 'leftHip', 'rightHip',
      'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'
    ];
    
    const keypointIndex = keypointNames.indexOf(keypointName);
    if (keypointIndex !== -1) {
      return poses[poseIndex].keypoints[keypointIndex];
    }
  }
  return null;
}

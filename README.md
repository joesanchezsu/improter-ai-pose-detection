# 🎯 ImproterAI Pose Detection

A real-time pose detection and skeleton visualization project built with **p5.js** and **ml5.js**. This project uses the MoveNet model to detect human poses from webcam input and draws skeleton connections in real-time.

## ✨ Features

- **Real-time pose detection** from webcam feed
- **Skeleton visualization** with customizable colors and settings
- **Multiple pose support** using MoveNet's MULTIPOSE_LIGHTNING model
- **Confidence-based filtering** to show only reliable keypoints
- **Responsive design** with modern UI
- **Easy to extend** with utility functions for pose data access

## 🚀 Quick Start

### Prerequisites

- Node.js (version 14 or higher)
- A modern web browser with camera access
- Webcam or built-in camera

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/improter-ai-pose-detection.git
   cd improter-ai-pose-detection
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   This will start a local server at `http://localhost:8080` and automatically open it in your browser.

### Alternative Start Commands

- `npm start` - Start server without auto-opening browser
- `npm run serve` - Simple server start
- `npm run build` - No build step required (static files)

## 🎮 Usage

1. **Allow camera access** when prompted by your browser
2. **Position yourself** in front of the camera
3. **Watch the magic** as your skeleton is detected and visualized in real-time!

The application will:
- Show your webcam feed
- Detect your pose using MoveNet
- Draw red lines connecting your skeleton joints
- Display green circles on detected keypoints
- Show the number of detected poses in the top-left corner

## 🛠️ Configuration

You can customize the pose detection and visualization by modifying the configuration objects in `sketch.js`:

### Pose Detection Settings
```javascript
const poseConfig = {
  modelType: "MULTIPOSE_LIGHTNING", // Model type
  enableSmoothing: true,            // Smooth pose transitions
  minPoseScore: 0.25,              // Minimum confidence for poses
  enableTracking: true,            // Enable pose tracking
  // ... more options
};
```

### Visual Settings
```javascript
const visualSettings = {
  skeletonColor: [255, 0, 0],      // Red skeleton lines
  keypointColor: [0, 255, 0],      // Green keypoints
  strokeWeight: 2,                 // Line thickness
  keypointSize: 10,                // Keypoint circle size
  minConfidence: 0.1               // Minimum keypoint confidence
};
```

## 📊 Pose Data Access

The project includes utility functions to access pose data:

```javascript
// Get all pose data
const poses = getPoseData();

// Get specific keypoint (e.g., left wrist)
const leftWrist = getKeypoint(0, 'leftWrist');

// Available keypoint names:
// 'nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar',
// 'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow',
// 'leftWrist', 'rightWrist', 'leftHip', 'rightHip',
// 'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'
```

## 🏗️ Project Structure

```
improter-ai-pose-detection/
├── index.html          # Main HTML file with UI
├── sketch.js           # p5.js sketch with pose detection logic
├── package.json        # npm configuration and scripts
├── README.md          # This file
└── .gitignore         # Git ignore rules
```

## 🔧 Technologies Used

- **[p5.js](https://p5js.org/)** - Creative coding library for web
- **[ml5.js](https://ml5js.org/)** - Friendly machine learning for the web
- **[MoveNet](https://www.tensorflow.org/hub/tutorials/movenet)** - Google's pose detection model
- **[http-server](https://www.npmjs.com/package/http-server)** - Simple static file server

## 🎨 Customization Ideas

- **Add pose classification** (e.g., detecting specific exercises)
- **Create pose-based games** (e.g., Simon Says with poses)
- **Implement pose recording** and playback
- **Add pose comparison** features
- **Create fitness tracking** applications
- **Build gesture recognition** systems

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [ml5.js](https://ml5js.org/) team for the amazing machine learning library
- [p5.js](https://p5js.org/) community for the creative coding platform
- Google's [MoveNet](https://www.tensorflow.org/hub/tutorials/movenet) team for the pose detection model

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/improter-ai-pose-detection/issues) page
2. Create a new issue with detailed information
3. Make sure your browser supports WebGL and camera access

---

**Happy coding! 🎉**

/* ------------------------------------------
 * Fireworks System (Permanent Mode)
 * - Continuous fireworks from keypoints
 * - Glow, trails, additive blending
 * - Particle pooling for performance
 * -----------------------------------------*/

class Spark {
  constructor() {
    this.pos = createVector(0, 0);
    this.prev = this.pos.copy();
    this.vel = createVector(0, 0);
    this.life = 0;
    this.decay = 0;
    this.size = 0;
    this.color = { r: 255, g: 255, b: 255 };
    this.active = false;
  }

  init(x, y, angle, speed, size, colorHex) {
    this.pos.set(x, y);
    this.prev.set(x, y);
    this.vel = p5.Vector.fromAngle(angle).mult(speed);
    this.life = 255;
    this.decay = random(3, 6);
    this.size = size;
    this.color = this.hexToRgb(colorHex);
    this.active = true;
  }

  hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m
      ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
      : { r: 255, g: 255, b: 255 };
  }

  update() {
    if (!this.active) return;
    this.prev.set(this.pos);

    this.vel.mult(0.992);
    this.vel.y += 0.07;
    this.vel.x += random(-0.05, 0.05);
    this.vel.y += random(-0.03, 0.03);

    this.pos.add(this.vel);
    this.life -= this.decay * 0.7;
    if (this.life <= 0) this.active = false;
  }

  draw() {
    if (!this.active) return;
    const flicker = 0.7 + 0.3 * sin(frameCount * 0.4 + this.pos.x * 0.02);

    // Trail
    stroke(this.color.r, this.color.g, this.color.b, this.life * 0.5 * flicker);
    strokeWeight(this.size * 0.6);
    line(this.prev.x, this.prev.y, this.pos.x, this.pos.y);

    // Core
    noStroke();
    fill(this.color.r, this.color.g, this.color.b, this.life * flicker);
    circle(this.pos.x, this.pos.y, this.size * 1.3);
  }
}

class Firework {
  constructor(x, y, colorHex, sparkPool) {
    this.sparks = [];
    const n = 90; // sparks per burst
    for (let i = 0; i < n; i++) {
      const angle = (TWO_PI * i) / n + random(-0.03, 0.03);
      const speed = random(2.5, 6.5);
      const spark = sparkPool.get();
      spark.init(x, y, angle, speed, random(3.5, 7), colorHex);
      this.sparks.push(spark);
    }
  }

  update() {
    for (const s of this.sparks) s.update();
    this.sparks = this.sparks.filter((s) => s.active);
  }

  draw() {
    push();
    blendMode(ADD);
    for (const s of this.sparks) s.draw();
    pop();
  }

  isDead() {
    return this.sparks.length === 0;
  }
}

class SparkPool {
  constructor(size = 1200) {
    this.pool = [];
    for (let i = 0; i < size; i++) this.pool.push(new Spark());
    this.cursor = 0;
  }

  get() {
    const spark = this.pool[this.cursor++];
    this.cursor %= this.pool.length;
    return spark;
  }
}

class FireworksSystem {
  constructor() {
    this.sparkPool = new SparkPool(1200);
    this.fireworks = [];

    this.colorPalette = [
      "#FF006E",
      "#FFBE0B",
      "#3A86FF",
      "#8338EC",
      "#FB5607",
      "#00F5D4",
    ];

    this.enabled = true;
    this.emitInterval = 50; // ms between bursts per keypoint (very responsive for testing)
    this.lastEmit = 0;
  }

  emitFromPose(pose, minConfidence = 0.1) {
    if (!this.enabled || !pose || millis() - this.lastEmit < this.emitInterval) {
      return;
    }

    for (let j = 0; j < pose.keypoints.length; j++) {
      const k = pose.keypoints[j];
      if (k && k.confidence > minConfidence) {
        const color = this.colorPalette[Math.floor(random(this.colorPalette.length))];
        this.trigger(k.x, k.y, color);
      }
    }

    this.lastEmit = millis();
  }

  trigger(x, y, colorHex) {
    this.fireworks.push(new Firework(x, y, colorHex, this.sparkPool));
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

  setEnabled(on) {
    this.enabled = on;
    if (on) {
      // Reset emission timing when enabling fireworks
      this.lastEmit = 0;
    }
  }
}

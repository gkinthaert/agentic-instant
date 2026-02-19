// Basic 3D arena FPS with one AI enemy

let scene, camera, renderer;
let player, enemy;
let raycaster;
let keys = {};
let lastTime = 0;
let playing = false;

const arenaSize = 40;
const playerSpeed = 14;
const turnSpeed = 2.5;
const enemySpeed = 5; // Slower enemy for easier targeting

let health = 100;
let score = 0;
const shootCooldown = 0.2; // Faster shooting
let shootTimer = 0;

const enemyShootCooldown = 1.6;
let enemyShootTimer = 0;

let muzzleFlash;
let bulletTrails = []; // Array to store bullet trajectory lines

let healthEl, scoreEl, finalScoreEl, startBtn, restartBtn, gameOverModal;

function init() {
  try {
    console.log("Starting initialization...");
    
    if (typeof THREE === "undefined") {
      console.error("Three.js is not loaded!");
      showError("Three.js failed to load. Please check the console for details.");
      return false;
    }

    console.log("Three.js loaded, version:", THREE.REVISION);
    
    raycaster = new THREE.Raycaster();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);

    camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );

    const canvas = document.getElementById("game-canvas");
    if (!canvas) {
      console.error("Canvas element not found!");
      return false;
    }

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xf9fafb, 0x020617, 0.8);
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xf97316, 1.3);
    dirLight.position.set(30, 40, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Ground
    const groundGeo = new THREE.CircleGeometry(arenaSize, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0b1120,
      metalness: 0.2,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Arena ring
    const ringGeo = new THREE.RingGeometry(arenaSize - 0.3, arenaSize, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    // Walls
    const wallGeo = new THREE.CylinderGeometry(arenaSize - 0.2, arenaSize - 0.2, 4, 48, 1, true);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x020617,
      metalness: 0.6,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = 2;
    scene.add(walls);

    // Player
    const playerGeo = new THREE.BoxGeometry(0.8, 1.4, 0.8);
    const playerMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      metalness: 0.6,
      roughness: 0.25,
    });
    player = new THREE.Mesh(playerGeo, playerMat);
    player.castShadow = true;
    player.position.set(0, 1.4, 0);
    scene.add(player);

    // Enemy - Monster made of multiple parts
    enemy = new THREE.Group();
    
    // Body (larger, more menacing)
    const bodyGeo = new THREE.CylinderGeometry(0.6, 0.8, 1.6, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x8b0000,
      metalness: 0.3,
      roughness: 0.7,
      emissive: 0x4a0000,
      emissiveIntensity: 0.5,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    body.castShadow = true;
    enemy.add(body);
    
    // Head (larger, more prominent)
    const headGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xcc0000,
      metalness: 0.2,
      roughness: 0.8,
      emissive: 0x660000,
      emissiveIntensity: 0.6,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.8;
    head.castShadow = true;
    enemy.add(head);
    
    // Eyes (glowing red)
    const eyeGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 2,
    });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.2, 1.9, 0.4);
    enemy.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.2, 1.9, 0.4);
    enemy.add(rightEye);
    
    // Spikes on back
    for (let i = 0; i < 5; i++) {
      const spikeGeo = new THREE.ConeGeometry(0.08, 0.3, 6);
      const spikeMat = new THREE.MeshStandardMaterial({
        color: 0x990000,
        emissive: 0x330000,
        emissiveIntensity: 0.3,
      });
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.set(
        (i - 2) * 0.15,
        1.2 + Math.random() * 0.3,
        -0.3
      );
      spike.rotation.x = Math.PI;
      enemy.add(spike);
    }
    
    // Arms (tentacle-like)
    const armGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.2, 6);
    const armMat = new THREE.MeshStandardMaterial({
      color: 0x990000,
      emissive: 0x330000,
      emissiveIntensity: 0.4,
    });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.7, 1.0, 0);
    leftArm.rotation.z = Math.PI / 4;
    enemy.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.7, 1.0, 0);
    rightArm.rotation.z = -Math.PI / 4;
    enemy.add(rightArm);
    
    enemy.castShadow = true;
    enemy.position.set(8, 0, -8);
    enemy.userData = {
      targetAngle: Math.random() * Math.PI * 2,
      changeDirTimer: 0,
    };
    scene.add(enemy);

    // Muzzle flash
    const muzzleGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const muzzleMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0,
    });
    muzzleFlash = new THREE.Mesh(muzzleGeo, muzzleMat);
    scene.add(muzzleFlash);

    camera.position.set(0, 1.6, 0);
    camera.rotation.order = "YXZ";

    window.addEventListener("resize", onWindowResize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    lastTime = performance.now() / 1000;
    animate();
    
    console.log("Initialization complete!");
    return true;
  } catch (error) {
    console.error("Error during initialization:", error);
    showError("Initialization failed: " + error.message);
    return false;
  }
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #ef4444; color: white; padding: 15px 20px; border-radius: 8px; z-index: 10000; font-family: sans-serif; max-width: 500px;';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 10000);
}

function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(e) {
  // Prevent the page from scrolling with arrow keys / space while playing
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Space", "Spacebar"].includes(
      e.key
    ) ||
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)
  ) {
    e.preventDefault();
  }

  const name = e.code || e.key;
  keys[name] = true;
}

function onKeyUp(e) {
  const name = e.code || e.key;
  keys[name] = false;
}

function resetGame() {
  health = 100;
  score = 0;
  if (healthEl) healthEl.textContent = health;
  if (scoreEl) scoreEl.textContent = score;

  if (player) {
    player.position.set(0, 1.4, 0);
    player.rotation.set(0, 0, 0);
  }
  if (camera) {
    camera.position.set(0, 1.6, 0);
    camera.rotation.set(0, 0, 0);
  }
  if (enemy) {
    enemy.position.set(8, 0, -8);
    enemy.userData = {
      targetAngle: Math.random() * Math.PI * 2,
      changeDirTimer: 0,
    };
  }
  
  // Clear bullet trails
  bulletTrails.forEach(trail => {
    scene.remove(trail.line);
    trail.line.geometry.dispose();
    trail.line.material.dispose();
  });
  bulletTrails = [];

  shootTimer = 0;
  enemyShootTimer = 0;
}

function startGame() {
  console.log("Start game clicked");
  try {
    resetGame();
    if (gameOverModal) {
      gameOverModal.classList.add("hidden");
    }
    playing = true;
    console.log("Game started, playing =", playing);
  } catch (error) {
    console.error("Error starting game:", error);
  }
}

function endGame() {
  playing = false;
  if (finalScoreEl) finalScoreEl.textContent = score;
  if (gameOverModal) gameOverModal.classList.remove("hidden");
}

function updatePlayer(dt) {
  if (!player || !camera) return;
  
  const rotateLeft = keys["ArrowLeft"] || keys["Left"];
  const rotateRight = keys["ArrowRight"] || keys["Right"];
  const moveForward = keys["ArrowUp"];
  const moveBackward = keys["ArrowDown"];

  if (rotateLeft) {
    camera.rotation.y += turnSpeed * dt;
  }
  if (rotateRight) {
    camera.rotation.y -= turnSpeed * dt;
  }

  const forward = new THREE.Vector3(
    -Math.sin(camera.rotation.y),
    0,
    -Math.cos(camera.rotation.y)
  );

  let moveDir = new THREE.Vector3();

  if (moveForward) moveDir.add(forward);
  if (moveBackward) moveDir.sub(forward);

  if (moveDir.lengthSq() > 0) {
    moveDir.normalize();
    const moveStep = moveDir.multiplyScalar(playerSpeed * dt);
    player.position.add(moveStep);
    camera.position.add(moveStep);

    const clampPos = (obj) => {
      const r = arenaSize - 1.8;
      const len = Math.sqrt(obj.position.x * obj.position.x + obj.position.z * obj.position.z);
      if (len > r) {
        obj.position.x = (obj.position.x / len) * r;
        obj.position.z = (obj.position.z / len) * r;
      }
    };
    clampPos(player);
    clampPos(camera);
  }

  player.rotation.y = camera.rotation.y;
}

function updateEnemy(dt) {
  if (!enemy || !player) return;
  
  // Enemy is a group, use its position directly
  const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.position);
  const distance = toPlayer.length();

  if (!enemy.userData) {
    enemy.userData = {
      targetAngle: Math.random() * Math.PI * 2,
      changeDirTimer: 0,
    };
  }

  enemy.userData.changeDirTimer -= dt;

  if (distance > 4 && distance < arenaSize - 2) {
    const dir = toPlayer.clone().setY(0).normalize();
    const step = dir.multiplyScalar(enemySpeed * dt);
    enemy.position.add(step);
  } else {
    if (enemy.userData.changeDirTimer <= 0) {
      enemy.userData.targetAngle = Math.random() * Math.PI * 2;
      enemy.userData.changeDirTimer = 1.8 + Math.random() * 1.2;
    }
    const dir = new THREE.Vector3(
      Math.cos(enemy.userData.targetAngle),
      0,
      Math.sin(enemy.userData.targetAngle)
    );
    const step = dir.multiplyScalar(enemySpeed * 0.6 * dt);
    enemy.position.add(step);
  }

  const r = arenaSize - 1.8;
  const len = Math.sqrt(enemy.position.x * enemy.position.x + enemy.position.z * enemy.position.z);
  if (len > r) {
    enemy.position.x = (enemy.position.x / len) * r;
    enemy.position.z = (enemy.position.z / len) * r;
  }
  
  // Slight bobbing animation for monster
  enemy.position.y = Math.sin(Date.now() * 0.003) * 0.1;

  // Make enemy face player
  const enemyPos = enemy.position;
  enemy.lookAt(player.position.x, enemyPos.y, player.position.z);

  if (distance < 2.2) {
    applyDamage(12 * dt);
  }

  enemyShootTimer -= dt;
  if (enemyShootTimer <= 0 && distance < 22) {
    enemyShootTimer = enemyShootCooldown;
    enemyShoot();
  }
}

function applyDamage(amount) {
  health -= amount;
  if (health < 0) health = 0;
  if (healthEl) healthEl.textContent = Math.round(health);
  if (health <= 0) {
    endGame();
  }
}

function shoot() {
  if (!raycaster || !camera || !enemy) return;
  if (shootTimer > 0) return;
  shootTimer = shootCooldown;

  const origin = camera.position.clone();
  const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

  raycaster.set(origin, direction);

  // Check intersection with all enemy parts
  let hitDistance = Infinity;
  let hit = false;
  enemy.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const intersects = raycaster.intersectObject(child, false);
      if (intersects.length > 0 && intersects[0].distance < hitDistance) {
        hitDistance = intersects[0].distance;
        hit = true;
      }
    }
  });

  // Create bullet trajectory line
  const trailLength = hit ? hitDistance : 40;
  const endPoint = origin.clone().addScaledVector(direction, trailLength);
  
  const geometry = new THREE.BufferGeometry().setFromPoints([origin, endPoint]);
  const material = new THREE.LineBasicMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: 0.8,
  });
  const trail = new THREE.Line(geometry, material);
  bulletTrails.push({
    line: trail,
    lifetime: 0.3, // Trail lasts 0.3 seconds
    maxLifetime: 0.3,
  });
  scene.add(trail);

  if (hit && hitDistance < 40) {
    score += 1;
    if (scoreEl) scoreEl.textContent = score;

    // Reset enemy position
    enemy.position.set(
      (Math.random() - 0.5) * (arenaSize - 8),
      0,
      (Math.random() - 0.5) * (arenaSize - 8)
    );
    if (enemy.userData) {
      enemy.userData.changeDirTimer = 0;
    }
  }

  if (muzzleFlash) {
    muzzleFlash.position.copy(origin).addScaledVector(direction, 1);
    muzzleFlash.material.opacity = 1;
  }
}

function enemyShoot() {
  if (!enemy || !player || !camera) return;
  
  const origin = enemy.position.clone();
  origin.y = 1.6;

  const direction = new THREE.Vector3().subVectors(camera.position, origin).normalize();

  const tempRay = new THREE.Raycaster(origin, direction, 0, 40);
  const intersects = tempRay.intersectObject(player, false);

  if (intersects.length > 0) {
    applyDamage(20);
  }
}

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now() / 1000;
  let dt = now - lastTime;
  lastTime = now;

  if (dt > 0.05) dt = 0.05;

  if (playing) {
    updatePlayer(dt);
    updateEnemy(dt);

    if (keys["Space"] || keys["Spacebar"] || keys[" "]) {
      shoot();
    }

    shootTimer -= dt;
    if (shootTimer < 0) shootTimer = 0;

    if (muzzleFlash && muzzleFlash.material.opacity > 0) {
      muzzleFlash.material.opacity = Math.max(0, muzzleFlash.material.opacity - dt * 8);
    }
    
    // Update bullet trails
    for (let i = bulletTrails.length - 1; i >= 0; i--) {
      const trail = bulletTrails[i];
      trail.lifetime -= dt;
      
      if (trail.lifetime <= 0) {
        scene.remove(trail.line);
        trail.line.geometry.dispose();
        trail.line.material.dispose();
        bulletTrails.splice(i, 1);
      } else {
        // Fade out trail
        const opacity = (trail.lifetime / trail.maxLifetime) * 0.8;
        trail.line.material.opacity = opacity;
      }
    }
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// Initialize when everything is ready
(function() {
  console.log("Script loaded, waiting for DOM and Three.js...");
  
  function initialize() {
    // Get DOM elements
    healthEl = document.getElementById("health-value");
    scoreEl = document.getElementById("score-value");
    finalScoreEl = document.getElementById("final-score");
    startBtn = document.getElementById("start-btn");
    restartBtn = document.getElementById("restart-btn");
    gameOverModal = document.getElementById("game-over");
    
    console.log("DOM elements:", {
      healthEl: !!healthEl,
      scoreEl: !!scoreEl,
      finalScoreEl: !!finalScoreEl,
      startBtn: !!startBtn,
      restartBtn: !!restartBtn,
      gameOverModal: !!gameOverModal,
      THREE: typeof THREE !== 'undefined'
    });
    
    // Check if DOM elements exist
    if (!healthEl || !scoreEl || !finalScoreEl || !startBtn || !restartBtn || !gameOverModal) {
      console.log("Waiting for DOM elements...");
      setTimeout(initialize, 100);
      return;
    }
    
    // Check if Three.js is loaded
    if (typeof THREE === 'undefined') {
      console.log("Waiting for Three.js...");
      setTimeout(initialize, 100);
      return;
    }
    
    // Everything is ready, initialize the game
    console.log("All ready! Initializing game...");
    
    // Ensure buttons are visible and clickable
    if (startBtn) {
      startBtn.style.zIndex = "100";
      startBtn.style.position = "relative";
      startBtn.style.pointerEvents = "auto";
      startBtn.addEventListener("click", startGame);
      console.log("Start button listener attached", startBtn);
      console.log("Start button styles:", window.getComputedStyle(startBtn).display);
    }
    if (restartBtn) {
      restartBtn.style.zIndex = "100";
      restartBtn.style.position = "relative";
      restartBtn.style.pointerEvents = "auto";
      restartBtn.addEventListener("click", startGame);
      console.log("Restart button listener attached");
    }
    
    // Ensure UI container is visible
    const uiContainer = document.getElementById("ui");
    if (uiContainer) {
      uiContainer.style.zIndex = "100";
      console.log("UI container z-index set");
    }
    
    const initSuccess = init();
    if (!initSuccess) {
      console.error("Game initialization failed!");
    }
    
    // Test button visibility and add visual debug
    setTimeout(() => {
      console.log("=== BUTTON VISIBILITY TEST ===");
      console.log("Start button element:", startBtn);
      console.log("Start button visible:", startBtn && startBtn.offsetParent !== null);
      console.log("Start button computed display:", startBtn ? window.getComputedStyle(startBtn).display : "N/A");
      console.log("Start button computed visibility:", startBtn ? window.getComputedStyle(startBtn).visibility : "N/A");
      console.log("Start button computed z-index:", startBtn ? window.getComputedStyle(startBtn).zIndex : "N/A");
      console.log("Start button position:", startBtn ? startBtn.getBoundingClientRect() : "N/A");
      
      // Add a visible border to help debug
      if (startBtn) {
        startBtn.style.border = "3px solid yellow";
        startBtn.style.outline = "2px solid red";
        console.log("Added debug border to start button");
      }
      
      // Check if button is actually in viewport
      if (startBtn) {
        const rect = startBtn.getBoundingClientRect();
        console.log("Button position:", {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          visible: rect.width > 0 && rect.height > 0
        });
      }
    }, 1000);
  }
  
  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();

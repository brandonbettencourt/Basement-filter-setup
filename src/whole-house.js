import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createWholeHouseModel } from './whole-house-model.js';
import './style.css';

const stage = document.querySelector('#stage');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const v = (x, y, z) => new T.Vector3(x, y, z);

function startViewer() {
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor('#232e29');
  renderer.domElement.setAttribute('aria-label', 'Whole-house filtration installation');
  stage.append(renderer.domElement);

  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 600);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minZoom = 0.5;
  controls.maxZoom = 5.5;
  controls.minPolarAngle = Math.PI / 8;
  controls.maxPolarAngle = Math.PI * 0.61;
  controls.minAzimuthAngle = -Math.PI * 0.49;
  controls.maxAzimuthAngle = Math.PI * 0.49;
  controls.mouseButtons.RIGHT = T.MOUSE.PAN;
  renderer.domElement.addEventListener('contextmenu', event => event.preventDefault());

  scene.add(new T.HemisphereLight('#f1f8ff', '#9d8e75', 2.25));
  const key = new T.DirectionalLight('#fff2dc', 2.6);
  key.position.set(-28, 86, 56);
  const fill = new T.DirectionalLight('#c0e4ff', 1.2);
  fill.position.set(40, 48, 22);
  scene.add(key, fill);

  const tags = [];
  const measurement = new T.Group();
  scene.add(measurement);

  function tag(text, position, isDimension = false, showInSide = false) {
    const element = document.createElement('span');
    element.className = isDimension ? 'tag dimension' : 'tag';
    element.textContent = text;
    stage.append(element);
    tags.push({ element, position, isDimension, showInSide });
  }

  function dimension(text, a, b, label, tickAxis, showInSide = false) {
    const tick = tickAxis === 'x' ? v(0.7, 0, 0) : v(0, 0.7, 0);
    const points = [
      a, b,
      a.clone().sub(tick), a.clone().add(tick),
      b.clone().sub(tick), b.clone().add(tick),
    ];
    measurement.add(
      new T.LineSegments(
        new T.BufferGeometry().setFromPoints(points),
        new T.LineBasicMaterial({ color: '#ffe7a4', depthTest: false }),
      ),
    );
    tag(text, label, true, showInSide);
  }

  const model = createWholeHouseModel(scene, measurement, dimension, tag);
  const dimButton = document.querySelector('#dimensions');
  let showDimensions = true;
  dimButton.addEventListener('click', () => {
    showDimensions = !showDimensions;
    measurement.visible = showDimensions;
    dimButton.setAttribute('aria-pressed', String(showDimensions));
  });

  // Luminous flow circuits rendered cleanly above opaque copper, PVC, and vessels.
  const circuits = new Map();
  function circuit(name, branches, { drain = false, speed = 0.015 } = {}) {
    const group = new T.Group();
    scene.add(group);
    const lineColor = drain ? '#ffae38' : '#4df5fd';
    const dotColor = drain ? '#ffe49e' : '#a9ffff';
    const dots = new T.MeshBasicMaterial({ color: dotColor, depthTest: false });
    const dotGeometry = new T.SphereGeometry(drain ? 0.34 : 0.3, 10, 8);
    const paths = branches.map(points => {
      const vectors = points.map(point => v(...point));
      const path = new T.CurvePath();
      for (let i = 1; i < vectors.length; i++) {
        path.add(new T.LineCurve3(vectors[i - 1], vectors[i]));
      }
      const line = new T.Line(
        new T.BufferGeometry().setFromPoints(vectors),
        new T.LineBasicMaterial({ color: lineColor, transparent: true, opacity: 0.64, depthTest: false }),
      );
      line.renderOrder = 4;
      group.add(line);
      const length = path.getLength();
      const particles = Array.from({ length: Math.max(1, Math.round(length / 5.4)) }, () => {
        const particle = new T.Mesh(dotGeometry, dots);
        particle.renderOrder = 5;
        group.add(particle);
        return particle;
      });
      return { path, length, particles };
    });
    circuits.set(name, { group, paths, speed });
  }

  const headerZ = 4.5;
  const stage1Z = 6.3;
  const tankZ = 12.0;
  const drainZ = 2.4;

  circuit('commonIn', [[[-48, 60, headerZ], [-32, 60, headerZ]]]);
  circuit('commonOut', [[[17, 60, headerZ], [48.5, 60, headerZ]]]);
  circuit('bypass', [[[-32, 60, headerZ], [17, 60, headerZ]]]);

  circuit('stage1', [[
    [-32, 60, headerZ], [-32, 53.5, headerZ], [-32, 53.5, stage1Z],
    [-18.3, 53.5, stage1Z], [-18.3, 34.0, stage1Z],
    [-15.7, 34.0, stage1Z], [-15.7, 53.5, stage1Z],
    [-5.8, 53.5, stage1Z], [-5.8, 57.0, stage1Z],
    [0.3, 57.0, stage1Z], [0.3, 57.0, 9.2],
  ]]);

  circuit('carbonService', [[
    [0.3, 57.0, 9.2], [2.0, 57.0, tankZ], [-2.2, 48.0, tankZ],
    [-2.2, 8.0, tankZ], [2.0, 8.0, tankZ], [2.0, 57.0, tankZ],
    [3.7, 57.0, 9.2], [3.7, 57.0, stage1Z], [9.5, 57.0, stage1Z],
    [9.5, 53.5, stage1Z], [9.5, 53.5, headerZ], [17.0, 53.5, headerZ],
    [17.0, 60.0, headerZ],
  ]]);

  circuit('carbonFlushSupply', [[
    [0.3, 57.0, 9.2], [2.0, 57.0, tankZ], [-2.2, 48.0, tankZ],
    [-2.2, 8.0, tankZ], [2.0, 8.0, tankZ], [2.0, 57.0, tankZ],
    [3.7, 57.0, 9.2], [3.7, 57.0, stage1Z], [9.5, 57.0, stage1Z],
    [9.5, 53.5, stage1Z], [9.5, 53.5, headerZ], [11.0, 53.5, headerZ],
  ]]);

  circuit('boilerDrain', [[[11.0, 53.5, headerZ], [11.0, 50.8, headerZ + 0.65], [11.0, 45.2, headerZ + 0.85]]], {
    drain: true,
    speed: 0.02,
  });

  // During Clack WS1.25 backwash, raw/prefiltered water bypasses internally to the house
  circuit('backwashHouse', [[
    [0.3, 57.0, 9.2], [3.7, 57.0, 9.2], [3.7, 57.0, stage1Z],
    [9.5, 57.0, stage1Z], [9.5, 53.5, stage1Z], [9.5, 53.5, headerZ],
    [17.0, 53.5, headerZ], [17.0, 60.0, headerZ],
  ]]);

  // Reverse upflow through carbon bed -> rear drain port -> ceiling PEX -> DLA-G20 air gap -> 2" PVC P-trap
  circuit('backwashDrain', [[
    [0.3, 57.0, 9.2], [2.0, 57.0, tankZ], [2.0, 8.0, tankZ],
    [5.2, 10.5, tankZ], [5.2, 48.0, tankZ], [2.0, 58.0, tankZ],
    [2.0, 58.0, drainZ], [2.0, 83.2, drainZ], [33.0, 83.2, drainZ],
    [33.0, 48.0, drainZ], [33.0, 42.0, drainZ], [33.0, 18.0, drainZ],
    [33.0, 14.5, drainZ], [34.8, 12.4, drainZ], [36.6, 14.8, drainZ],
    [36.7, 18.0, drainZ], [40.5, 18.2, 2.0], [40.5, 0.5, 2.0],
  ]], {
    drain: true,
    speed: 0.024,
  });

  circuit('relief', [[[-17.0, 56.5, stage1Z + 2.25], [-17.0, 58.9, stage1Z + 2.25]]], {
    drain: true,
    speed: 0.022,
  });

  const presets = {
    iso: { eye: v(74, 30, 126), target: v(0, 44, 6), height: 96, width: 108 },
    front: { eye: v(0, 0, 165), target: v(0, 44, 6), height: 96, width: 106 },
    side: { eye: v(126, 12, 34), target: v(2, 42, 9), height: 86, width: 48 },
    stage1: { eye: v(10, 6, 98), target: v(-17, 45, 6), height: 48, width: 44 },
    drain: { eye: v(22, 10, 112), target: v(22, 44, 5), height: 82, width: 52 },
  };

  let preset = presets.iso;
  let width = 1;
  let height = 1;
  function resize() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    if (!width || !height) return;
    const aspect = width / height;
    const vertical = Math.max(preset.height, preset.width / aspect) / 2;
    camera.left = -vertical * aspect;
    camera.right = vertical * aspect;
    camera.top = vertical;
    camera.bottom = -vertical;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  const cameras = [...document.querySelectorAll('[data-camera]')];
  function setCamera(name) {
    preset = presets[name];
    controls.target.copy(preset.target);
    camera.position.copy(preset.target).add(preset.eye);
    camera.zoom = 1;
    resize();
    controls.update();
    cameras.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.camera === name)));
  }
  cameras.forEach(button => button.addEventListener('click', () => setCamera(button.dataset.camera)));
  new ResizeObserver(resize).observe(stage);
  setCamera('iso');

  const modes = [...document.querySelectorAll('[data-mode]')];
  const description = document.querySelector('#mode-description');
  const g1El = document.querySelector('#g1-pressure');
  const g2El = document.querySelector('#g2-pressure');
  const deltaEl = document.querySelector('#delta-p');
  const vReadouts = ['v1', 'v2', 'v3'].map(id => document.getElementById(id));
  const bdEl = document.getElementById('bd');
  const wsEl = document.getElementById('ws');

  const descriptions = {
    service: 'Full 1.25″ main flows through the 20″ Big Blue sediment housing and 2.5 cu ft catalytic carbon tank to the house.',
    backwash: 'Clack WS1.25 reverses flow up through the carbon bed (~9 GPM) to the ceiling PEX drain and Eco-Tech DLA-G20 air gap while maintaining house water.',
    swap: 'Bypass bridge V2 supplies the house while V1 and V3 isolate both stages. Pressure is relieved at the Big Blue red button for safe sump removal.',
    flush: 'V3 isolates the house while the 1/2″ brass boiler drain flushes new catalytic carbon fines and lets you sample for chlorine breakthrough.',
  };

  // State: [v1, v2, v3, boiler, backwash, relief, g1Psi, g2Psi]
  const targets = {
    service: [1, 0, 1, 0, 0, 0, 62, 61],
    backwash: [1, 0, 1, 0, 1, 0, 60, 57],
    swap: [0, 1, 0, 0, 0, 0, 0, 0],
    flush: [1, 0, 0, 1, 0, 0, 61, 59],
  };

  let state = [...targets.service];
  let transition;
  let mode = 'service';
  let lastLcdKey = '';

  function syncLcd(nextMode, g2Val) {
    const psi = Math.round(g2Val);
    let status = 'SERVICE';
    let detail = `${psi} PSI · ONLINE`;
    let color = '#91efd1';
    if (nextMode === 'backwash') {
      status = 'BACKWASH';
      detail = '9 GPM · AIR GAP';
      color = '#ffbe5c';
    } else if (nextMode === 'swap') {
      status = 'ISOLATED';
      detail = `${psi} PSI · BYPASS`;
      color = '#afc0b5';
    } else if (nextMode === 'flush') {
      status = 'FLUSHING';
      detail = 'SAMPLE PORT OPEN';
      color = '#ffbe5c';
    }
    const keyStr = `${status}|${detail}|${color}`;
    if (keyStr !== lastLcdKey) {
      lastLcdKey = keyStr;
      model.updateLcd(status, detail, color);
    }
  }

  function changeMode(next) {
    if (transition || mode === next) return;
    mode = next;
    modes.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.mode === next));
      button.disabled = !reducedMotion.matches;
    });
    if (reducedMotion.matches) {
      state = [...targets[next]];
      description.textContent = descriptions[next];
      return;
    }

    let steps;
    if (next === 'swap') {
      steps = [
        { end: 0.24, state: [1, 1, 1, 0, 0, 0, 62, 61], note: 'Opening full-system bypass valve V2.' },
        { end: 0.48, state: [0, 1, 0, 0, 0, 0, 62, 61], note: 'Closing V1 and V3 to isolate both filtration stages.' },
        { end: 0.82, state: [0, 1, 0, 0, 0, 1, 0, 0], note: 'Pressing Big Blue red pressure-relief button to depressurize.' },
        { end: 1.0, state: targets.swap, note: 'System isolated at 0 PSI — ready for SW-4 sump wrench.' },
      ];
    } else if (next === 'backwash') {
      steps = [
        { end: 0.4, state: [1, 0, 1, 0, 0, 0, 62, 61], note: 'Ensuring 1.25″ main service valves are open.' },
        { end: 1.0, state: targets.backwash, note: 'Clack WS1.25 piston shifting to 9 GPM backwash via ceiling PEX & DLA-G20.' },
      ];
    } else if (next === 'flush') {
      steps = [
        { end: 0.45, state: [1, 0, 0, 0, 0, 0, 62, 61], note: 'Closing outlet valve V3 to protect house plumbing from fines.' },
        { end: 1.0, state: targets.flush, note: 'Opening 1/2″ brass boiler drain to flush carbon fines.' },
      ];
    } else {
      steps = [
        { end: 0.55, state: [1, state[1] > 0.5 ? 1 : 0, 1, 0, 0, 0, 62, 61], note: 'Opening V1/V3 and restoring normal full-flow pressure.' },
        { end: 1.0, state: targets.service, note: 'Closing bypass valve V2 for normal service.' },
      ];
    }
    transition = { start: performance.now(), initial: [...state], steps };
  }
  modes.forEach(button => button.addEventListener('click', () => changeMode(button.dataset.mode)));

  function updateMode(now) {
    if (transition) {
      const progress = Math.min(1, (now - transition.start) / 2300);
      let from = transition.initial;
      let start = 0;
      for (const step of transition.steps) {
        if (progress <= step.end) {
          const ratio = T.MathUtils.smoothstep(progress, start, step.end);
          state = from.map((val, i) => T.MathUtils.lerp(val, step.state[i], ratio));
          if (description.textContent !== step.note) description.textContent = step.note;
          break;
        }
        from = step.state;
        start = step.end;
      }
      if (progress === 1) {
        transition = undefined;
        description.textContent = descriptions[mode];
        modes.forEach(button => { button.disabled = false; });
      }
    }

    // Animate 1.25" brass ball valves V1, V2, V3
    model.valves.forEach(({ lever, openAngle, closedDir }, i) => {
      lever.rotation.z = openAngle + closedDir * (1 - state[i]) * Math.PI / 2;
      const label = state[i] > 0.98 ? 'Open' : state[i] < 0.02 ? 'Closed' : 'Turning';
      if (vReadouts[i].textContent !== label) {
        vReadouts[i].textContent = label;
        vReadouts[i].classList.toggle('open', label === 'Open');
      }
    });

    // Boiler drain wheel spin & readout
    model.boilerWheel.rotation.z = state[3] * Math.PI * 2;
    const bdLabel = state[3] > 0.75 ? 'Open' : state[3] < 0.05 ? 'Closed' : 'Turning';
    if (bdEl.textContent !== bdLabel) {
      bdEl.textContent = bdLabel;
      bdEl.classList.toggle('warn', bdLabel === 'Open');
      bdEl.classList.toggle('open', false);
    }

    // Clack WS1.25 status badge
    const wsLabel = state[4] > 0.5 ? 'Backwash' : state[0] < 0.5 ? 'Isolated' : state[3] > 0.5 ? 'Flush' : 'Service';
    if (wsEl.textContent !== wsLabel) {
      wsEl.textContent = wsLabel;
      wsEl.classList.toggle('open', wsLabel === 'Service');
      wsEl.classList.toggle('warn', wsLabel === 'Backwash' || wsLabel === 'Flush');
    }

    // Big Blue red pressure-relief button depression
    model.reliefButton.position.y = 56.15 - state[5] * 0.28;

    // Dual 0-100 PSI dial gauge needles
    model.g1Needle.rotation.z = (225 - 270 * state[6] / 100) * Math.PI / 180;
    model.g2Needle.rotation.z = (225 - 270 * state[7] / 100) * Math.PI / 180;

    const g1Text = Math.round(state[6]) + ' ';
    const g2Text = Math.round(state[7]) + ' ';
    const dpText = Math.max(0, Math.round(state[6] - state[7])) + ' ';
    if (g1El.firstChild.nodeValue !== g1Text) g1El.firstChild.nodeValue = g1Text;
    if (g2El.firstChild.nodeValue !== g2Text) g2El.firstChild.nodeValue = g2Text;
    if (deltaEl.firstChild.nodeValue !== dpText) deltaEl.firstChild.nodeValue = dpText;

    syncLcd(
      state[4] > 0.5 ? 'backwash' : state[0] < 0.25 && state[2] < 0.25 ? 'swap' : state[3] > 0.5 ? 'flush' : 'service',
      state[7],
    );

    // Circuit visibility
    const bypassOn = state[1] > 0.75;
    const inOpen = state[0] > 0.75;
    const outOpen = state[2] > 0.75;
    const backwashOn = state[4] > 0.55;
    const flushOn = state[3] > 0.55;

    circuits.get('bypass').group.visible = bypassOn;
    circuits.get('stage1').group.visible = inOpen && (outOpen || flushOn || backwashOn);
    circuits.get('carbonService').group.visible = inOpen && outOpen && !backwashOn && !flushOn;
    circuits.get('carbonFlushSupply').group.visible = inOpen && flushOn && !outOpen;
    circuits.get('boilerDrain').group.visible = inOpen && flushOn;
    circuits.get('backwashHouse').group.visible = inOpen && outOpen && backwashOn;
    circuits.get('backwashDrain').group.visible = inOpen && backwashOn;
    circuits.get('commonOut').group.visible = bypassOn || (inOpen && outOpen);
    circuits.get('relief').group.visible = state[5] > 0.25 && state[6] > 1;
  }

  const projected = v(0, 0, 0);
  renderer.setAnimationLoop(now => {
    controls.update();
    camera.updateMatrixWorld();
    updateMode(now);

    for (const { group, paths, speed } of circuits.values()) {
      if (!group.visible) continue;
      for (const { path, length, particles } of paths) {
        particles.forEach((particle, i) => {
          const movement = reducedMotion.matches ? 0 : (now * speed) / length;
          path.getPointAt((i / particles.length + movement) % 1, particle.position);
        });
      }
    }

    const sideProfile = Math.abs(controls.getAzimuthalAngle()) > 0.95;
    tags.forEach(({ element, position, isDimension, showInSide }) => {
      projected.copy(position).project(camera);
      const x = (projected.x + 1) * width / 2;
      const y = (1 - projected.y) * height / 2;
      element.hidden = (isDimension && !showDimensions) ||
        (sideProfile && !showInSide) ||
        x < 4 || y < 8 || x > width - 4 || y > height - 8;
      element.style.left = x + 'px';
      element.style.top = y + 'px';
    });

    renderer.render(scene, camera);
  });
}

try {
  startViewer();
} catch (error) {
  console.error(error);
  stage.innerHTML = '<p class="error" role="alert">The 3D model needs WebGL 2. Try a browser with hardware acceleration enabled.</p>';
}

import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createModel } from './model.js';
import './style.css';

const stage = document.querySelector('#stage');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const v = (x, y, z) => new T.Vector3(x, y, z);

function startViewer() {
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor('#232e29');
  renderer.domElement.setAttribute('aria-label', 'Basement filtration installation');
  stage.append(renderer.domElement);

  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-1, 1, 1, -1, .1, 500);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minZoom = .55;
  controls.maxZoom = 5;
  controls.minPolarAngle = Math.PI / 8;
  controls.maxPolarAngle = Math.PI * .61;
  controls.minAzimuthAngle = -Math.PI * .49;
  controls.maxAzimuthAngle = Math.PI * .49;
  controls.mouseButtons.RIGHT = T.MOUSE.PAN;
  renderer.domElement.addEventListener('contextmenu', event => event.preventDefault());

  scene.add(new T.HemisphereLight('#f1f8ff', '#9d8e75', 2.25));
  const key = new T.DirectionalLight('#fff2dc', 2.6);
  key.position.set(-22, 78, 46);
  const fill = new T.DirectionalLight('#c0e4ff', 1.2);
  fill.position.set(32, 42, 17);
  scene.add(key, fill);

  const tags = [];
  const measurement = new T.Group();
  scene.add(measurement);

  function tag(text, position, isDimension = false) {
    const element = document.createElement('span');
    element.className = isDimension ? 'tag dimension' : 'tag';
    element.textContent = text;
    stage.append(element);
    tags.push({ element, position, isDimension });
  }

  function dimension(text, a, b, label, tickAxis) {
    const tick = tickAxis === 'x' ? v(.55,0,0) : v(0,.55,0);
    const points = [a,b,a.clone().sub(tick),a.clone().add(tick),b.clone().sub(tick),b.clone().add(tick)];
    measurement.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(points),
      new T.LineBasicMaterial({ color: '#ffe7a4', depthTest: false })));
    tag(text, label, true);
  }

  const model = createModel(scene, dimension, tag);
  const dimButton = document.querySelector('#dimensions');
  let showDimensions = true;
  dimButton.addEventListener('click', () => {
    showDimensions = !showDimensions;
    measurement.visible = showDimensions;
    dimButton.setAttribute('aria-pressed', showDimensions);
  });

  // The luminous overlay remains visible outside the opaque copper and housings.
  const supply = [[-12,84,4],[-12,60,4]];
  const delivery = [[12,60,4],[12,84,4]];
  const circuits = new Map();
  function circuit(name, branches) {
    const group = new T.Group();
    scene.add(group);
    const dots = new T.MeshBasicMaterial({ color: '#a9ffff', depthTest: false });
    const dotGeometry = new T.SphereGeometry(.22, 10, 8);
    const paths = branches.map(points => {
      const vectors = points.map(point => v(...point));
      const path = new T.CurvePath();
      for (let index = 1; index < vectors.length; index++) {
        path.add(new T.LineCurve3(vectors[index - 1], vectors[index]));
      }
      const line = new T.Line(new T.BufferGeometry().setFromPoints(vectors),
        new T.LineBasicMaterial({ color: '#4df5fd', transparent: true, opacity: .62, depthTest: false }));
      line.renderOrder = 4;
      group.add(line);
      const length = path.getLength();
      const particles = Array.from({ length: Math.max(1, Math.round(length / 4.6)) }, () => {
        const particle = new T.Mesh(dotGeometry, dots);
        particle.renderOrder = 5;
        group.add(particle);
        return particle;
      });
      return { path, length, particles };
    });
    circuits.set(name, { group, paths });
  }

  circuit('common', [supply, delivery]);
  circuit('bypass', [[[-12,60,4],[12,60,4]]]);
  const filterIn = [-6.35,48,4.8], filterOut = [6.35,48,4.8];
  circuit('filters', [
    [[-12,60,4],[-12,48,4],filterIn],
    ...[-3.75,3.75].map(x => [
      filterIn,[x-.48,48,5.25],[x-.48,25,5.25],[x+.48,25,5.25],[x+.48,48,5.25],filterOut,
    ]),
    [filterOut,[12,48,4],[12,60,4]],
  ]);
  circuit('flush', [[[8.18,48,4],[8.18,45.2,4],[8.37,44.25,4.25],[8.45,43.2,4.6],[8.45,41.6,4.6]]]);

  const presets = {
    iso: { eye: v(68,29,103), target: v(0,44,3), height: 94, width: 62 },
    front: { eye: v(0,0,128), target: v(0,44,3), height: 94, width: 65 },
    side: { eye: v(115,7,11), target: v(0,33,3), height: 47, width: 32 },
    close: { eye: v(16,8,82), target: v(0,38,4), height: 37, width: 32 },
  };
  let preset = presets.iso;
  let width = 1, height = 1;
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
    cameras.forEach(button => button.setAttribute('aria-pressed', button.dataset.camera === name));
  }
  cameras.forEach(button => button.addEventListener('click', () => setCamera(button.dataset.camera)));
  new ResizeObserver(resize).observe(stage);
  setCamera('iso');

  const modes = [...document.querySelectorAll('[data-mode]')];
  const description = document.querySelector('#mode-description');
  const pressure = document.querySelector('#pressure');
  const readouts = [1,2,3].map(i => document.getElementById('v' + i));
  const descriptions = {
    service: 'Water passes through both cartridges and returns to the appliance riser.',
    swap: 'The appliance riser receives unfiltered water. The isolated manifold has been depressurized through the flush valve.',
  };
  const service = [1,0,1,0,58];
  const swap = [0,1,0,0,0];
  let state = service;
  let transition;
  let mode = 'service';

  function changeMode(next) {
    if (transition || mode === next) return;
    mode = next;
    modes.forEach(button => {
      button.setAttribute('aria-pressed', button.dataset.mode === next);
      button.disabled = !reducedMotion.matches;
    });
    if (reducedMotion.matches) {
      state = next === 'swap' ? swap : service;
      description.textContent = descriptions[next];
      return;
    }
    const steps = next === 'swap' ? [
      { end: .22, state: [1,1,1,0,58], note: 'Opening the bypass bridge.' },
      { end: .47, state: [0,1,0,0,58], note: 'Isolating the filter loop.' },
      { end: .82, state: [0,1,0,1,0], note: 'Relieving trapped pressure through the flush valve.' },
      { end: 1, state: swap, note: 'Closing the flush valve.' },
    ] : [
      { end: .61, state: [1,1,1,0,58], note: 'Opening the filter loop and restoring simulated pressure.' },
      { end: 1, state: service, note: 'Closing the bypass bridge.' },
    ];
    transition = { start: performance.now(), initial: state, steps };
  }
  modes.forEach(button => button.addEventListener('click', () => changeMode(button.dataset.mode)));

  function updateMode(now) {
    if (transition) {
      const progress = Math.min(1,(now - transition.start) / 2350);
      let from = transition.initial;
      let start = 0;
      for (const step of transition.steps) {
        if (progress <= step.end) {
          const ratio = T.MathUtils.smoothstep(progress, start, step.end);
          state = from.map((value,i) => T.MathUtils.lerp(value, step.state[i], ratio));
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
    model.valves.forEach(({lever,openAngle},i) => {
      lever.rotation.z = openAngle + (1-state[i]) * Math.PI / 2;
      const label = state[i] === 1 ? 'Open' : state[i] === 0 ? 'Closed' : 'Turning';
      if (readouts[i].textContent !== label) {
        readouts[i].textContent = label;
        readouts[i].classList.toggle('open',label === 'Open');
      }
    });
    model.flushLever.rotation.z = -state[3] * Math.PI / 2;
    model.needle.rotation.z = (225 - 270 * state[4] / 160) * Math.PI / 180;
    const psi = Math.round(state[4]) + ' ';
    if (pressure.firstChild.nodeValue !== psi) pressure.firstChild.nodeValue = psi;
    circuits.get('bypass').group.visible = state[1] > .75;
    circuits.get('filters').group.visible = state[0] > .75 && state[2] > .75;
    circuits.get('flush').group.visible = state[3] > .25 && state[4] > 1;
  }

  const projected = v(0,0,0);
  renderer.setAnimationLoop(now => {
    controls.update();
    camera.updateMatrixWorld();
    updateMode(now);
    for (const {group,paths} of circuits.values()) {
      if (!group.visible) continue;
      for (const {path,length,particles} of paths) {
        particles.forEach((particle,i) => {
          const movement = reducedMotion.matches ? 0 : now * .014 / length;
          path.getPointAt((i / particles.length + movement) % 1, particle.position);
        });
      }
    }
    tags.forEach(({element,position,isDimension}) => {
      projected.copy(position).project(camera);
      const x = (projected.x + 1) * width / 2;
      const y = (1 - projected.y) * height / 2;
      element.hidden = (isDimension && !showDimensions) ||
        x < 4 || y < 8 || x > width - 4 || y > height - 8;
      element.style.left = x + 'px';
      element.style.top = y + 'px';
    });
    renderer.render(scene,camera);
  });
}

try {
  startViewer();
} catch (error) {
  console.error(error);
  stage.innerHTML = '<p class="error" role="alert">The 3D model needs WebGL 2. Try a browser with hardware acceleration enabled.</p>';
}

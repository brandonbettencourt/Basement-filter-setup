import * as T from 'three';

const v = (x, y, z) => new T.Vector3(x, y, z);
const material = (color, metalness = 0, roughness = 0.65) =>
  new T.MeshStandardMaterial({ color, metalness, roughness });

const copper = material('#ba663c', 0.45, 0.3);
const brass = material('#c49a4e', 0.46, 0.37);
const black = material('#25292a', 0.18, 0.55);
const darkMatte = material('#1c2021', 0.12, 0.68);
const steel = material('#aebbc0', 0.47, 0.32);
const bracketWhite = material('#d8e0e2', 0.22, 0.42);
const red = material('#b62b26', 0.15, 0.48);
const pentekBlue = material('#174ea6', 0.08, 0.34);
const tankAlmond = material('#cfc1a7', 0.08, 0.44);
const pvcWhite = material('#e4e6e0', 0.04, 0.48);
const pexTube = new T.MeshStandardMaterial({
  color: '#dce9ed', transparent: true, opacity: 0.86, roughness: 0.32, metalness: 0.05,
});
const clearShield = new T.MeshStandardMaterial({
  color: '#d6f4f0', transparent: true, opacity: 0.34, roughness: 0.18, metalness: 0.05,
  side: T.DoubleSide,
});
const outletWhite = material('#e9ece8', 0.04, 0.52);

const headerZ = 4.5;
const stage1Z = 6.3;
const tankZ = 12.0;
const drainZ = 2.4;
const pipeR = 0.6875; // 1.25" Type L copper (1.375" OD)
const hubR = 0.82;
const pexR = 0.44;    // 3/4"–1" PEX drain line
const pvcR = 1.1875;  // 2" Schedule-40 PVC (2.375" OD)

function mesh(parent, geometry, mat, position) {
  const object = new T.Mesh(geometry, mat);
  object.position.copy(position);
  parent.add(object);
  return object;
}

function box(parent, mat, w, h, d, x, y, z) {
  return mesh(parent, new T.BoxGeometry(w, h, d), mat, v(x, y, z));
}

function cylinder(parent, mat, radius, from, to, sides = 32) {
  const direction = to.clone().sub(from);
  const length = direction.length();
  if (length < 1e-4) return null;
  const object = mesh(
    parent,
    new T.CylinderGeometry(radius, radius, length, sides),
    mat,
    from.clone().lerp(to, 0.5),
  );
  object.quaternion.setFromUnitVectors(v(0, 1, 0), direction.normalize());
  return object;
}

function texture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

function surface(wood) {
  let seed = wood ? 41 : 27;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const map = texture(512, 512, (ctx, w, h) => {
    const data = ctx.createImageData(w, h);
    const base = wood ? [176, 133, 87] : [106, 112, 108];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const grain = wood
          ? 11 * Math.sin(x * 0.11 + 1.8 * Math.sin(y * 0.014)) + 4 * Math.sin(x * 0.7)
          : 4 * Math.sin(x * 0.047 + y * 0.04) + 4 * Math.cos(y * 0.18);
        const shade = grain + (random() - 0.5) * (wood ? 11 : 24);
        const i = (y * w + x) * 4;
        base.forEach((channel, offset) => {
          data.data[i + offset] = Math.max(0, Math.min(255, channel + shade));
        });
        data.data[i + 3] = 255;
      }
    }
    ctx.putImageData(data, 0, 0);
    if (!wood) {
      ctx.fillStyle = '#454a45';
      ctx.fillRect(0, 225, w, 1);
      ctx.fillRect(375, 0, 1, h);
      for (const [x, y] of [[80, 100], [310, 145], [215, 370]]) {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  });
  return new T.MeshStandardMaterial({ map, roughness: 0.92 });
}

function elbow(parent, mat, from, corner, to, radius, hubRadius) {
  const curve = new T.QuadraticBezierCurve3(from, corner, to);
  mesh(parent, new T.TubeGeometry(curve, 16, radius, 16, false), mat, v(0, 0, 0));
  if (hubRadius) {
    const d1 = corner.clone().sub(from).normalize();
    const d2 = corner.clone().sub(to).normalize();
    cylinder(parent, mat, hubRadius, from.clone().addScaledVector(d1, -0.35), from.clone().addScaledVector(d1, 0.35));
    cylinder(parent, mat, hubRadius, to.clone().addScaledVector(d2, -0.35), to.clone().addScaledVector(d2, 0.35));
  }
}

function brassBallValve(scene, x, y, z, horizontal = true, closedUp = false) {
  const p = v(x, y, z);
  const axis = horizontal ? v(1, 0, 0) : v(0, 1, 0);
  const at = offset => p.clone().addScaledVector(axis, offset);
  cylinder(scene, brass, 1.08, at(-1.0), at(1.0), 8);
  for (const sign of [-1, 1]) {
    cylinder(scene, brass, 0.92, at(sign * 0.9), at(sign * 1.55), 6);
  }
  cylinder(scene, steel, 0.28, p, v(x, y, z + 1.42), 12);
  const lever = new T.Group();
  lever.position.set(x, y, z + 1.38);
  scene.add(lever);
  box(lever, red, 0.42, 3.1, 0.28, 0, 1.3, 0);
  box(lever, steel, 0.56, 0.56, 0.28, 0, 0, 0.1);
  // openAngle aligns lever along pipe axis; turning rotates 90 deg perpendicular
  const openAngle = horizontal ? -Math.PI / 2 : 0;
  const closedDir = closedUp ? 1 : -1;
  return { lever, openAngle, closedDir };
}

function brassUnion(scene, x, y, z) {
  cylinder(scene, brass, 0.92, v(x - 0.85, y, z), v(x + 0.85, y, z), 12);
  cylinder(scene, brass, 1.15, v(x - 0.42, y, z), v(x + 0.42, y, z), 6);
  for (const sign of [-1, 1]) {
    cylinder(scene, brass, 0.96, v(x + sign * 0.55, y, z), v(x + sign * 0.95, y, z), 6);
  }
}

function portAdapter(scene, x, y, z, intoRight) {
  const dir = intoRight ? 1 : -1;
  // 1.5" MNPT hex + threaded barrel transitioning to 1.25" sweat socket
  cylinder(scene, brass, 1.05, v(x - dir * 0.35, y, z), v(x + dir * 0.25, y, z), 6);
  cylinder(scene, brass, 0.95, v(x + dir * 0.25, y, z), v(x + dir * 0.92, y, z), 16);
  for (let ring = 0; ring < 4; ring++) {
    const tx = x + dir * (0.34 + ring * 0.13);
    cylinder(scene, brass, 0.99, v(tx, y, z), v(tx + dir * 0.05, y, z), 16);
  }
  cylinder(scene, brass, 0.84, v(x - dir * 0.82, y, z), v(x - dir * 0.32, y, z), 16);
}

function pressureGauge(scene, x, y, z, labelText) {
  const dialY = y + 3.6;
  const dialZ = z + 0.55;
  // Brass tee + stem
  cylinder(scene, brass, 0.88, v(x - 0.95, y, z), v(x + 0.95, y, z), 16);
  cylinder(scene, brass, 0.42, v(x, y + 0.55, z), v(x, y + 1.55, z), 6);
  cylinder(scene, brass, 0.26, v(x, y + 1.5, z), v(x, dialY - 1.15, z), 12);
  // 2.5" liquid-filled stainless bezel (radius = 1.25")
  cylinder(scene, steel, 1.28, v(x, dialY, dialZ - 0.82), v(x, dialY, dialZ), 48);
  const dial = texture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#f3f2e6';
    ctx.fillRect(0, 0, w, h);
    // Subtle liquid-filled meniscus near top
    ctx.fillStyle = '#e5eef0';
    ctx.fillRect(0, 120, w, h - 120);
    ctx.strokeStyle = '#b4c6ca';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 120);
    ctx.lineTo(w, 120);
    ctx.stroke();

    ctx.translate(w / 2, h / 2);
    ctx.strokeStyle = ctx.fillStyle = '#1f2628';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let n = 0; n <= 20; n++) {
      const angle = (225 - 270 * n / 20) * Math.PI / 180;
      const major = n % 2 === 0;
      const inner = major ? 196 : 216;
      ctx.beginPath();
      ctx.moveTo(234 * Math.cos(angle), -234 * Math.sin(angle));
      ctx.lineTo(inner * Math.cos(angle), -inner * Math.sin(angle));
      ctx.lineWidth = major ? 6 : 2.5;
      ctx.stroke();
      if (major) {
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(String(n * 5), 162 * Math.cos(angle), -162 * Math.sin(angle));
      }
    }
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('PSI', 0, 96);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#3b5752';
    ctx.fillText(labelText, 0, 134);
  });
  mesh(scene, new T.CircleGeometry(1.16, 48), new T.MeshBasicMaterial({ map: dial }), v(x, dialY, dialZ + 0.015));
  const needle = new T.Group();
  needle.position.set(x, dialY, dialZ + 0.035);
  scene.add(needle);
  box(needle, red, 0.92, 0.045, 0.02, 0.36, 0, 0);
  cylinder(scene, black, 0.09, v(x, dialY, dialZ + 0.025), v(x, dialY, dialZ + 0.09), 16);
  return needle;
}

function buildBigBlue(scene, x, z) {
  const group = new T.Group();
  group.position.set(x, 0, z);
  scene.add(group);

  // Pentek 150235: 23.74" H (Y = 32.26" to 56.0"), 7.45" Dia (r = 3.725")
  const sumpProfile = [
    [0, 32.26], [1.4, 32.3], [2.45, 32.55], [3.12, 33.05], [3.4, 33.75],
    [3.52, 48.2], [3.725, 48.8], [3.725, 51.6], [3.4, 51.6], [0, 51.6],
  ];
  mesh(
    group,
    new T.LatheGeometry(sumpProfile.map(([r, y]) => new T.Vector2(r, y)), 64),
    pentekBlue,
    v(0, 0, 0),
  );

  // Molded structural grip ribs around top collar of blue sump
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rib = box(group, pentekBlue, 0.34, 2.75, 0.34, Math.cos(a) * 3.68, 50.15, Math.sin(a) * 3.68);
    rib.rotation.y = -a;
  }

  // Front product label on Big Blue sump
  const labelMap = texture(640, 768, (ctx, w, h) => {
    ctx.fillStyle = '#eff4f7';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0f3673';
    ctx.fillRect(0, 0, w, 190);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText('PENTEK', w / 2, 86);
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('BIG BLUE 20"', w / 2, 148);
    ctx.fillStyle = '#112948';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText('150235', w / 2, 305);
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('1.5" FNPT PORTS', w / 2, 365);
    ctx.fillStyle = '#2570b8';
    ctx.fillRect(40, 415, w - 80, 14);
    ctx.fillStyle = '#112948';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('DGD-5005-20', w / 2, 505);
    ctx.font = '28px sans-serif';
    ctx.fillText('50 → 5 MICRON GRADIENT', w / 2, 565);
    ctx.fillText('20 GPM · < 1 PSI DROP', w / 2, 625);
    ctx.fillStyle = '#b62b26';
    ctx.fillRect(0, 695, w, 73);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('STAGE 1 · SEDIMENT PRE-FILTER', w / 2, 740);
  });
  mesh(
    group,
    new T.CylinderGeometry(3.56, 3.48, 10.2, 48, 1, true, -0.82, 1.64),
    new T.MeshStandardMaterial({ map: labelMap, roughness: 0.42 }),
    v(0, 41.2, 0),
  );

  // Heavy-duty black polypropylene cap (Y = 51.6" to 56.0")
  const capProfile = [
    [0, 51.55], [3.74, 51.55], [3.74, 53.0], [3.58, 54.7], [3.32, 56.0], [0, 56.0],
  ];
  mesh(
    group,
    new T.LatheGeometry(capProfile.map(([r, y]) => new T.Vector2(r, y)), 64),
    black,
    v(0, 0, 0),
  );
  // Left & right 1.5" FNPT port bosses at Y = 53.5"
  cylinder(group, black, 1.38, v(-3.95, 53.5, 0), v(3.95, 53.5, 0), 24);

  // Red pressure-relief button on top front of cap
  const reliefButton = new T.Group();
  reliefButton.position.set(0, 56.15, 2.25);
  group.add(reliefButton);
  cylinder(reliefButton, black, 0.56, v(0, -0.25, 0), v(0, 0.08, 0), 20);
  cylinder(reliefButton, red, 0.36, v(0, 0.05, 0), v(0, 0.48, 0), 20);

  // Pentair 150061 heavy-duty L-bracket (4.5" W x 5.75" H x 7.25" D)
  // Plywood front face is at Z = 2.25" -> local Z = 2.25 - z (-4.05")
  const wallLocalZ = 2.25 - z;
  const bracketH = 5.75;
  const bracketD = 7.25;
  // Vertical wall plate against plywood
  box(group, bracketWhite, 4.5, bracketH, 0.22, 0, 56.0 + 0.11 - bracketH / 2 + 1.4, wallLocalZ + 0.11);
  // Horizontal top flange extending 7.25" forward over cap
  box(group, bracketWhite, 4.5, 0.22, bracketD, 0, 56.12, wallLocalZ + bracketD / 2);
  // Side structural gussets
  for (const sx of [-2.12, 2.12]) {
    box(group, bracketWhite, 0.18, 2.6, 2.4, sx, 54.85, wallLocalZ + 1.35);
  }
  // 4 lag bolts into plywood backer
  for (const bx of [-1.5, 1.5]) {
    for (const by of [52.8, 57.6]) {
      cylinder(group, steel, 0.2, v(bx, by, wallLocalZ + 0.2), v(bx, by, wallLocalZ + 0.42), 6);
    }
  }
  // 4 stainless cap bolts
  for (const bx of [-1.45, 1.45]) {
    for (const bz of [-1.35, 1.35]) {
      cylinder(group, steel, 0.18, v(bx, 56.2, bz), v(bx, 56.42, bz), 6);
    }
  }

  return { reliefButton };
}

function buildSpannerWrench(scene, x, y, z) {
  const group = new T.Group();
  group.position.set(x, y, z);
  scene.add(group);
  // Peg on plywood
  cylinder(group, steel, 0.18, v(0, 3.6, -0.25), v(0, 3.6, 0.55), 12);
  // SW-4 ring spanner
  const ring = new T.Mesh(new T.TorusGeometry(3.45, 0.34, 12, 36), darkMatte);
  group.add(ring);
  // Inner grip lugs
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    box(group, darkMatte, 0.42, 0.42, 0.48, Math.cos(a) * 3.05, Math.sin(a) * 3.05, 0);
  }
  // Wrench handle pointing down
  box(group, darkMatte, 1.15, 7.2, 0.42, 0, -6.9, 0);
}

function buildCarbonTankAndClack(scene, x, z) {
  const group = new T.Group();
  group.position.set(x, 0, z);
  scene.add(group);

  // 13" x 54" FRP Mineral Tank (r = 6.5", Y = 0 to 54.0")
  // Black molded bottom base boot
  const bootProfile = [
    [0, 0], [6.65, 0], [6.65, 5.6], [6.45, 5.8], [0, 5.8],
  ];
  mesh(group, new T.LatheGeometry(bootProfile.map(([r, y]) => new T.Vector2(r, y)), 64), darkMatte, v(0, 0, 0));

  // Almond/natural fiberglass tank shell
  const tankProfile = [
    [0, 5.4], [6.46, 5.4], [6.5, 9.0], [6.5, 45.5], [6.42, 47.6],
    [6.1, 49.4], [5.45, 51.0], [4.4, 52.2], [2.9, 53.0], [1.95, 53.3], [0, 53.3],
  ];
  mesh(group, new T.LatheGeometry(tankProfile.map(([r, y]) => new T.Vector2(r, y)), 64), tankAlmond, v(0, 0, 0));

  // Black 2.5" tank neck collar (Y = 53.1" to 54.25")
  cylinder(group, black, 2.05, v(0, 53.1, 0), v(0, 54.25, 0), 32);

  // Technical spec label wrapped on front of tank
  const tankLabel = texture(768, 768, (ctx, w, h) => {
    ctx.fillStyle = '#f2efe6';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#18362e';
    ctx.fillRect(0, 0, w, 200);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 58px sans-serif';
    ctx.fillText('IPW WS 1.25', w / 2, 92);
    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = '#91efd1';
    ctx.fillText('BACKWASHING CARBON SYSTEM', w / 2, 152);
    ctx.fillStyle = '#162823';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('2.5 CU FT', w / 2, 300);
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('12×40 CATALYTIC CARBON', w / 2, 362);
    ctx.fillStyle = '#429479';
    ctx.fillRect(64, 412, w - 128, 12);
    ctx.fillStyle = '#162823';
    ctx.font = '30px sans-serif';
    ctx.fillText('13" DIA × 54" H FRP TANK', w / 2, 488);
    ctx.fillText('CLACK WS1.25 VALVE HEAD', w / 2, 542);
    ctx.fillText('~9 GPM BACKWASH · 120V AC', w / 2, 596);
    ctx.fillStyle = '#18362e';
    ctx.fillRect(0, 686, w, 82);
    ctx.fillStyle = '#ecf0e9';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('STAGE 2 · WHOLE-HOUSE CARBON', w / 2, 738);
  });
  mesh(
    group,
    new T.CylinderGeometry(6.53, 6.53, 15.5, 48, 1, true, -0.68, 1.36),
    new T.MeshStandardMaterial({ map: tankLabel, roughness: 0.45 }),
    v(0, 32.0, 0),
  );

  // Clack WS1.25 Electronic Control Valve Head (7.375" H -> Y = 54.0" to 61.375")
  // Lower valve body + upper rounded head
  cylinder(group, black, 2.65, v(0, 54.0, 0), v(0, 56.8, 0), 32);
  box(group, darkMatte, 6.4, 5.4, 7.2, 0, 58.35, 0.35);
  box(group, black, 6.0, 0.75, 6.6, 0, 61.0, 0.35); // top reaches 61.375"

  // Dynamic Clack WS1.25 Front Faceplate & LCD screen
  const lcdCanvas = document.createElement('canvas');
  lcdCanvas.width = 512;
  lcdCanvas.height = 384;
  const lcdCtx = lcdCanvas.getContext('2d');
  const lcdTex = new T.CanvasTexture(lcdCanvas);
  lcdTex.colorSpace = T.SRGBColorSpace;
  lcdTex.anisotropy = 8;

  function drawLcd(status, detail, modeColor = '#91efd1') {
    const w = lcdCanvas.width;
    const h = lcdCanvas.height;
    lcdCtx.fillStyle = '#191d1e';
    lcdCtx.fillRect(0, 0, w, h);
    // Clack header strip
    lcdCtx.fillStyle = '#9aa8a4';
    lcdCtx.font = 'bold 24px sans-serif';
    lcdCtx.textAlign = 'left';
    lcdCtx.fillText('CLACK WS1.25', 28, 42);
    lcdCtx.textAlign = 'right';
    lcdCtx.fillStyle = modeColor;
    lcdCtx.fillText('1.25" FULL FLOW', w - 28, 42);

    // Backlit LCD panel
    lcdCtx.fillStyle = '#0f2720';
    lcdCtx.fillRect(26, 62, w - 52, 178);
    lcdCtx.strokeStyle = '#3f6b5d';
    lcdCtx.lineWidth = 4;
    lcdCtx.strokeRect(26, 62, w - 52, 178);

    lcdCtx.fillStyle = modeColor;
    lcdCtx.textAlign = 'center';
    lcdCtx.font = 'bold 52px monospace';
    lcdCtx.fillText(status, w / 2, 140);
    lcdCtx.fillStyle = '#d7efe6';
    lcdCtx.font = 'bold 30px monospace';
    lcdCtx.fillText(detail, w / 2, 206);

    // 5 control buttons
    const labels = ['CLOCK', 'NEXT', '▲', '▼', 'REGEN'];
    labels.forEach((lbl, idx) => {
      const bx = 42 + idx * 88;
      lcdCtx.fillStyle = idx === 4 ? '#4d2b28' : '#2d3536';
      lcdCtx.fillRect(bx, 274, 74, 62);
      lcdCtx.strokeStyle = '#60706e';
      lcdCtx.lineWidth = 2;
      lcdCtx.strokeRect(bx, 274, 74, 62);
      lcdCtx.fillStyle = '#e7efeb';
      lcdCtx.font = 'bold 18px sans-serif';
      lcdCtx.fillText(lbl, bx + 37, 312);
    });
    lcdTex.needsUpdate = true;
  }
  drawLcd('SERVICE', '61 PSI · ONLINE', '#91efd1');

  const face = mesh(
    group,
    new T.PlaneGeometry(5.6, 4.2),
    new T.MeshBasicMaterial({ map: lcdTex }),
    v(0, 58.4, 3.98),
  );
  face.rotation.x = -0.04;

  // Integrated Clack 1.25" Bypass Valve on rear (Z = -2.6 to -4.6 local -> world Z = 7.4..9.4)
  box(group, black, 5.2, 2.3, 2.4, 0, 57.0, -3.5);
  for (const sx of [-1.7, 1.7]) {
    // Rear tailpiece union nuts & 1.25" brass sweat tailpieces
    cylinder(group, black, 1.05, v(sx, 57.0, -2.5), v(sx, 57.0, -5.0), 16);
    cylinder(group, brass, 0.85, v(sx, 57.0, -4.8), v(sx, 57.0, -5.7), 6);
    // Clack integrated red arrow bypass handles
    box(group, red, 0.36, 1.15, 1.65, sx, 58.6, -3.5);
  }
  // Rear 3/4"-1" NPT drain elbow port at local (0, 58.0, -3.6 -> -4.4)
  cylinder(group, black, 0.62, v(0, 58.0, -2.8), v(0, 58.0, -4.3), 16);
  cylinder(group, brass, 0.56, v(0, 58.0, -4.2), v(0, 58.0, -4.8), 6);

  return { updateLcd: drawLcd };
}

function buildBoilerDrain(scene, x, y, z) {
  // 1.25" x 1/2" brass tee + downward 1/2" boiler drain spigot
  cylinder(scene, brass, 0.88, v(x - 0.95, y, z), v(x + 0.95, y, z), 16);
  cylinder(scene, brass, 0.45, v(x, y, z), v(x, y - 1.5, z), 12);
  cylinder(scene, brass, 0.42, v(x, y - 1.5, z), v(x, y - 2.6, z + 0.6), 12);
  // Spout threads
  cylinder(scene, brass, 0.46, v(x, y - 2.55, z + 0.58), v(x, y - 3.05, z + 0.72), 16);
  // Wheel handle group
  const wheel = new T.Group();
  wheel.position.set(x, y - 1.45, z + 0.95);
  scene.add(wheel);
  cylinder(wheel, steel, 0.14, v(0, 0, -0.65), v(0, 0, 0.08), 10);
  const rim = new T.Mesh(new T.TorusGeometry(0.68, 0.11, 10, 24), red);
  wheel.add(rim);
  box(wheel, red, 1.32, 0.14, 0.12, 0, 0, 0);
  box(wheel, red, 0.14, 1.32, 0.12, 0, 0, 0);
  return wheel;
}

function buildAirGapAndStandpipe(scene, x, ventX, z) {
  // Eco-Tech DLA-G20 (Y = 42.0" to 48.2") atop 2" Schedule-40 PVC standpipe
  // Bottom 2" PVC glue socket
  cylinder(scene, pvcWhite, 1.42, v(x, 42.0, z), v(x, 44.0, z), 28);
  cylinder(scene, black, 1.48, v(x, 43.9, z), v(x, 44.3, z), 28);
  // Open 2" anti-splash air gap chamber (Y = 44.3" to 46.5")
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    cylinder(
      scene,
      black,
      0.16,
      v(x + Math.cos(a) * 1.28, 44.2, z + Math.sin(a) * 1.28),
      v(x + Math.cos(a) * 1.28, 46.6, z + Math.sin(a) * 1.28),
      10,
    );
  }
  // Translucent anti-splash cylinder skirt with open viewing slots
  mesh(
    scene,
    new T.CylinderGeometry(1.22, 1.22, 2.2, 24, 1, true),
    clearShield,
    v(x, 45.4, z),
  );
  // Upper discharge nozzle inside air gap (leaving visible 2" gap!)
  cylinder(scene, black, 0.52, v(x, 46.15, z), v(x, 46.8, z), 20);
  // Top cap + 1" FPT inlet collar
  cylinder(scene, black, 1.44, v(x, 46.5, z), v(x, 47.2, z), 28);
  cylinder(scene, pvcWhite, 0.78, v(x, 47.2, z), v(x, 48.2, z), 20);
  cylinder(scene, brass, 0.66, v(x, 48.0, z), v(x, 48.7, z), 6);

  // 2" Schedule-40 PVC Standpipe (Y = 18.0" to 42.0")
  cylinder(scene, pvcWhite, pvcR, v(x, 18.0, z), v(x, 42.0, z), 28);
  // Standpipe wall strap
  box(scene, steel, 3.6, 0.6, 0.16, x, 30.0, 0.12);
  cylinder(scene, steel, 1.32, v(x, 29.7, z), v(x, 30.3, z), 24);

  // 2" PVC P-trap sweep (from x=33 down to Y=12.6, up to x=36.6, Y=18)
  const trapCurve = new T.CatmullRomCurve3([
    v(x, 18.2, z),
    v(x, 15.0, z),
    v(x + 0.65, 13.0, z),
    v(x + 1.9, 12.4, z),
    v(x + 3.15, 13.0, z),
    v(x + 3.7, 15.2, z),
    v(x + 3.7, 17.5, z),
    v(x + 4.4, 18.2, z),
    v(ventX, 18.2, 2.0),
  ]);
  mesh(scene, new T.TubeGeometry(trapCurve, 44, pvcR, 20, false), pvcWhite, v(0, 0, 0));
  // P-trap hub rings
  cylinder(scene, pvcWhite, 1.36, v(x, 17.6, z), v(x, 18.5, z), 24);
  cylinder(scene, pvcWhite, 1.36, v(ventX - 2.0, 18.2, 2.08), v(ventX - 1.2, 18.2, 2.04), 24);

  // 2" PVC Sanitary Tee at (ventX, 18.2, 2.0) + Drain into floor + Vent stack to ceiling
  cylinder(scene, pvcWhite, 1.42, v(ventX, 16.4, 2.0), v(ventX, 20.0, 2.0), 28);
  cylinder(scene, pvcWhite, pvcR, v(ventX, 0.0, 2.0), v(ventX, 16.6, 2.0), 28);
  cylinder(scene, pvcWhite, pvcR, v(ventX, 19.8, 2.0), v(ventX, 88.0, 2.0), 28);
  // Floor flange collar
  cylinder(scene, darkMatte, 1.85, v(ventX, 0.0, 2.0), v(ventX, 0.55, 2.0), 28);
  // Vent stack wall straps
  for (const sy of [42.0, 68.0]) {
    box(scene, steel, 3.6, 0.6, 0.16, ventX, sy, 0.12);
    cylinder(scene, steel, 1.32, v(ventX, sy - 0.3, 2.0), v(ventX, sy + 0.3, 2.0), 24);
  }
}

function buildElectricalOutlet(scene, x, y, z, clackX, clackZ) {
  // Surface-mount 120V GFCI duplex outlet box on plywood
  box(scene, steel, 3.2, 4.8, 1.35, x, y, z + 0.675);
  box(scene, outletWhite, 2.85, 4.45, 0.16, x, y, z + 1.4);
  // GFCI receptacles + test/reset buttons
  for (const dy of [-1.1, 1.1]) {
    box(scene, darkMatte, 0.9, 0.72, 0.08, x, y + dy, z + 1.5);
  }
  box(scene, red, 0.42, 0.22, 0.08, x, y + 0.18, z + 1.5);
  box(scene, black, 0.42, 0.22, 0.08, x, y - 0.18, z + 1.5);
  // Plugged-in 12V AC transformer adapter for Clack WS1.25
  box(scene, darkMatte, 1.8, 2.2, 1.45, x, y - 0.95, z + 2.22);
  // Curved black power cord routing cleanly to rear of Clack head
  const cord = new T.CatmullRomCurve3([
    v(x, y - 2.05, z + 2.2),
    v(x - 0.5, y - 3.6, z + 2.5),
    v(x - 3.0, y - 2.0, z + 3.2),
    v(clackX + 2.6, 51.0, clackZ - 2.2),
    v(clackX + 2.0, 56.8, clackZ - 1.8),
  ]);
  mesh(scene, new T.TubeGeometry(cord, 32, 0.12, 8, false), darkMatte, v(0, 0, 0));
}

export function createWholeHouseModel(scene, measurement, dimension, tag) {
  const concrete = surface(false);
  const wood = surface(true);

  // Foundation wall & basement concrete floor
  const wall = box(scene, concrete, 102, 90, 2.5, 0, 45, -1.25);
  const floor = box(scene, concrete, 102, 1, 32, 0, -0.5, 13.5);

  // Basement ceiling joists at Y = 84" AFF (bottom face at Y = 84")
  box(scene, wood, 102, 5.5, 1.5, 0, 86.75, 0.75); // rim/ledger against foundation wall
  for (const jx of [-40, -24, -8, 8, 24, 40]) {
    box(scene, wood, 1.5, 5.5, 22, jx, 86.75, 11.0);
  }

  // 2x4 furring strips + 3/4" plywood backer behind Stage 1 & 3-valve bypass
  for (const fx of [-35, -17, 1, 15]) {
    box(scene, wood, 3.5, 54, 1.5, fx, 48, 0.75);
    for (const fy of [25, 48, 71]) {
      cylinder(scene, steel, 0.2, v(fx, fy, 1.45), v(fx, fy, 1.65), 6);
    }
  }
  box(scene, wood, 56, 52, 0.75, -10, 48, 1.875); // X = -38 to +18, Y = 22 to 74, front face Z = 2.25
  for (const fx of [-35, -17, 1, 15]) {
    for (const fy of [25, 71]) {
      cylinder(scene, black, 0.16, v(fx, fy, 2.25), v(fx, fy, 2.36), 8);
    }
  }

  // Stage 1: Pentek 150235 Big Blue (X = -17, Z = 6.3, Y = 32.26..56.0) + L-bracket + SW-4 wrench
  const { reliefButton } = buildBigBlue(scene, -17.0, stage1Z);
  buildSpannerWrench(scene, -26.5, 38.5, 2.55);

  // Stage 2: IPW WS 1.25 + 13"x54" Carbon Tank (X = +2.0, Z = 12.0, Y = 0..61.375)
  const { updateLcd } = buildCarbonTankAndClack(scene, 2.0, tankZ);

  // 120V GFCI wall outlet within 6 ft of Clack WS1.25
  buildElectricalOutlet(scene, 13.0, 42.5, 2.25, 2.0, tankZ);

  // Stage 3: Eco-Tech DLA-G20 + 2" PVC Trapped & Vented Standpipe
  buildAirGapAndStandpipe(scene, 33.0, 40.5, drainZ);

  // --- 1.25" Type L Copper Piping & Full-System 3-Valve "H" Bypass ---
  const cpipe = (a, b, r = pipeR) => cylinder(scene, copper, r, a, b);

  // Incoming 1.25" Main (post-meter & post-irrigation tee) at Y = 60", Z = 4.5"
  cpipe(v(-48.0, 60.0, headerZ), v(-32.0, 60.0, headerZ));
  // Post-irrigation split tee at X = -40"
  cpipe(v(-41.2, 60.0, headerZ), v(-38.8, 60.0, headerZ), hubR);
  cpipe(v(-40.0, 60.0, headerZ), v(-40.0, 58.6, headerZ), hubR);
  cpipe(v(-40.0, 59.0, headerZ), v(-40.0, 51.0, headerZ), 0.56); // 1" irrigation branch
  cylinder(scene, brass, 0.72, v(-40.0, 53.5, headerZ), v(-40.0, 55.2, headerZ), 8);
  box(scene, red, 0.3, 1.8, 0.22, -40.0, 54.35, headerZ + 0.9);

  // Top 1.25" Bypass Bridge at Y = 60.0", Z = 4.5" (X = -32.0 to +17.0)
  cpipe(v(-32.0, 60.0, headerZ), v(17.0, 60.0, headerZ));
  // Left & right bypass tees
  for (const tx of [-32.0, 17.0]) {
    cpipe(v(tx - 1.25, 60.0, headerZ), v(tx + 1.25, 60.0, headerZ), hubR);
    cpipe(v(tx, 60.0, headerZ), v(tx, 58.7, headerZ), hubR);
  }

  // Left Treatment Drop: (-32, 60, 4.5) -> (-32, 53.5, 4.5) -> (-32, 53.5, 6.3) -> Big Blue inlet (-20.9, 53.5, 6.3)
  cpipe(v(-32.0, 59.2, headerZ), v(-32.0, 54.8, headerZ));
  elbow(scene, copper, v(-32.0, 54.9, headerZ), v(-32.0, 53.5, headerZ), v(-32.0, 53.5, headerZ + 1.0), pipeR, hubR);
  elbow(scene, copper, v(-32.0, 53.5, headerZ + 0.8), v(-32.0, 53.5, stage1Z), v(-30.9, 53.5, stage1Z), pipeR, hubR);
  cpipe(v(-31.0, 53.5, stage1Z), v(-21.2, 53.5, stage1Z));

  // Brass fittings on Big Blue inlet (left): V1, G1, Union 1, 1.5"x1.25" Adapter 1
  const v1 = brassBallValve(scene, -28.8, 53.5, stage1Z, true, false);
  const g1Needle = pressureGauge(scene, -25.1, 53.5, stage1Z, 'PRE-FILTER');
  brassUnion(scene, -22.9, 53.5, stage1Z);
  portAdapter(scene, -21.5, 53.5, stage1Z, true);

  // Brass fittings on Big Blue outlet (right): Adapter 2, Union 2, G2
  portAdapter(scene, -12.5, 53.5, stage1Z, false);
  brassUnion(scene, -11.1, 53.5, stage1Z);
  const g2Needle = pressureGauge(scene, -8.4, 53.5, stage1Z, 'POST-FILTER');

  // Stage 1 -> Stage 2 Copper Run: (-12.5, 53.5, 6.3) -> (-5.8, 53.5, 6.3) -> rise to Y=57 -> (+0.3, 57, 6.3) -> Clack Inlet (+0.3, 57, 6.9)
  cpipe(v(-12.5, 53.5, stage1Z), v(-6.8, 53.5, stage1Z));
  elbow(scene, copper, v(-6.9, 53.5, stage1Z), v(-5.8, 53.5, stage1Z), v(-5.8, 54.6, stage1Z), pipeR, hubR);
  cpipe(v(-5.8, 54.5, stage1Z), v(-5.8, 56.0, stage1Z));
  elbow(scene, copper, v(-5.8, 55.9, stage1Z), v(-5.8, 57.0, stage1Z), v(-4.7, 57.0, stage1Z), pipeR, hubR);
  cpipe(v(-4.8, 57.0, stage1Z), v(-0.7, 57.0, stage1Z));
  elbow(scene, copper, v(-0.8, 57.0, stage1Z), v(0.3, 57.0, stage1Z), v(0.3, 57.0, stage1Z + 1.0), pipeR, hubR);

  // Stage 2 Outlet -> Boiler Drain -> V3 -> Right Bypass Tee (+17, 60, 4.5)
  elbow(scene, copper, v(3.7, 57.0, stage1Z + 1.0), v(3.7, 57.0, stage1Z), v(4.8, 57.0, stage1Z), pipeR, hubR);
  cpipe(v(4.7, 57.0, stage1Z), v(8.6, 57.0, stage1Z));
  elbow(scene, copper, v(8.5, 57.0, stage1Z), v(9.5, 57.0, stage1Z), v(9.5, 56.0, stage1Z), pipeR, hubR);
  cpipe(v(9.5, 56.1, stage1Z), v(9.5, 54.5, stage1Z));
  elbow(scene, copper, v(9.5, 54.6, stage1Z), v(9.5, 53.5, stage1Z), v(9.5, 53.5, stage1Z - 0.9), pipeR, hubR);
  elbow(scene, copper, v(9.5, 53.5, headerZ + 0.9), v(9.5, 53.5, headerZ), v(10.4, 53.5, headerZ), pipeR, hubR);
  cpipe(v(10.3, 53.5, headerZ), v(16.0, 53.5, headerZ));
  elbow(scene, copper, v(15.9, 53.5, headerZ), v(17.0, 53.5, headerZ), v(17.0, 54.6, headerZ), pipeR, hubR);
  cpipe(v(17.0, 54.5, headerZ), v(17.0, 59.2, headerZ));

  // Sample / Flush Port (1/2" Brass Boiler Drain) at X = +11.0" & V3 at X = +14.2"
  const boilerWheel = buildBoilerDrain(scene, 11.0, 53.5, headerZ);
  const v3 = brassBallValve(scene, 14.2, 53.5, headerZ, true, false);
  // V2 Bypass Valve centered cleanly on Y = 60" header above Big Blue, lever swings UP when closed
  const v2 = brassBallValve(scene, -17.0, 60.0, headerZ, true, true);

  // 1.25" Out to House + 30" Straight Future UV Run (X = +17.0 to +47.0 at Y = 60.0, Z = 4.5)
  cpipe(v(17.0, 60.0, headerZ), v(48.5, 60.0, headerZ));

  // Copper wall standoffs along Y = 60" header
  for (const sx of [-44, -24, -2, 25, 44]) {
    const backZ = sx <= 18 ? 2.25 : 0.0;
    cylinder(scene, brass, 0.22, v(sx, 60.0, backZ), v(sx, 60.0, headerZ - 0.5), 10);
    cpipe(v(sx - 0.22, 60.0, headerZ), v(sx + 0.22, 60.0, headerZ), 0.78);
  }

  // --- Stage 3: 3/4"–1" PEX Backwash Drain Line (Clack rear -> ceiling joists Y=84" -> DLA-G20) ---
  // Exits rear of Clack at (2.0, 58.0, 7.2) -> sweeps back to Z=2.4 -> rises to Y=83.2 -> runs right to X=33.0 -> drops to Y=48.6
  cylinder(scene, pexTube, pexR, v(2.0, 58.0, 7.2), v(2.0, 58.0, drainZ + 1.0), 16);
  elbow(scene, pexTube, v(2.0, 58.0, drainZ + 1.1), v(2.0, 58.0, drainZ), v(2.0, 59.1, drainZ), pexR, 0.54);
  cylinder(scene, pexTube, pexR, v(2.0, 59.0, drainZ), v(2.0, 82.2, drainZ), 16);
  elbow(scene, pexTube, v(2.0, 82.1, drainZ), v(2.0, 83.2, drainZ), v(3.1, 83.2, drainZ), pexR, 0.54);
  cylinder(scene, pexTube, pexR, v(3.0, 83.2, drainZ), v(32.0, 83.2, drainZ), 16);
  elbow(scene, pexTube, v(31.9, 83.2, drainZ), v(33.0, 83.2, drainZ), v(33.0, 82.1, drainZ), pexR, 0.54);
  cylinder(scene, pexTube, pexR, v(33.0, 82.2, drainZ), v(33.0, 48.5, drainZ), 16);

  // Ceiling joist J-hook PEX straps along Y = 83.2..84.0"
  for (const jx of [8, 16, 24, 32]) {
    box(scene, darkMatte, 0.55, 1.4, 0.95, jx, 83.6, drainZ);
  }
  // Wall PEX clips on vertical drop
  for (const py of [72, 54]) {
    box(scene, darkMatte, 1.1, 0.45, 2.4, 33.0, py, 1.2);
  }

  // --- Optional Future UV Space Envelope (dashed wireframe in measurement group) ---
  const uvBoxGeo = new T.EdgesGeometry(new T.BoxGeometry(26, 4.6, 4.6));
  const uvLines = new T.LineSegments(
    uvBoxGeo,
    new T.LineDashedMaterial({ color: '#91efd1', dashSize: 1.2, gapSize: 0.7, transparent: true, opacity: 0.65 }),
  );
  uvLines.computeLineDistances();
  uvLines.position.set(32.0, 60.0, headerZ);
  measurement.add(uvLines);

  // --- Component Callout Tags (positioned clear of 3D hardware labels) ---
  const valves = [v1, v2, v3];
  tag('V1', v(-28.8, 50.4, stage1Z + 1.5));
  tag('V2', v(-17.0, 64.4, headerZ + 1.5));
  tag('V3', v(15.2, 50.4, headerZ + 1.5));
  tag('G1', v(-25.1, 60.2, stage1Z + 1.0));
  tag('G2', v(-8.4, 60.2, stage1Z + 1.0));
  tag('1.25″ Main', v(-44.0, 62.6, headerZ));
  tag('Irrigation tee', v(-40.0, 49.0, headerZ));
  tag('Sample drain', v(9.4, 47.6, headerZ + 1.4));
  tag('120V GFCI', v(13.2, 37.8, 4.0));
  tag('1.25″ To house', v(44.5, 62.6, headerZ));
  tag('1″ PEX drain', v(18.0, 81.2, drainZ + 0.8), false, true);
  tag('DLA-G20 air gap', v(33.0, 45.4, drainZ + 2.0), false, true);
  tag('2″ PVC P-trap', v(36.5, 9.8, drainZ + 1.4), false, true);

  // --- Dimension & Clearance Lines (toggled via Dimensions button) ---
  dimension('60″ AFF header', v(-46.5, 0, headerZ), v(-46.5, 60.0, headerZ), v(-46.5, 30.0, headerZ), 'x');
  dimension('23.7″ Big Blue', v(-22.2, 32.26, stage1Z), v(-22.2, 56.0, stage1Z), v(-26.2, 46.2, stage1Z), 'x');
  dimension('4″ sump drop', v(-17.0, 28.26, stage1Z + 3.6), v(-17.0, 32.26, stage1Z + 3.6), v(-17.0, 26.2, stage1Z + 3.6), 'x', true);
  dimension('61.4″ tank + valve', v(-5.4, 0, tankZ), v(-5.4, 61.375, tankZ), v(-5.4, 15.5, tankZ), 'x', true);
  dimension('12″ min re-bed', v(2.0, 61.375, tankZ), v(2.0, 73.375, tankZ), v(2.0, 67.8, tankZ), 'x', true);
  dimension('84″ ceiling joists', v(47.2, 0, 2.5), v(47.2, 84.0, 2.5), v(47.2, 72.5, 2.5), 'x', true);
  dimension('30″ future UV space', v(17.0, 65.8, headerZ), v(47.0, 65.8, headerZ), v(32.0, 67.8, headerZ), 'y');
  dimension('~41″ core width', v(-32.0, 1.0, 20.5), v(9.0, 1.0, 20.5), v(-12.5, 1.0, 23.0), 'y');
  dimension('~19″ wall depth', v(11.5, 1.0, 0.0), v(11.5, 1.0, 18.5), v(17.2, 1.0, 9.5), 'x', true);

  return {
    wall,
    floor,
    valves,
    g1Needle,
    g2Needle,
    boilerWheel,
    reliefButton,
    updateLcd,
  };
}

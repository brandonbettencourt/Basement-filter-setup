import * as T from 'three';

const v = (x, y, z) => new T.Vector3(x, y, z);
const material = (color, metalness = 0, roughness = .65) =>
  new T.MeshStandardMaterial({ color, metalness, roughness });
const copper = material('#ba663c', .45, .3);
const brass = material('#c49a4e', .46, .37);
const black = material('#25292a', .18);
const steel = material('#aebbc0', .47, .32);
const red = material('#b62b26', .15);
const vinyl = new T.MeshStandardMaterial({
  color: '#d3f1ee', transparent: true, opacity: .56, roughness: .23,
});
const pipeDepth = 4;
const portHeight = 48;

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
  const object = mesh(parent, new T.CylinderGeometry(radius, radius, direction.length(), sides),
    mat, from.clone().lerp(to, .5));
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
  let seed = 27;
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
          ? 11 * Math.sin(x * .11 + 1.8 * Math.sin(y * .014)) + 4 * Math.sin(x * .7)
          : 4 * Math.sin(x * .047 + y * .04) + 4 * Math.cos(y * .18);
        const shade = grain + (random() - .5) * (wood ? 11 : 24);
        const i = (y * w + x) * 4;
        base.forEach((channel, offset) => { data.data[i + offset] = channel + shade; });
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
  return new T.MeshStandardMaterial({ map, roughness: .92 });
}

function cartridge(parent, x) {
  const group = new T.Group();
  group.position.set(x, 44.7, 5.25);
  parent.add(group);
  const profile = [[0,-20.7],[.65,-20.66],[1.16,-20.51],[1.49,-20.25],
    [1.625,-19.93],[1.625,-.34],[1.56,-.13],[1.37,0],[0,0]];
  mesh(group, new T.LatheGeometry(profile.map(([r,y]) => new T.Vector2(r,y)), 64), steel, v(0,0,0));
  const map = texture(640, 768, (ctx, w, h) => {
    ctx.fillStyle = '#e4ebe5';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#203a32';
    ctx.fillRect(0, 0, w, 210);
    ctx.fillStyle = '#fbfff9';
    ctx.font = 'bold 45px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PENTAIR', w / 2, 90);
    ctx.font = '30px sans-serif';
    ctx.fillText('EVERPURE', w / 2, 150);
    ctx.fillStyle = '#17352c';
    ctx.font = 'bold 65px sans-serif';
    ctx.fillText('7FC-P', w / 2, 335);
    ctx.font = '25px sans-serif';
    ctx.fillText('EV9595-51', w / 2, 393);
    ctx.fillText('QUICK-CHANGE', w / 2, 517);
    ctx.fillStyle = '#429479';
    ctx.fillRect(0, 575, w, 24);
    ctx.fillStyle = '#17352c';
    ctx.fillText('0.5 MICRON', w / 2, 680);
  });
  const label = new T.MeshStandardMaterial({ map, side: T.DoubleSide });
  mesh(group, new T.CylinderGeometry(1.632, 1.632, 8.6, 48, 1, true, -.95, 1.9), label, v(0,-6.1,0));
  cylinder(parent, black, 1.84, v(x,44.6,5.25), v(x,46.65,5.25));
  cylinder(parent, black, 1.55, v(x,46.4,5.25), v(x,48.1,5.25), 12);
}

function valve(scene, x, y, horizontal) {
  const p = v(x,y,pipeDepth);
  const axis = horizontal ? v(1,0,0) : v(0,1,0);
  const at = offset => p.clone().addScaledVector(axis, offset);
  cylinder(scene, brass, .76, at(-.72), at(.72), 8);
  for (const sign of [-1,1]) {
    cylinder(scene, brass, .61, at(sign * .62), at(sign * 1.12), 6);
  }
  cylinder(scene, steel, .22, p, v(x,y,pipeDepth+1.06), 12);
  const lever = new T.Group();
  lever.position.set(x,y,pipeDepth+1.02);
  scene.add(lever);
  box(lever, red, .32, 2.05, .22, 0, .85, 0);
  box(lever, steel, .42, .42, .22, 0, 0, .08);
  return { lever, openAngle: horizontal ? -Math.PI / 2 : 0 };
}

function gauge(scene) {
  const x = 8.18, y = 51.8, z = 4.82;
  cylinder(scene, brass, .23, v(x,48,pipeDepth), v(x,51,pipeDepth));
  cylinder(scene, black, 1.26, v(x,y,z-.75), v(x,y,z), 64);
  const dial = texture(512,512,(ctx,w,h) => {
    ctx.fillStyle = '#f3f2e6';
    ctx.fillRect(0,0,w,h);
    ctx.translate(w/2,h/2);
    ctx.strokeStyle = ctx.fillStyle = '#202628';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let n = 0; n <= 32; n++) {
      const angle = (225 - 270 * n / 32) * Math.PI / 180;
      const endpoint = n % 4 === 0 ? 200 : 218;
      ctx.beginPath();
      ctx.moveTo(235 * Math.cos(angle), -235 * Math.sin(angle));
      ctx.lineTo(endpoint * Math.cos(angle), -endpoint * Math.sin(angle));
      ctx.lineWidth = n % 4 === 0 ? 5 : 2;
      ctx.stroke();
      if (n % 4 === 0) {
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText(n * 5, 170 * Math.cos(angle), -170 * Math.sin(angle));
      }
    }
    ctx.font = 'bold 31px sans-serif';
    ctx.fillText('PSI', 0, 118);
  });
  mesh(scene, new T.CircleGeometry(1.13,64), new T.MeshBasicMaterial({ map: dial }), v(x,y,z+.015));
  const needle = new T.Group();
  needle.position.set(x,y,z+.03);
  scene.add(needle);
  box(needle, red, .86, .04, .02, .36, 0, 0);
  cylinder(scene, black, .084, v(x,y,z+.025), v(x,y,z+.09));
  return needle;
}

function tube(parent, mat, points, radius, segments = 32) {
  const path = new T.CurvePath();
  for (let i = 1; i < points.length; i++) {
    path.add(new T.LineCurve3(points[i - 1], points[i]));
  }
  return mesh(parent, new T.TubeGeometry(path, segments, radius, 8, false), mat, v(0,0,0));
}

export function createModel(scene, dimension, tag) {
  const wall = box(scene, surface(false), 65, 86, 2.5, 0, 43, -1.25);
  const floor = box(scene, surface(false), 65, 1, 31, 0, -.5, 14.25);
  const wood = surface(true);
  for (const x of [-21,0,21]) {
    box(scene, wood, 3.5, 48, 1.5, x, 48, .75);
    for (const y of [26,46,69]) cylinder(scene, steel, .19, v(x,y,1.45), v(x,y,1.62), 6);
  }
  box(scene, wood, 48, 48, .75, 0, 48, 1.875);
  for (const x of [-21,0,21]) {
    for (const y of [27,69]) cylinder(scene, black, .15, v(x,y,2.25), v(x,y,2.34), 8);
  }
  box(scene, black, 16.6, 8.5, .19, 0, 48, 2.45);
  for (const y of [43.83,52.17]) box(scene, black, 16.6, .17, 2.1, 0, y, 3.43);
  for (const x of [-7.5,7.5]) {
    for (const y of [44.6,51.4]) cylinder(scene, steel, .19, v(x,y,2.50), v(x,y,2.66), 6);
  }
  box(scene, black, 12.7, 1.8, 2.6, 0, 48, 4.8);
  for (const x of [-3.75,3.75]) cartridge(scene,x);

  const p = (x,y) => v(x,y,pipeDepth);
  const pipe = (a,b,r = .4375) => cylinder(scene, copper, r, p(...a), p(...b));
  pipe([-12,48.8],[-12,84]);
  pipe([12,48.8],[12,84]);
  pipe([-12,60],[12,60]);
  for (const sign of [-1,1]) {
    const x = sign * 12;
    pipe([x,59.25],[x,60.75],.57);
    pipe([x,60],[x-sign*.83,60],.57);
    const elbow = new T.QuadraticBezierCurve3(p(x,48.9),p(x,48),p(x-sign*.9,48));
    mesh(scene,new T.TubeGeometry(elbow,16,.4375,16,false),copper,v(0,0,0));
    pipe([x,48.85],[x,49.32],.55);
    pipe([sign*10.77,48],[sign*11.22,48],.55);
    pipe([sign*11.12,48],[sign*6.5,48]);
    cylinder(scene,brass,.72,p(sign*9.88,48),p(sign*10.67,48),6);
    cylinder(scene,brass,.57,p(sign*8.85,48),p(sign*9.92,48),12);
    cylinder(scene,brass,.66,p(sign*8.62,48),p(sign*9.28,48),6);
    cylinder(scene,brass,.54,p(sign*6.5,48),p(sign*8.64,48),12);
    for (let ring = 0; ring < 5; ring++) {
      const thread = sign * (8.02 + ring * .10);
      cylinder(scene,brass,.58,p(thread,48),p(thread + .045,48));
    }
    for (const y of [56.8,68]) {
      cylinder(scene,brass,.2,v(x,y,2.25),v(x,y,3.9));
      pipe([x,y-.19],[x,y+.19],.54);
    }
  }
  box(scene, red, 1.22, .25, .24, -7.42, 49.13, 4.93);
  cylinder(scene, brass, .32, p(8.18,46.6), p(8.18,49.6), 12);
  const flushLever = new T.Group();
  flushLever.position.set(8.18,46.4,4.39);
  scene.add(flushLever);
  box(flushLever, red, .97, .19, .20, .35, 0, 0);
  tube(scene, vinyl, [v(8.18,46.7,4),v(8.18,45.2,4),v(8.37,44.25,4.25),v(8.45,43.2,4.6)],.18);
  const valves = [valve(scene,-12,53.5,false),valve(scene,0,60,true),valve(scene,12,53.5,false)];
  valves.forEach(({lever},i) => tag('V' + (i+1),lever.position.clone().add(v(i===0?-2.35:i===2?2.35:0,i===1?-2.5:0,.45))));
  tag('Cold supply',p(-12,79));
  tag('To appliances',p(12,79));
  dimension('24″ bypass span',v(-12,64,5),v(12,64,5),v(0,65.7,5),'y');
  dimension('60″ AFF',v(-24.2,0,4),v(-24.2,60,4),v(-24.2,33,4),'x');
  dimension('16.6″ manifold',v(-8.3,41.2,4.8),v(8.3,41.2,4.8),v(0,40.1,4.8),'y');
  dimension('20.7″ cartridge',v(6.7,24,5.25),v(6.7,44.7,5.25),v(10.4,34.5,5.25),'x');
  dimension('3″ swap clearance',v(3.75,21,6.4),v(3.75,24,6.4),v(3.75,19.2,6.4),'x');
  return { wall, floor, valves, needle: gauge(scene), flushLever };
}

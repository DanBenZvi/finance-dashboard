"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ParticleBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    const isMobile = W < 768;

    // ── Renderer ─────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // ── Scene + Fog ──────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.009);

    // ── Camera (slightly tilted down for a world-view feel) ──────
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 600);
    camera.position.set(0, 12, 70);
    camera.lookAt(0, -5, 0);

    // ── Grid floor (stretches to horizon) ────────────────────────
    const gridHelper = new THREE.GridHelper(400, 60, 0x3730a3, 0x1e1b4b);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.45;
    gridHelper.position.y = -22;
    scene.add(gridHelper);

    // Secondary closer grid for detail
    const gridClose = new THREE.GridHelper(100, 20, 0x6366f1, 0x312e81);
    (gridClose.material as THREE.Material).transparent = true;
    (gridClose.material as THREE.Material).opacity = 0.15;
    gridClose.position.y = -21.8;
    scene.add(gridClose);

    // ── Floating wireframe geometry ───────────────────────────────
    const floatConfigs = isMobile ? [] : [
      { geo: new THREE.IcosahedronGeometry(5, 1),   pos: new THREE.Vector3(-30,  10, -25), speed: { rx: 0.004, ry: 0.007 }, opacity: 0.14 },
      { geo: new THREE.TorusGeometry(6, 1.2, 6, 14), pos: new THREE.Vector3( 28,  -5, -30), speed: { rx: 0.006, ry: 0.003 }, opacity: 0.12 },
      { geo: new THREE.OctahedronGeometry(4),        pos: new THREE.Vector3( 16,  16, -18), speed: { rx: 0.003, ry: 0.008 }, opacity: 0.16 },
      { geo: new THREE.TetrahedronGeometry(4.5),     pos: new THREE.Vector3(-22, -14, -22), speed: { rx: 0.005, ry: 0.004 }, opacity: 0.13 },
      { geo: new THREE.IcosahedronGeometry(3, 0),    pos: new THREE.Vector3( 38,   6, -12), speed: { rx: 0.007, ry: 0.005 }, opacity: 0.1  },
      { geo: new THREE.TorusGeometry(3, 0.6, 5, 8),  pos: new THREE.Vector3(-42,   2, -35), speed: { rx: 0.002, ry: 0.009 }, opacity: 0.1  },
    ];

    const floatingSpeeds: { rx: number; ry: number }[] = [];
    const floatingBaseY: number[] = [];

    const floatingMeshes = floatConfigs.map(({ geo, pos, speed, opacity }) => {
      const mat = new THREE.MeshBasicMaterial({ color: 0x818cf8, wireframe: true, transparent: true, opacity });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      floatingSpeeds.push(speed);
      floatingBaseY.push(pos.y);
      scene.add(mesh);
      return mesh;
    });

    // ── Particles ─────────────────────────────────────────────────
    const COUNT = isMobile ? 60 : 130;
    const pos3 = new Float32Array(COUNT * 3);
    const col3 = new Float32Array(COUNT * 3);
    const vel2: { x: number; y: number }[] = [];

    const palette = [
      new THREE.Color(0x6366f1), // indigo
      new THREE.Color(0x8b5cf6), // violet
      new THREE.Color(0x06b6d4), // cyan
      new THREE.Color(0xa78bfa), // purple-light
      new THREE.Color(0x3b82f6), // blue
    ];

    for (let i = 0; i < COUNT; i++) {
      pos3[i * 3]     = (Math.random() - 0.5) * 120;
      pos3[i * 3 + 1] = (Math.random() - 0.5) * 80;
      pos3[i * 3 + 2] = (Math.random() - 0.5) * 40;
      vel2.push({ x: (Math.random() - 0.5) * 0.014, y: (Math.random() - 0.5) * 0.014 });
      const c = palette[Math.floor(Math.random() * palette.length)];
      col3[i * 3] = c.r; col3[i * 3 + 1] = c.g; col3[i * 3 + 2] = c.b;
    }

    const ptGeo = new THREE.BufferGeometry();
    ptGeo.setAttribute("position", new THREE.BufferAttribute(pos3, 3));
    ptGeo.setAttribute("color",    new THREE.BufferAttribute(col3, 3));
    const ptMat = new THREE.PointsMaterial({ size: 0.6, vertexColors: true, transparent: true, opacity: 0.85, sizeAttenuation: true });
    scene.add(new THREE.Points(ptGeo, ptMat));

    // ── Connection lines ──────────────────────────────────────────
    const lineMat = new THREE.LineBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.1 });
    let linesMesh: THREE.LineSegments | null = null;
    const CONN = 11;

    const rebuildLines = () => {
      if (linesMesh) { scene.remove(linesMesh); linesMesh.geometry.dispose(); linesMesh = null; }
      const pts: number[] = [];
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx = pos3[i*3] - pos3[j*3], dy = pos3[i*3+1] - pos3[j*3+1];
          if (dx*dx + dy*dy < CONN*CONN) {
            pts.push(pos3[i*3], pos3[i*3+1], pos3[i*3+2], pos3[j*3], pos3[j*3+1], pos3[j*3+2]);
          }
        }
      }
      if (pts.length) {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        linesMesh = new THREE.LineSegments(g, lineMat);
        scene.add(linesMesh);
      }
    };

    // ── Cursor glow sphere ────────────────────────────────────────
    const cursorGeo = new THREE.SphereGeometry(0.8, 8, 8);
    const cursorMat = new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0 });
    const cursorMesh = new THREE.Mesh(cursorGeo, cursorMat);
    cursorMesh.position.z = 30;
    scene.add(cursorMesh);

    // Halo ring around cursor
    const haloGeo = new THREE.TorusGeometry(2.5, 0.1, 6, 24);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0 });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.z = 30;
    scene.add(haloMesh);

    // ── Mouse state ───────────────────────────────────────────────
    const mouse = { tx: 0, ty: 0, x: 0, y: 0, nx: 0.5, ny: 0.5, active: false };
    const onMouse = (e: MouseEvent) => {
      mouse.nx = e.clientX / window.innerWidth;
      mouse.ny = e.clientY / window.innerHeight;
      mouse.tx = (mouse.nx - 0.5) * 9;
      mouse.ty = -(mouse.ny - 0.5) * 9;
      mouse.active = true;
    };
    const onLeave = () => { mouse.active = false; };
    window.addEventListener("mousemove", onMouse);
    document.addEventListener("mouseleave", onLeave);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // ── Animate ───────────────────────────────────────────────────
    let raf: number;
    let tick = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      tick++;
      const t = Date.now() * 0.001;

      // Particles
      for (let i = 0; i < COUNT; i++) {
        pos3[i*3]     += vel2[i].x;
        pos3[i*3+1]   += vel2[i].y;
        if (pos3[i*3]   >  60) pos3[i*3]   = -60;
        if (pos3[i*3]   < -60) pos3[i*3]   =  60;
        if (pos3[i*3+1] >  40) pos3[i*3+1] = -40;
        if (pos3[i*3+1] < -40) pos3[i*3+1] =  40;
      }
      ptGeo.attributes.position.needsUpdate = true;
      if (tick % 4 === 0) rebuildLines();

      // Float wireframe shapes
      floatingMeshes.forEach((m, i) => {
        m.rotation.x += floatingSpeeds[i].rx;
        m.rotation.y += floatingSpeeds[i].ry;
        m.position.y = floatingBaseY[i] + Math.sin(t * 0.7 + i * 1.4) * 1.8;
      });

      // Camera parallax
      mouse.x += (mouse.tx - mouse.x) * 0.045;
      mouse.y += (mouse.ty - mouse.y) * 0.045;
      camera.position.x = mouse.x;
      camera.position.y = 12 + mouse.y * 0.5;
      camera.lookAt(0, -5, 0);

      // Cursor glow
      const targetOpacity = mouse.active ? 0.65 + Math.sin(t * 4) * 0.2 : 0;
      cursorMat.opacity += (targetOpacity - cursorMat.opacity) * 0.08;
      haloMat.opacity   += (targetOpacity * 0.6 - haloMat.opacity) * 0.08;

      cursorMesh.position.x = mouse.tx * 4;
      cursorMesh.position.y = mouse.ty * 4;
      haloMesh.position.x   = mouse.tx * 4;
      haloMesh.position.y   = mouse.ty * 4;
      haloMesh.rotation.z   = t * 1.5;

      // Grid subtle pulse
      (gridHelper.material as THREE.Material).opacity = 0.35 + Math.sin(t * 0.5) * 0.05;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", onResize);
      ptGeo.dispose(); ptMat.dispose(); lineMat.dispose();
      cursorGeo.dispose(); cursorMat.dispose();
      haloGeo.dispose(); haloMat.dispose();
      if (linesMesh) linesMesh.geometry.dispose();
      floatingMeshes.forEach(m => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true" />;
}

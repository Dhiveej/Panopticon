'use client';

import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';

// ===========================================================================
// Palette — Grounded, realistic, non-gamified
// ===========================================================================
const PALETTE = {
  nodeSlate: 0x182030,
  nodeCore: 0x2a3a55,
  nodeThreat: 0xff003c,
  linkNormal: 0x1a2030,
  linkThreat: 0xff003c,
  gridColor: 0x282d3c,
  fogColor: 0x0a0a0e,
  particleNorm: '#00FFFF',
  particleBad: '#FF0000',
  hemiSky: 0x1a2240,
  hemiGround: 0x080810,
  dirLight: 0x8899bb,
  wispColor: 0x141830,
};

// ===========================================================================
// Shared materials (created once, reused for performance)
// ===========================================================================
const normalNodeMat = new THREE.MeshPhysicalMaterial({
  color: 0x0f172a,
  emissive: 0x00f3ff,
  emissiveIntensity: 0.8,
  metalness: 0.8,
  roughness: 0.2,
  transmission: 0.5,
  clearcoat: 1.0,
  flatShading: true,
});

const coreNodeMat = new THREE.MeshPhysicalMaterial({
  color: 0x0f172a,
  emissive: 0x00f3ff,
  emissiveIntensity: 0.9,
  metalness: 0.8,
  roughness: 0.2,
  transmission: 0.5,
  clearcoat: 1.0,
  flatShading: true,
});

const threatNodeMat = new THREE.MeshStandardMaterial({
  color: 0x3a0a10,
  metalness: 0.3,
  roughness: 0.4,
  emissive: PALETTE.nodeThreat,
  emissiveIntensity: 0.6,
  flatShading: true,
  transparent: true,
  opacity: 0.85,
});

// Shared geometries
const normalGeo = new THREE.IcosahedronGeometry(4, 1);
const coreGeo = new THREE.IcosahedronGeometry(7, 1);

// Haze sprite texture (created once)
function createHazeTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 0, 60, 0.25)');
  gradient.addColorStop(0.3, 'rgba(255, 0, 60, 0.10)');
  gradient.addColorStop(0.7, 'rgba(255, 0, 60, 0.03)');
  gradient.addColorStop(1, 'rgba(255, 0, 60, 0.0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

let _hazeTex = null;
function getHazeTexture() {
  if (!_hazeTex) _hazeTex = createHazeTexture();
  return _hazeTex;
}

// Halo sprite textures (created once for performance)
function createHaloTexture(isThreat) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  const glowColor = isThreat ? 'rgba(255, 0, 60, 1)' : 'rgba(0, 243, 255, 1)';
  const fadeColor = isThreat ? 'rgba(255, 0, 60, 0)' : 'rgba(0, 243, 255, 0)';
  gradient.addColorStop(0, glowColor);
  gradient.addColorStop(1, fadeColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

let _haloNormalTex = null;
let _haloThreatTex = null;
function getHaloTexture(isThreat) {
  if (isThreat) {
    if (!_haloThreatTex) _haloThreatTex = createHaloTexture(true);
    return _haloThreatTex;
  } else {
    if (!_haloNormalTex) _haloNormalTex = createHaloTexture(false);
    return _haloNormalTex;
  }
}

// ===========================================================================
// Fracture geometry — displace icosahedron vertices outward
// ===========================================================================
function createFracturedGeo(baseRadius) {
  const geo = new THREE.IcosahedronGeometry(baseRadius, 1);
  const pos = geo.attributes.position;
  const vertex = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    vertex.fromBufferAttribute(pos, i);
    const displacement = 0.6 + Math.random() * 1.2;
    vertex.normalize().multiplyScalar(baseRadius + displacement);
    pos.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// ===========================================================================
// Wisp planes — translucent data-stream depth objects
// ===========================================================================
function createWisps(scene) {
  const wisps = [];
  const wispGeo = new THREE.PlaneGeometry(60, 8);

  for (let i = 0; i < 7; i++) {
    const wispMat = new THREE.MeshBasicMaterial({
      color: PALETTE.wispColor,
      transparent: true,
      opacity: 0.03 + Math.random() * 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(wispGeo, wispMat);
    mesh.position.set(
      (Math.random() - 0.5) * 300,
      -20 + Math.random() * 80,
      (Math.random() - 0.5) * 300
    );
    mesh.rotation.set(
      Math.random() * Math.PI * 0.3,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 0.1
    );
    mesh.scale.set(
      1 + Math.random() * 2,
      1 + Math.random() * 0.5,
      1
    );

    // Store drift velocity
    mesh.userData.drift = {
      vx: (Math.random() - 0.5) * 0.015,
      vy: (Math.random() - 0.5) * 0.005,
      vr: (Math.random() - 0.5) * 0.0003,
    };

    scene.add(mesh);
    wisps.push(mesh);
  }

  return wisps;
}

// ===========================================================================
// Component
// ===========================================================================
export default function PanopticonGraph({ graphData }) {
  const forceGraph = useRef();
  const wispsRef = useRef([]);
  const particlesRef = useRef(null);
  const frameRef = useRef(0);
  const orbitAngle = useRef(0);
  const sceneReady = useRef(false);
  const interacting = useRef(false);
  const interactTimer = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Track threat-involved node IDs
  const threatNodeIds = useMemo(() => {
    const ids = new Set();
    if (graphData?.links) {
      graphData.links.forEach((link) => {
        if (link.threat) {
          ids.add(typeof link.source === 'object' ? link.source.id : link.source);
          ids.add(typeof link.target === 'object' ? link.target.id : link.target);
        }
      });
    }
    return ids;
  }, [graphData]);

  // Responsive sizing
  useEffect(() => {
    const update = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ── Scene Setup (runs once after mount) ────────────────────────────────
  useEffect(() => {
    // Ensure the graph has mounted and the Three.js scene exists
    if (!forceGraph.current) return;
    const scene = forceGraph.current.scene();

    // 1. The Abyssal Fog & Background
    scene.background = new THREE.Color('#020204');
    scene.fog = new THREE.FogExp2('#020204', 0.0008);

    // 2. The Tactical Grid Floor (Check if exists to prevent duplicates)
    if (!scene.getObjectByName('tacticalGrid')) {
      const gridHelper = new THREE.GridHelper(6000, 100, '#00f3ff', '#02101a');
      gridHelper.position.y = -200; // Push it well below the nodes
      gridHelper.name = 'tacticalGrid';
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = 0.3;
      gridHelper.material.blending = THREE.AdditiveBlending;
      scene.add(gridHelper);
    }

    // 3. Parallax Data Dust (The Nebula)
    if (!scene.getObjectByName('dataDust')) {
      const dustGeometry = new THREE.BufferGeometry();
      const dustCount = 5000;
      const dustArray = new Float32Array(dustCount * 3);

      // Spread dust randomly across a massive 3000x3000x3000 cube
      for (let i = 0; i < dustCount * 3; i++) {
        dustArray[i] = (Math.random() - 0.5) * 3000;
      }

      dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustArray, 3));
      const dustMaterial = new THREE.PointsMaterial({
        color: '#00f3ff',
        size: 3.5,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending
      });

      const dustParticles = new THREE.Points(dustGeometry, dustMaterial);
      dustParticles.name = 'dataDust';
      scene.add(dustParticles);

      // Link to existing ref so the animation loop can rotate it
      particlesRef.current = dustParticles;
    }

    // 4. Dual-Tone Cinematic Lighting (Neon Cyber-Deck)
    if (!scene.getObjectByName('hemiLight')) {
      // Remove old ambient light if it exists from a previous hot reload
      const oldAmbient = scene.getObjectByName('ambientLight');
      if (oldAmbient) scene.remove(oldAmbient);

      const hemiLight = new THREE.HemisphereLight('#00f3ff', '#ff003c', 2.0);
      hemiLight.name = 'hemiLight';
      scene.add(hemiLight);
    }

    // --- Retained essential physics and camera fly-in ---
    const fg = forceGraph.current;

    // Force config — tight cluster for visibility
    fg.d3Force('charge')?.strength(-350);
    fg.d3Force('link')?.distance(120);
    fg.d3Force('center')?.strength(0.08);

    // Initial camera position & animated fly-in
    if (!sceneReady.current) {
      fg.cameraPosition({ x: 0, y: 120, z: 250 }, { x: 0, y: 0, z: 0 }, 1500);

      // Pause auto-orbit during initial fly-in
      interacting.current = true;
      setTimeout(() => {
        interacting.current = false;
      }, 1500);

      sceneReady.current = true;
    }
  }, []);

  // ── Animation Loop — wisps drift + auto-orbit camera ───────────────────
  useEffect(() => {
    let animId;
    const animate = () => {
      frameRef.current++;
      const fg = forceGraph.current;
      if (!fg) {
        animId = requestAnimationFrame(animate);
        return;
      }

      // Drift wisps (if any exist)
      wispsRef.current.forEach((w) => {
        const d = w.userData.drift;
        w.position.x += d.vx;
        w.position.y += d.vy;
        w.rotation.y += d.vr;

        // Loop wisps back if they drift too far
        if (Math.abs(w.position.x) > 200) d.vx *= -1;
        if (w.position.y < -30 || w.position.y > 80) d.vy *= -1;
      });

      // Drift Nebula
      if (particlesRef.current) {
        particlesRef.current.rotation.y += 0.0005;
        particlesRef.current.position.y += Math.sin(frameRef.current * 0.005) * 0.05;
      }

      // Auto-orbit camera (Cinematic Palantir Orbit)
      if (!interacting.current) {
        orbitAngle.current += 0.001; // Faster, cinematic sweep
        const distance = 600;
        fg.cameraPosition({
          x: distance * Math.cos(orbitAngle.current),
          z: distance * Math.sin(orbitAngle.current),
          y: 200
        });
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // ── Pause auto-orbit during user interaction ───────────────────────────
  const onInteractionStart = useCallback(() => {
    interacting.current = true;
    if (interactTimer.current) clearTimeout(interactTimer.current);
  }, []);

  const onInteractionEnd = useCallback(() => {
    if (interactTimer.current) clearTimeout(interactTimer.current);
    interactTimer.current = setTimeout(() => {
      // Re-sync orbit angle to current camera position to prevent jump
      const fg = forceGraph.current;
      if (fg) {
        const cam = fg.camera();
        orbitAngle.current = Math.atan2(cam.position.x, cam.position.z);
      }
      interacting.current = false;
    }, 3000);
  }, []);

  // ── Node Three.js Object ──────────────────────────────────────────────
  const createNodeObject = useCallback((node) => {
    const isThreat = threatNodeIds.has(node.id);
    const isCore = node.group === 'core';

    if (isThreat) {
      // --- Fractured threat node ---
      const group = new THREE.Group();

      const fracGeo = createFracturedGeo(isCore ? 7 : 4);
      const mesh = new THREE.Mesh(fracGeo, threatNodeMat);
      mesh.castShadow = true;
      group.add(mesh);

      // Red shard wireframe overlay
      const wire = new THREE.LineSegments(
        new THREE.WireframeGeometry(fracGeo),
        new THREE.LineBasicMaterial({
          color: PALETTE.nodeThreat,
          transparent: true,
          opacity: 0.4,
        })
      );
      group.add(wire);

      // Point light — local crimson glow
      const light = new THREE.PointLight(PALETTE.nodeThreat, 2.0, 60, 2);
      group.add(light);

      // Red haze sprite
      const spriteMat = new THREE.SpriteMaterial({
        map: getHazeTexture(),
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(40, 40, 1);
      group.add(sprite);

      // Programmatic glowing halo sprite
      const haloMat = new THREE.SpriteMaterial({ map: getHaloTexture(true), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 });
      const halo = new THREE.Sprite(haloMat);
      halo.scale.set(isThreat ? 22 : 14, isThreat ? 22 : 14, 1);
      group.add(halo);

      return group;

    } else if (isCore) {
      // --- Core server node ---
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(coreGeo, coreNodeMat);
      mesh.castShadow = true;
      group.add(mesh);

      // Subtle ring
      const ringGeo = new THREE.RingGeometry(9.4, 10.3, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x2a3a55,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      // Programmatic glowing halo sprite
      const haloMat = new THREE.SpriteMaterial({ map: getHaloTexture(false), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 });
      const halo = new THREE.Sprite(haloMat);
      halo.scale.set(isThreat ? 22 : 14, isThreat ? 22 : 14, 1);
      group.add(halo);

      return group;

    } else {
      // --- Normal subnet node ---
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(normalGeo, normalNodeMat);
      mesh.castShadow = true;
      group.add(mesh);

      // Programmatic glowing halo sprite
      const haloMat = new THREE.SpriteMaterial({ map: getHaloTexture(false), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 });
      const halo = new THREE.Sprite(haloMat);
      halo.scale.set(isThreat ? 22 : 14, isThreat ? 22 : 14, 1);
      group.add(halo);

      return group;
    }
  }, [threatNodeIds]);

  return (
    <div className="relative w-full h-screen bg-[#020611]">
      {/* This absolute div creates the cinematic dark shadow around the edges */}
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.85)] z-10" />

      <ForceGraph3D
        ref={forceGraph}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#00000000"
        showNavInfo={false}

        // ── Nodes ──
        nodeThreeObject={createNodeObject}
        nodeThreeObjectExtend={false}

        // ── Links ──
        linkColor={(link) => link.threat ? '#ff003c' : 'rgba(0, 243, 255, 0.4)'}
        linkWidth={(link) => link.threat ? 3.5 : 0.3}
        linkOpacity={1.0}
        linkResolution={10}

        // ── Directional Particles ──
        linkDirectionalParticles={(link) => link.threat ? 12 : 3}
        linkDirectionalParticleSpeed={(link) => link.threat ? 0.015 : 0.003}
        linkDirectionalParticleWidth={(link) => link.threat ? 4.5 : 3.0}
        linkDirectionalParticleColor={(link) =>
          link.threat ? PALETTE.particleBad : PALETTE.particleNorm
        }

        // ── Physics ──
        cooldownTicks={80}
        warmupTicks={40}
        enableNodeDrag={true}
        enableNavigationControls={true}

        // ── Interaction pauses auto-orbit ──
        onNodeDragStart={onInteractionStart}
        onNodeDragEnd={onInteractionEnd}
        onBackgroundClick={onInteractionEnd}

        // ── Node label ──
        nodeLabel={(node) => `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#8899aa;background:rgba(8,8,10,0.85);padding:4px 8px;border-radius:4px;border:1px solid rgba(255,255,255,0.06)">${node.id}</div>`}
      />
    </div>
  );
}
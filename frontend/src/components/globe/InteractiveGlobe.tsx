import React, { useEffect, useRef } from 'react';

interface InteractiveGlobeProps {
  className?: string;
  paused?: boolean;
}

export const InteractiveGlobe: React.FC<InteractiveGlobeProps> = ({ className = '', paused = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(paused);
  const syncRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    pausedRef.current = paused;
    syncRef.current?.();
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let inView = false;
    const canAnimate = () => !pausedRef.current && !motionQuery.matches && !document.hidden && inView;

    let width = container.clientWidth || 720;
    let height = container.clientHeight || 440;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!container || !canvas) return;
      width = container.clientWidth || 720;
      height = container.clientHeight || 440;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    // Continent Polygons
    const CONTINENT_POLYS: [number, number][][] = [
      [[70,-165],[72,-130],[70,-85],[60,-65],[48,-55],[43,-70],[30,-80],[25,-80],[18,-96],[15,-92],[8,-78],[14,-86],[20,-105],[32,-118],[38,-124],[49,-125],[60,-140],[65,-168]],
      [[12,-73],[7,-55],[-3,-36],[-12,-37],[-23,-42],[-34,-53],[-55,-67],[-54,-73],[-40,-73],[-20,-70],[-5,-80],[5,-77]],
      [[71,28],[68,44],[60,30],[55,38],[46,48],[40,27],[36,22],[36,-5],[43,-9],[48,-4],[54,8],[58,6],[62,5],[70,20]],
      [[37,10],[32,32],[28,34],[12,44],[10,51],[-5,40],[-26,33],[-34,18],[-34,26],[-18,12],[5,9],[5,-1],[15,-17],[28,-13],[35,-6]],
      [[76,100],[73,140],[66,170],[58,162],[52,141],[43,132],[38,118],[22,114],[20,107],[10,105],[1,104],[8,77],[22,69],[25,57],[12,44],[30,35],[40,27],[55,38],[58,55],[68,75],[73,80]],
      [[-12,136],[-12,142],[-24,153],[-37,150],[-38,140],[-35,116],[-22,114],[-15,125]],
      [[58,-5],[58,-2],[51,1],[50,-5],[55,-5]],
    ];

    const continentPaths3D = CONTINENT_POLYS.map((poly) =>
      poly.map(([latDeg, lonDeg]) => {
        const lat = (latDeg * Math.PI) / 180;
        const lon = (lonDeg * Math.PI) / 180;
        return {
          x: Math.cos(lat) * Math.sin(lon),
          y: Math.sin(lat),
          z: Math.cos(lat) * Math.cos(lon),
        };
      })
    );

    // Geodesic Vertices
    const numRings = 22;
    const pointsPerRing = 44;
    const sphereVerts: Array<{
      origX: number;
      origY: number;
      origZ: number;
      x: number;
      y: number;
      z: number;
      sx: number;
      sy: number;
      scale: number;
      alpha: number;
    }> = [];

    for (let i = 0; i < numRings; i++) {
      const phi = (Math.PI * (i + 0.5)) / numRings;
      const ringRadius = Math.sin(phi);
      const y = Math.cos(phi);
      for (let j = 0; j < pointsPerRing; j++) {
        const theta = (2 * Math.PI * j) / pointsPerRing;
        const x = ringRadius * Math.cos(theta);
        const z = ringRadius * Math.sin(theta);
        sphereVerts.push({
          origX: x,
          origY: y,
          origZ: z,
          x,
          y,
          z,
          sx: 0,
          sy: 0,
          scale: 0,
          alpha: 0,
        });
      }
    }

    const edges: [number, number][] = [];
    for (let i = 0; i < numRings; i++) {
      for (let j = 0; j < pointsPerRing; j++) {
        const curr = i * pointsPerRing + j;
        const right = i * pointsPerRing + ((j + 1) % pointsPerRing);
        edges.push([curr, right]);
        if (i < numRings - 1) {
          const down = (i + 1) * pointsPerRing + j;
          const diag = (i + 1) * pointsPerRing + ((j + 1) % pointsPerRing);
          edges.push([curr, down]);
          edges.push([curr, diag]);
        }
      }
    }

    const hubs = [
      { ring: 6, index: 12, label: 'LON' },
      { ring: 7, index: 24, label: 'NYC' },
      { ring: 8, index: 38, label: 'TYO' },
      { ring: 7, index: 15, label: 'FRA' },
      { ring: 12, index: 3, label: 'SIN' },
      { ring: 10, index: 19, label: 'DXB' },
    ];

    const arcs = [
      { from: 1, to: 0 },
      { from: 0, to: 3 },
      { from: 3, to: 5 },
      { from: 5, to: 4 },
      { from: 4, to: 2 },
    ];

    let rotX = -0.42;
    let rotY = -0.60;
    let pointerX = 0;
    let pointerY = 0;
    let targetPointerX = 0;
    let targetPointerY = 0;
    let animId = 0;
    let elapsed = 0;
    let lastFrame = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (!canAnimate()) return;
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = (e.clientY / window.innerHeight) * 2 - 1;
      targetPointerX = normX * 24;
      targetPointerY = normY * 16;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const projectPoint = (x: number, y: number, z: number, cx: number, cy: number, R: number) => {
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const x1 = x * cosY - z * sinY;
      const z1 = z * cosY + x * sinY;
      const y2 = y * cosX - z1 * sinX;
      const z2 = z1 * cosX + y * sinX;
      const fov = 650;
      const scale = fov / (fov + z2 * R * 0.45);
      return {
        x: x1,
        y: y2,
        z: z2,
        scale,
        sx: cx + x1 * R * scale,
        sy: cy - y2 * R * scale,
      };
    };

    const draw = (delta = 0) => {
      ctx.clearRect(0, 0, width, height);
      if (delta > 0) {
        pointerX += (targetPointerX - pointerX) * 0.06;
        pointerY += (targetPointerY - pointerY) * 0.06;
        rotY += 0.0035 * delta / (1000 / 60);
        elapsed += delta;
      }

      const cx = width * 0.50 + pointerX;
      const currentRadius = Math.min(width * 0.42, height * 0.46, 260);
      const cy = height * 0.50 + pointerY;

      // 1. Nebula Glow
      const auraGrad = ctx.createRadialGradient(cx, cy, currentRadius * 0.2, cx, cy, currentRadius * 1.3);
      auraGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      auraGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.02)');
      auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, currentRadius * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // 2. Base Sphere
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
      const oceanGrad = ctx.createRadialGradient(cx, cy - currentRadius * 0.4, currentRadius * 0.1, cx, cy, currentRadius);
      oceanGrad.addColorStop(0, '#101010');
      oceanGrad.addColorStop(0.6, '#060606');
      oceanGrad.addColorStop(1, '#000000');
      ctx.fillStyle = oceanGrad;
      ctx.fill();
      ctx.clip();

      // 3. Shaded Continents
      continentPaths3D.forEach((path) => {
        const proj = path.map((pt) => projectPoint(pt.x, pt.y, pt.z, cx, cy, currentRadius));
        const frontCount = proj.filter((p) => p.z > -0.2).length;
        if (frontCount > 2) {
          ctx.beginPath();
          let started = false;
          proj.forEach((p) => {
            if (!started) {
              ctx.moveTo(p.sx, p.sy);
              started = true;
            } else {
              ctx.lineTo(p.sx, p.sy);
            }
          });
          ctx.closePath();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
          ctx.lineWidth = 1.0;
          ctx.stroke();
        }
      });

      // 4. Project Vertices
      sphereVerts.forEach((v) => {
        const p = projectPoint(v.origX, v.origY, v.origZ, cx, cy, currentRadius);
        v.x = p.x;
        v.y = p.y;
        v.z = p.z;
        v.sx = p.sx;
        v.sy = p.sy;
        v.scale = p.scale;
        v.alpha = Math.max(0.05, Math.min(0.65, (p.z + 0.3) * 0.5));
      });

      // 5. Draw Geodesic Mesh
      ctx.lineWidth = 0.8;
      for (let i = 0; i < edges.length; i++) {
        const p1 = sphereVerts[edges[i][0]];
        const p2 = sphereVerts[edges[i][1]];
        if (p1.z > -0.15 && p2.z > -0.15) {
          const edgeAlpha = Math.max(0.06, Math.min(0.55, (p1.z + p2.z) * 0.35));
          ctx.strokeStyle = `rgba(255, 255, 255, ${edgeAlpha * 0.95})`;
          ctx.beginPath();
          ctx.moveTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          ctx.stroke();
        }
      }

      // 6. Draw Nodes
      for (let i = 0; i < sphereVerts.length; i++) {
        const v = sphereVerts[i];
        if (v.z > 0.08) {
          ctx.fillStyle = `rgba(255, 255, 255, ${v.alpha})`;
          ctx.beginPath();
          const nodeRadius = (v.z > 0.4 ? 1.5 : 1.0) * v.scale;
          ctx.arc(v.sx, v.sy, nodeRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 7. Arcs & Traveling Packets
      const now = elapsed;
      for (let a = 0; a < arcs.length; a++) {
        const hFrom = hubs[arcs[a].from];
        const hTo = hubs[arcs[a].to];
        const vFrom = sphereVerts[hFrom.ring * pointsPerRing + hFrom.index];
        const vTo = sphereVerts[hTo.ring * pointsPerRing + hTo.index];
        if (vFrom && vTo && (vFrom.z > -0.1 || vTo.z > -0.1)) {
          const midX = (vFrom.sx + vTo.sx) * 0.5;
          const midY = (vFrom.sy + vTo.sy) * 0.5 - 28 * vFrom.scale;

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = 1.0;
          ctx.setLineDash([3, 4]);
          ctx.beginPath();
          ctx.moveTo(vFrom.sx, vFrom.sy);
          ctx.quadraticCurveTo(midX, midY, vTo.sx, vTo.sy);
          ctx.stroke();
          ctx.setLineDash([]);

          const t = (now / 2400 + a * 0.22) % 1;
          const ptX = (1 - t) * (1 - t) * vFrom.sx + 2 * (1 - t) * t * midX + t * t * vTo.sx;
          const ptY = (1 - t) * (1 - t) * vFrom.sy + 2 * (1 - t) * t * midY + t * t * vTo.sy;

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ptX, ptY, 1.8 * vFrom.scale, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.beginPath();
          ctx.arc(ptX, ptY, 4.5 * vFrom.scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 8. Commercial Hubs
      ctx.font = '600 8.5px "JetBrains Mono", monospace';
      for (let h = 0; h < hubs.length; h++) {
        const hub = hubs[h];
        const hubIdx = hub.ring * pointsPerRing + hub.index;
        if (hubIdx < sphereVerts.length) {
          const hv = sphereVerts[hubIdx];
          if (hv.z > 0.0) {
            const depthFade = Math.max(0.2, Math.min(0.85, (hv.z + 0.2) * 0.85));
            const wavePhase = (now / 1500 + h * 0.25) % 1;
            const waveRadius = wavePhase * 15 * hv.scale;
            const waveAlpha = (1 - wavePhase) * 0.55 * depthFade;

            ctx.strokeStyle = `rgba(255, 255, 255, ${waveAlpha})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(hv.sx, hv.sy, waveRadius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(hv.sx, hv.sy, 2.0 * hv.scale, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 255, 255, ${depthFade * 0.9})`;
            ctx.fillText(hub.label, hv.sx + 8, hv.sy - 4);
          }
        }
      }

      ctx.restore();

      // 9. Solar Rim Corona
      const startAng = Math.PI * 1.12;
      const endAng = Math.PI * 1.88;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 26;
      ctx.beginPath();
      ctx.arc(cx, cy, currentRadius * 1.008, startAng, endAng);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, currentRadius * 1.004, startAng, endAng);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, currentRadius * 1.001, startAng + 0.08, endAng - 0.08);
      ctx.stroke();

    };

    const frame = (time: number) => {
      animId = 0;
      if (!canAnimate()) return;
      draw(lastFrame ? Math.min(time - lastFrame, 50) : 1000 / 60);
      lastFrame = time;
      animId = requestAnimationFrame(frame);
    };
    const sync = () => {
      cancelAnimationFrame(animId);
      animId = 0;
      lastFrame = 0;
      if (canAnimate()) animId = requestAnimationFrame(frame);
    };
    const onResize = () => { resize(); draw(); };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); });
    observer.observe(container);
    syncRef.current = sync;
    document.addEventListener('visibilitychange', sync);
    motionQuery.addEventListener('change', sync);
    window.addEventListener('resize', onResize, { passive: true });
    draw();
    sync();

    return () => {
      cancelAnimationFrame(animId);
      syncRef.current = null;
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      motionQuery.removeEventListener('change', sync);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`hero-globe-stage ${className}`}
      id="globeContainer"
      style={{
        position: 'absolute',
        top: '52%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(100%, 720px)',
        height: '440px',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.38,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        id="globeCanvas"
        aria-hidden="true"
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
};

import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Text,
  Float,
  Stars,
  Environment,
  Billboard,
  Sparkles,
  Edges,
  Line,
  Html,
} from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { type Bookmark } from "@shared/schema";

const CATEGORY_PALETTES: Record<string, string[]> = {
  development: ["#4da4ff", "#66c9ff", "#7ff2ff"],
  design: ["#ff6ea8", "#ff8f6a", "#ffc267"],
  tools: ["#53f596", "#9eff7a", "#3de7d8"],
  general: ["#9b8cff", "#70c8ff", "#75f5ff"],
};

const DEFAULT_PALETTE = ["#4dc7ff", "#35f3db", "#87ff63", "#74a4ff", "#ff8d5e", "#d87aff"];

type Vec3 = [number, number, number];

function getCategoryColor(category: string, indexHint = 0) {
  const key = category.toLowerCase();
  for (const family of Object.keys(CATEGORY_PALETTES)) {
    if (key.includes(family)) {
      const palette = CATEGORY_PALETTES[family];
      return palette[indexHint % palette.length];
    }
  }

  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash << 5) - hash + key.charCodeAt(i);
  return DEFAULT_PALETTE[Math.abs(hash) % DEFAULT_PALETTE.length];
}

function truncateLabel(label: string, max = 18) {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}...`;
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getFavicon(url: string) {
  const domain = getDomain(url);
  return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
}

interface BookmarkNodeProps {
  bookmark: Bookmark;
  position: Vec3;
  color: string;
  glowIntensity: number;
  reducedMotion: boolean;
  highContrast: boolean;
  onSelect: (id: number, position: Vec3) => void;
  onLayoutMove: (id: number, position: Vec3) => void;
  onLayoutCommit: () => void;
  onRipple: (position: Vec3, color: string) => void;
}

function BookmarkNode({
  bookmark,
  position,
  color,
  glowIntensity,
  reducedMotion,
  highContrast,
  onSelect,
  onLayoutMove,
  onLayoutCommit,
  onRipple,
}: BookmarkNodeProps) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const movedDuringDragRef = useRef(false);
  const groupRef = useRef<THREE.Group>(null);
  const shapeVariant = bookmark.title.length % 3;

  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    const targetScale = hovered ? 1.14 : 1;
    const current = groupRef.current.scale.x;
    const lerpSpeed = reducedMotion ? 1 : Math.min(1, delta * 8);
    const next = THREE.MathUtils.lerp(current, targetScale, lerpSpeed);

    groupRef.current.scale.setScalar(next);
    if (!reducedMotion) groupRef.current.rotation.y += delta * 0.24;
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    movedDuringDragRef.current = false;
    setDragging(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging) return;
    e.stopPropagation();
    const next: Vec3 = [e.point.x, e.point.y, e.point.z];
    movedDuringDragRef.current = true;
    onLayoutMove(bookmark.id, next);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging) return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    setDragging(false);
    if (movedDuringDragRef.current) {
      onLayoutCommit();
    }
  };

  const materialProps = {
    color,
    roughness: 0.16,
    metalness: 0.45,
    emissive: color,
    emissiveIntensity: (hovered ? 0.68 : 0.32) * glowIntensity,
    transmission: 0.25,
    thickness: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.09,
    transparent: true,
    opacity: highContrast ? 1 : 0.95,
  };

  return (
    <group position={position}>
      <Float speed={reducedMotion ? 0.6 : 1.7} rotationIntensity={reducedMotion ? 0.1 : 0.35} floatIntensity={reducedMotion ? 0.1 : 0.55}>
        <group
          ref={groupRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = dragging ? "grabbing" : "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = "auto";
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(bookmark.id, position);
            onRipple(position, color);
            window.open(bookmark.url, "_blank", "noopener,noreferrer");
          }}
        >
          <mesh position={[0, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.52, 0.92, 48]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={(hovered ? 0.68 : 0.4) * glowIntensity}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          <mesh position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.16, 0.46, 1.4, 32, 1, true]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={(hovered ? 0.16 : 0.08) * glowIntensity}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {shapeVariant === 0 ? (
            <>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[1.1, 1.1, 1.1]} />
                <meshPhysicalMaterial {...materialProps} />
                <Edges color="#e6f6ff" threshold={15} scale={1.01} />
              </mesh>
              <mesh>
                <boxGeometry args={[1.35, 1.35, 1.35]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={(hovered ? 0.26 : 0.14) * glowIntensity}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
            </>
          ) : null}

          {shapeVariant === 1 ? (
            <>
              <mesh castShadow receiveShadow>
                <dodecahedronGeometry args={[0.72, 0]} />
                <meshPhysicalMaterial {...materialProps} />
                <Edges color="#e6f6ff" threshold={15} scale={1.02} />
              </mesh>
              <mesh>
                <dodecahedronGeometry args={[0.93, 0]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={(hovered ? 0.24 : 0.12) * glowIntensity}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
            </>
          ) : null}

          {shapeVariant === 2 ? (
            <>
              <mesh castShadow receiveShadow>
                <octahedronGeometry args={[0.82, 0]} />
                <meshPhysicalMaterial {...materialProps} />
                <Edges color="#e6f6ff" threshold={15} scale={1.02} />
              </mesh>
              <mesh>
                <octahedronGeometry args={[1.06, 0]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={(hovered ? 0.24 : 0.12) * glowIntensity}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
            </>
          ) : null}

          <Billboard follow position={[0, 1.05, 0]}>
            <Text
              fontSize={hovered ? 0.26 : 0.22}
              color={highContrast ? "#ffffff" : "#ecfbff"}
              anchorX="center"
              anchorY="middle"
              maxWidth={2.8}
              outlineWidth={0.018}
              outlineColor="#050a1e"
            >
              {truncateLabel(bookmark.title)}
            </Text>
          </Billboard>

          {hovered ? (
            <Html position={[0, 1.7, 0]} center transform distanceFactor={8}>
              <div className="pointer-events-none rounded-lg border border-cyan-200/35 bg-slate-950/85 px-2 py-1 text-xs text-cyan-50 shadow-[0_0_20px_rgba(65,220,255,0.2)] backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <img src={getFavicon(bookmark.url)} alt="favicon" className="h-3.5 w-3.5" />
                  <span>{getDomain(bookmark.url)}</span>
                </div>
              </div>
            </Html>
          ) : null}
        </group>
      </Float>
    </group>
  );
}

function HoloPlatform({ glowIntensity }: { glowIntensity: number }) {
  const beaconAngles = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);

  return (
    <group position={[0, -2.3, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[3.35, 3.75, 1.05, 72]} />
        <meshStandardMaterial
          color="#08122d"
          roughness={0.35}
          metalness={0.7}
          emissive="#184a9d"
          emissiveIntensity={0.22 * glowIntensity}
        />
      </mesh>

      <mesh position={[0, 0.63, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.85, 3.1, 0.26, 72]} />
        <meshStandardMaterial
          color="#112354"
          roughness={0.2}
          metalness={0.58}
          emissive="#1f6ed0"
          emissiveIntensity={0.34 * glowIntensity}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.78, 0]}>
        <ringGeometry args={[2.62, 2.86, 80]} />
        <meshBasicMaterial
          color="#95e9ff"
          transparent
          opacity={0.82 * glowIntensity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.79, 0]}>
        <ringGeometry args={[1.78, 1.96, 80]} />
        <meshBasicMaterial
          color="#47f6ff"
          transparent
          opacity={0.66 * glowIntensity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.58, 0]}>
        <torusGeometry args={[2.98, 0.1, 22, 88]} />
        <meshStandardMaterial
          color="#5ad7ff"
          emissive="#67dfff"
          emissiveIntensity={0.46 * glowIntensity}
          roughness={0.28}
          metalness={0.74}
        />
      </mesh>

      {beaconAngles.map((angle) => (
        <group key={angle} position={[Math.cos(angle) * 2.84, 0.72, Math.sin(angle) * 2.84]}>
          <mesh>
            <cylinderGeometry args={[0.08, 0.08, 0.36, 16]} />
            <meshBasicMaterial
              color="#8cecff"
              transparent
              opacity={0.52 * glowIntensity}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      <Sparkles count={18} size={4.4} scale={[2.9, 1.05, 2.9]} speed={0.22} color="#88eaff" />
    </group>
  );
}

function CenterLogo({ glowIntensity, highContrast }: { glowIntensity: number; highContrast: boolean }) {
  return (
    <Float speed={1.05} rotationIntensity={0.06} floatIntensity={0.2}>
      <Billboard follow position={[0, -0.87, 0]}>
        <group>
          <mesh position={[0, 0, -0.04]}>
            <planeGeometry args={[2.95, 0.94]} />
            <meshBasicMaterial
              color="#6be8ff"
              transparent
              opacity={0.22 * glowIntensity}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <Text
            fontSize={0.9}
            color={highContrast ? "#ffffff" : "#defbff"}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.04}
            outlineColor="#0b5f8f"
          >
            SBM
          </Text>
        </group>
      </Billboard>
    </Float>
  );
}

function Ripple({ position, color, bornAt, glowIntensity }: { position: Vec3; color: string; bornAt: number; glowIntensity: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const age = (Date.now() - bornAt) / 1000;
    const scale = 1 + age * 5;
    meshRef.current.scale.set(scale, scale, scale);
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (0.38 - age * 0.28) * glowIntensity);
  });

  return (
    <mesh ref={meshRef} position={[position[0], position[1] - 0.35, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.15, 0.26, 42]} />
      <meshBasicMaterial color={color} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function CameraRig({
  controlsRef,
  focusTarget,
  reducedMotion,
  zoomDistance,
}: {
  controlsRef: React.RefObject<any>;
  focusTarget: THREE.Vector3 | null;
  reducedMotion: boolean;
  zoomDistance: number;
}) {
  const { camera } = useThree();

  useFrame((_state, delta) => {
    if (!focusTarget || !controlsRef.current) return;

    const speed = reducedMotion ? 1 : Math.min(1, delta * 3.2);
    controlsRef.current.target.lerp(focusTarget, speed);

    const desired = focusTarget
      .clone()
      .add(new THREE.Vector3(0, zoomDistance * 0.21, zoomDistance * 0.51));
    camera.position.lerp(desired, speed);
    controlsRef.current.update();
  });

  return null;
}

interface SceneProps {
  bookmarks: Bookmark[];
  glowIntensity?: number;
  autoRotateSpeed?: number;
  zoomDistance?: number;
  particleDensity?: number;
  performanceMode?: boolean;
  reducedMotion?: boolean;
  highContrast?: boolean;
  focusedBookmarkId?: number | null;
  focusResetSignal?: number;
  onFocusChange?: (id: number | null) => void;
  onLayoutSave?: (layouts: Array<Pick<Bookmark, "id" | "x" | "y" | "z" | "scale" | "pinned">>) => void;
}

export default function Scene({
  bookmarks,
  glowIntensity = 1.1,
  autoRotateSpeed = 0.35,
  zoomDistance = 16,
  particleDensity = 120,
  performanceMode = false,
  reducedMotion = false,
  highContrast = false,
  focusedBookmarkId = null,
  focusResetSignal = 0,
  onFocusChange,
  onLayoutSave,
}: SceneProps) {
  const controlsRef = useRef<any>(null);
  const [rippleEvents, setRippleEvents] = useState<Array<{ id: number; position: Vec3; color: string; bornAt: number }>>([]);
  const [positions, setPositions] = useState<Record<number, Vec3>>({});
  const [forcedFocusTarget, setForcedFocusTarget] = useState<THREE.Vector3 | null>(null);

  const groupedBookmarks = useMemo(() => {
    const groups: Record<string, Bookmark[]> = {};

    for (const bookmark of bookmarks) {
      if (!groups[bookmark.category]) groups[bookmark.category] = [];
      groups[bookmark.category].push(bookmark);
    }

    return groups;
  }, [bookmarks]);

  const categoryEntries = useMemo(
    () => Object.entries(groupedBookmarks).sort((a, b) => a[0].localeCompare(b[0])),
    [groupedBookmarks],
  );

  useEffect(() => {
    const next: Record<number, Vec3> = {};
    const categoryCount = categoryEntries.length || 1;
    const categoryRingRadius = Math.max(5.5, categoryCount * 2.2);

    categoryEntries.forEach(([_, categoryBookmarks], categoryIndex) => {
      const angle = (categoryIndex / categoryCount) * Math.PI * 2;
      const centerX = Math.cos(angle) * categoryRingRadius;
      const centerZ = Math.sin(angle) * categoryRingRadius;

      categoryBookmarks.forEach((bookmark, bookmarkIndex) => {
        if (typeof bookmark.x === "number" && typeof bookmark.y === "number" && typeof bookmark.z === "number") {
          if (bookmark.x !== 0 || bookmark.y !== 0 || bookmark.z !== 0) {
            next[bookmark.id] = [bookmark.x, bookmark.y, bookmark.z];
            return;
          }
        }

        const row = Math.floor(bookmarkIndex / 4);
        const col = bookmarkIndex % 4;
        const spreadX = (col - 1.5) * 1.9;
        const spreadZ = row * 1.8;
        const spin = angle + Math.PI / 2;

        const rotatedX = spreadX * Math.cos(spin) - spreadZ * Math.sin(spin);
        const rotatedZ = spreadX * Math.sin(spin) + spreadZ * Math.cos(spin);

        next[bookmark.id] = [centerX + rotatedX, row % 2 === 0 ? 0.2 : -0.1, centerZ + rotatedZ];
      });
    });

    setPositions(next);
  }, [categoryEntries]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setRippleEvents((prev) => prev.filter((event) => now - event.bornAt < 1200));
    }, 140);

    return () => clearInterval(timer);
  }, []);

  const focusTarget = useMemo(() => {
    if (!focusedBookmarkId) return null;
    const p = positions[focusedBookmarkId];
    if (!p) return null;
    return new THREE.Vector3(p[0], p[1], p[2]);
  }, [focusedBookmarkId, positions]);

  useEffect(() => {
    if (!focusResetSignal) return;
    setForcedFocusTarget(new THREE.Vector3(0, -1.2, 0));
    const timer = setTimeout(() => setForcedFocusTarget(null), 1200);
    return () => clearTimeout(timer);
  }, [focusResetSignal]);

  const effectiveFocusTarget = focusTarget ?? forcedFocusTarget;

  const links = useMemo(() => {
    const linkElements: JSX.Element[] = [];

    categoryEntries.forEach(([category, categoryBookmarks], categoryIndex) => {
      const color = getCategoryColor(category, categoryIndex);
      const points = categoryBookmarks
        .map((bookmark) => positions[bookmark.id])
        .filter((point): point is Vec3 => !!point)
        .map((point) => new THREE.Vector3(point[0], point[1], point[2]));

      if (points.length >= 2) {
        linkElements.push(
          <Line
            key={`link-${category}`}
            points={points}
            color={color}
            transparent
            opacity={0.28 * glowIntensity}
            lineWidth={performanceMode ? 0.8 : 1.3}
          />,
        );
      }
    });

    return linkElements;
  }, [categoryEntries, positions, glowIntensity, performanceMode]);

  const nodes = useMemo(() => {
    const elements: JSX.Element[] = [];
    const categoryCount = categoryEntries.length || 1;
    const categoryRingRadius = Math.max(5.5, categoryCount * 2.2);

    categoryEntries.forEach(([category, categoryBookmarks], categoryIndex) => {
      const angle = (categoryIndex / categoryCount) * Math.PI * 2;
      const centerX = Math.cos(angle) * categoryRingRadius;
      const centerZ = Math.sin(angle) * categoryRingRadius;
      const categoryColor = getCategoryColor(category, categoryIndex);
      const categoryLabel = category.toUpperCase();
      const labelWidth = Math.max(3.2, Math.min(5.4, categoryLabel.length * 0.34 + 1.35));
      const labelFontSize = Math.max(0.38, Math.min(0.48, 4.4 / Math.max(7, categoryLabel.length)));

      elements.push(
        <Billboard key={`header-${category}`} follow position={[centerX, 3.6, centerZ]}>
          <group>
            <mesh position={[0, 0, -0.01]}>
              <planeGeometry args={[labelWidth, 0.75]} />
              <meshBasicMaterial color={categoryColor} transparent opacity={0.2 * glowIntensity} />
            </mesh>
            <Text
              fontSize={labelFontSize}
              color={highContrast ? "#ffffff" : "#e8fbff"}
              anchorX="center"
              anchorY="middle"
              maxWidth={labelWidth - 0.4}
              textAlign="center"
              outlineWidth={0.025}
              outlineColor={categoryColor}
            >
              {categoryLabel}
            </Text>
          </group>
        </Billboard>,
      );

      categoryBookmarks.forEach((bookmark, bookmarkIndex) => {
        const point = positions[bookmark.id];
        if (!point) return;

        elements.push(
          <BookmarkNode
            key={bookmark.id}
            bookmark={bookmark}
            position={point}
            color={categoryColor}
            glowIntensity={glowIntensity}
            reducedMotion={reducedMotion}
            highContrast={highContrast}
            onSelect={(id, nodePosition) => {
              onFocusChange?.(id);
              setRippleEvents((prev) => [
                ...prev,
                { id: Date.now() + bookmarkIndex, position: nodePosition, color: categoryColor, bornAt: Date.now() },
              ]);
            }}
            onLayoutMove={(id, nodePosition) => {
              setPositions((prev) => ({ ...prev, [id]: nodePosition }));
            }}
            onLayoutCommit={() => {
              if (!onLayoutSave) return;
              const payload = bookmarks
                .map((b) => {
                  const p = positions[b.id];
                  if (!p) return null;
                  return {
                    id: b.id,
                    x: p[0],
                    y: p[1],
                    z: p[2],
                    scale: b.scale ?? 1,
                    pinned: b.pinned ?? false,
                  };
                })
                .filter((item): item is NonNullable<typeof item> => !!item);
              onLayoutSave(payload);
            }}
            onRipple={(nodePosition, nodeColor) => {
              setRippleEvents((prev) => [
                ...prev,
                { id: Date.now() + Math.random(), position: nodePosition, color: nodeColor, bornAt: Date.now() },
              ]);
            }}
          />,
        );
      });
    });

    return elements;
  }, [
    bookmarks,
    categoryEntries,
    glowIntensity,
    highContrast,
    onFocusChange,
    onLayoutSave,
    positions,
    reducedMotion,
  ]);

  const starsCount = performanceMode ? 2200 : 5600;
  const sparklesCount = Math.max(24, performanceMode ? Math.floor(particleDensity * 0.35) : particleDensity);
  const starsSpeed = reducedMotion ? 0 : 1;
  const sparklesSpeed = reducedMotion ? 0 : 0.38;

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const target = controls.target.clone();
    const direction = controls.object.position.clone().sub(target).normalize();
    if (direction.lengthSq() === 0) direction.set(0, 0.35, 1).normalize();
    controls.object.position.copy(target.add(direction.multiplyScalar(zoomDistance)));
    controls.update();
  }, [zoomDistance]);

  return (
    <Canvas
      camera={{ position: [0, 6.5, 16], fov: 46 }}
      shadows={!performanceMode}
      dpr={performanceMode ? [0.85, 1.1] : [1, 1.9]}
    >
      <color attach="background" args={[highContrast ? "#020713" : "#040819"]} />
      <fog attach="fog" args={[highContrast ? "#020713" : "#040819", 12, highContrast ? 52 : 35]} />

      <ambientLight intensity={highContrast ? 0.72 : 0.52} />
      <hemisphereLight args={["#92dcff", "#101b2f", highContrast ? 0.85 : 0.6]} />
      <pointLight position={[0, 6, 0]} intensity={(highContrast ? 3.1 : 2.4) * glowIntensity} color="#68ddff" />
      <pointLight position={[12, 5, -8]} intensity={(highContrast ? 1.5 : 1.1) * glowIntensity} color="#60ffa3" />
      <spotLight
        position={[0, 14, 2]}
        angle={0.45}
        penumbra={1}
        intensity={(highContrast ? 2.7 : 2) * glowIntensity}
        color="#b9dcff"
        castShadow={!performanceMode}
      />

      <HoloPlatform glowIntensity={glowIntensity} />
      <CenterLogo glowIntensity={glowIntensity} highContrast={highContrast} />
      <Line
        points={[
          [-16, -1.83, 0],
          [16, -1.83, 0],
        ]}
        color="#4fd9ff"
        transparent
        opacity={0.18 * glowIntensity}
        lineWidth={1}
      />
      <Line
        points={[
          [0, -1.83, -16],
          [0, -1.83, 16],
        ]}
        color="#57f4e2"
        transparent
        opacity={0.18 * glowIntensity}
        lineWidth={1}
      />

      <Stars radius={100} depth={55} count={starsCount} factor={4} saturation={0} fade speed={starsSpeed} />
      <Sparkles count={sparklesCount} size={3.5} scale={[30, 12, 30]} speed={sparklesSpeed} color="#9ad8ff" />
      {!performanceMode ? <Environment preset="city" /> : null}

      <group>{links}</group>
      <group>{nodes}</group>
      <group>
        {rippleEvents.map((ripple) => (
          <Ripple
            key={ripple.id}
            position={ripple.position}
            color={ripple.color}
            bornAt={ripple.bornAt}
            glowIntensity={glowIntensity}
          />
        ))}
      </group>

      <CameraRig
        controlsRef={controlsRef}
        focusTarget={effectiveFocusTarget}
        reducedMotion={reducedMotion}
        zoomDistance={zoomDistance}
      />

      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        enableRotate
        autoRotate={!reducedMotion}
        autoRotateSpeed={autoRotateSpeed}
        minDistance={zoomDistance}
        maxDistance={zoomDistance}
        maxPolarAngle={Math.PI * 0.75}
      />
    </Canvas>
  );
}

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Float, Stars, Environment } from "@react-three/drei";
import { useState, useRef, useMemo } from "react";
import * as THREE from "three";
import { type Bookmark } from "@shared/schema";
import { motion } from "framer-motion-3d"; 

// Generate a deterministic color from a string (category)
function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
}

interface CubeProps {
  bookmark: Bookmark;
  position: [number, number, number];
  onClick: () => void;
}

function BookmarkCube({ bookmark, position, onClick }: CubeProps) {
  const [hovered, setHover] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Subtle rotation animation
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.2;
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  const color = useMemo(() => stringToColor(bookmark.category), [bookmark.category]);

  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <motion.mesh
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHover(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={(e) => {
            setHover(false);
            document.body.style.cursor = 'auto';
          }}
          animate={{
            scale: hovered ? 1.2 : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial 
            color={color} 
            metalness={0.6} 
            roughness={0.2} 
            emissive={color}
            emissiveIntensity={hovered ? 0.5 : 0.1}
          />
        </motion.mesh>
      </Float>
      
      {/* Label above the cube */}
      {hovered && (
        <Text
          position={[0, 1.5, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000"
        >
          {bookmark.title}
        </Text>
      )}
      <Text
        position={[0, -1.2, 0]}
        fontSize={0.2}
        color="#aaa"
        anchorX="center"
        anchorY="middle"
      >
        {bookmark.category}
      </Text>
    </group>
  );
}

interface SceneProps {
  bookmarks: Bookmark[];
}

export default function Scene({ bookmarks }: SceneProps) {
  // Group bookmarks by category to position them in clusters
  const groupedBookmarks = useMemo(() => {
    const groups: Record<string, Bookmark[]> = {};
    bookmarks.forEach(b => {
      if (!groups[b.category]) groups[b.category] = [];
      groups[b.category].push(b);
    });
    return groups;
  }, [bookmarks]);

  // Calculate positions in a radial layout for categories
  const cubeElements = useMemo(() => {
    const elements: JSX.Element[] = [];
    const categories = Object.keys(groupedBookmarks);
    const categoryRadius = 6; // Radius of the category circle
    
    categories.forEach((cat, catIndex) => {
      const catAngle = (catIndex / categories.length) * Math.PI * 2;
      const catCenterX = Math.cos(catAngle) * categoryRadius;
      const catCenterZ = Math.sin(catAngle) * categoryRadius;

      groupedBookmarks[cat].forEach((bookmark, index) => {
        // Spiral layout within category cluster
        const offsetRadius = 1.5 + (index * 0.3);
        const offsetAngle = index * 1.5;
        
        const x = catCenterX + Math.cos(offsetAngle) * offsetRadius;
        const z = catCenterZ + Math.sin(offsetAngle) * offsetRadius;
        // Random slight Y variation for visual interest
        const y = Math.sin(index) * 1; 

        elements.push(
          <BookmarkCube
            key={bookmark.id}
            bookmark={bookmark}
            position={[x, y, z]}
            onClick={() => window.open(bookmark.url, '_blank')}
          />
        );
      });
    });

    return elements;
  }, [groupedBookmarks]);

  return (
    <Canvas camera={{ position: [0, 5, 15], fov: 50 }}>
      <color attach="background" args={['#050505']} />
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#8a2be2" />
      <pointLight position={[-10, -10, -10]} intensity={1} color="#4169e1" />
      <spotLight position={[0, 15, 0]} angle={0.3} penumbra={1} intensity={1} castShadow />
      
      {/* Environment */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Environment preset="city" />

      {/* Content */}
      <group>
        {cubeElements}
      </group>

      <OrbitControls 
        enablePan={true} 
        enableZoom={true} 
        enableRotate={true}
        autoRotate={true}
        autoRotateSpeed={0.5}
        minDistance={5}
        maxDistance={30}
      />
    </Canvas>
  );
}

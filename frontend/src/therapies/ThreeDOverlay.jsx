import React, { useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import * as THREE from 'three';

/**
 * ThreeDOverlay component
 * Renders 3D avatars or overlays to demonstrate correct movements using three.js
 *
 * Props:
 *   width: number
 *   height: number
 */
const ThreeDOverlay = ({ width = 360, height = 270 }) => {
  const mountRef = useRef();

  useEffect(() => {
    // Basic three.js scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // Example: Add a simple animated cube
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshStandardMaterial({ color: 0x6366f1 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    camera.position.z = 3;
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(2, 2, 5);
    scene.add(light);

    let frameId;
    const animate = () => {
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      mountRef.current.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line
  }, []);

  return <Box ref={mountRef} sx={{ width, height, borderRadius: 2, overflow: 'hidden', boxShadow: 2, background: 'transparent' }} />;
};

export default ThreeDOverlay;

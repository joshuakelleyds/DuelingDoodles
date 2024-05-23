import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import doodlebobModel from '../assets/new.glb';

const modelCount = 10;
const boundary = 4;
const minSpeed = 0.002;
const maxSpeed = 0.005;
const minScale = 0.2;
const maxScale = 0.2;
const minRotationSpeed = -0.003;
const maxRotationSpeed = 0.003;
const speedMultiplier = 100;
const speedLimit = 0.01; // set a speed limit to prevent elastic effect

/**
 * DynamicShape component renders animated 3D models that interact with each other.
 */
const DynamicShape = () => {
  const { scene } = useThree();
  const modelsRef = useRef(new THREE.Group());

  // create and configure draco loader
  const dracoLoader = useMemo(() => {
    const loader = new DRACOLoader();
    loader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    return loader;
  }, []);

  // load gltf model with draco loader
  const gltf = useLoader(GLTFLoader, doodlebobModel, (loader) => {
    loader.setDRACOLoader(dracoLoader);
  });

  useEffect(() => {
    // create and configure models
    for (let i = 0; i < modelCount; i++) {
      const model = gltf.scene.clone(); // clone model
      const scale = THREE.MathUtils.randFloat(minScale, maxScale); // randomize scale
      model.scale.set(scale, scale, scale);

      const position = new THREE.Vector3(
        (Math.random() - 0.5) * boundary,
        (Math.random() - 0.5) * boundary,
        0 // z position is fixed
      );

      const speed = new THREE.Vector3(
        THREE.MathUtils.randFloat(minSpeed, maxSpeed) * (Math.random() < 0.5 ? -1 : 1),
        THREE.MathUtils.randFloat(minSpeed, maxSpeed) * (Math.random() < 0.5 ? -1 : 1),
        0 // no movement in z-axis
      );

      const rotationSpeed = new THREE.Vector2(
        THREE.MathUtils.randFloat(minRotationSpeed, maxRotationSpeed),
        THREE.MathUtils.randFloat(minRotationSpeed, maxRotationSpeed)
      );

      model.position.copy(position);
      model.userData = { speed, rotationSpeed }; // store speed and rotationSpeed in model's userData
      modelsRef.current.add(model); // add model to group
    }

    // add models group to scene
    scene.add(modelsRef.current);

    return () => {
      scene.remove(modelsRef.current); // clean up on unmount
    };
  }, [scene, gltf]);

  /**
   * detectCollisions function checks for collisions between models and adjusts their speed.
   */
  const detectCollisions = () => {
    const models = modelsRef.current.children;
    for (let i = 0; i < models.length; i++) {
      for (let j = i + 1; j < models.length; j++) {
        const modelA = models[i];
        const modelB = models[j];
        const distance = modelA.position.distanceTo(modelB.position); // calculate distance between models
        const minDistance = (modelA.scale.x + modelB.scale.x) * 1.3; // determine minimum distance for collision

        if (distance < minDistance) {
          const collisionNormal = new THREE.Vector3().subVectors(modelA.position, modelB.position).normalize(); // calculate collision normal
          const relativeVelocity = new THREE.Vector3().subVectors(modelA.userData.speed, modelB.userData.speed); // calculate relative velocity
          const speedAlongNormal = relativeVelocity.dot(collisionNormal); // calculate speed along the normal

          if (speedAlongNormal < 0) {
            const impulse = collisionNormal.multiplyScalar(-1.5 * speedAlongNormal); // calculate impulse
            modelA.userData.speed.addScaledVector(impulse, 0.8); // update speed for modelA
            modelB.userData.speed.addScaledVector(impulse, -0.8); // update speed for modelB

            // apply speed limit to both models
            modelA.userData.speed.clampLength(0, speedLimit);
            modelB.userData.speed.clampLength(0, speedLimit);
          }
        }
      }
    }
  };

  /**
   * useFrame hook updates the position and rotation of models on each frame.
   */
  useFrame((_, delta) => {
    modelsRef.current.children.forEach((model) => {
      // update position based on speed and delta time
      model.position.x += model.userData.speed.x * delta * speedMultiplier;
      model.position.y += model.userData.speed.y * delta * speedMultiplier;

      // boundary checks for x and y positions
      if (Math.abs(model.position.x) > boundary * 2) model.userData.speed.x *= -1;
      if (Math.abs(model.position.y) > boundary) model.userData.speed.y *= -1;

      // update rotation based on rotation speed and delta time
      model.rotation.x += model.userData.rotationSpeed.x * delta * speedMultiplier;
      model.rotation.y += model.userData.rotationSpeed.y * delta * speedMultiplier;
    });

    detectCollisions(); // check for collisions
  });

  return null; // no need to render anything directly
};

export default DynamicShape;

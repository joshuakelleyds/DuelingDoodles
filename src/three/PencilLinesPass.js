import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass';
import * as THREE from 'three';
import { PencilLinesMaterial } from './PencilLinesMaterial';

export class PencilLinesPass extends Pass {
  constructor(scene, camera, width, height) {
    super();
    this.scene = scene;
    this.camera = camera;

    this.normalMaterial = new THREE.MeshNormalMaterial();

    this.normalBuffer = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      stencilBuffer: false,
    });

    this.material = new PencilLinesMaterial();
    this.fsQuad = new FullScreenQuad(this.material);

    this.material.uniforms.uResolution.value = new THREE.Vector2(width, height);
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
  }

  render(renderer, writeBuffer, readBuffer) {
    // Render normal buffer
    renderer.setRenderTarget(this.normalBuffer);
    const overrideMaterialValue = this.scene.overrideMaterial;
    this.scene.overrideMaterial = this.normalMaterial;
    renderer.render(this.scene, this.camera);
    this.scene.overrideMaterial = overrideMaterialValue;

    // Set uniforms
    this.material.uniforms.uNormals.value = this.normalBuffer.texture;
    this.material.uniforms.tDiffuse.value = readBuffer.texture;

    // Render final pass
    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
      this.fsQuad.render(renderer);
    }
  }
}

import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D tDiffuse;
  uniform sampler2D uNormals;
  uniform vec2 uResolution;
  varying vec2 vUv;

  float getValue(sampler2D tex, vec2 uv) {
    vec3 luma = vec3(0.299, 0.587, 0.114);
    return dot(texture2D(tex, uv).rgb, luma);
  }

  float combinedSobelValue() {
    mat3 Gx = mat3(-1, -2, -1, 0, 0, 0, 1, 2, 1);
    mat3 Gy = mat3(-1, 0, 1, -2, 0, 2, -1, 0, 1);

    float tx0y0 = getValue(tDiffuse, vUv + vec2(-1.0, -1.0) / uResolution);
    float tx0y1 = getValue(tDiffuse, vUv + vec2(-1.0, 0.0) / uResolution);
    float tx0y2 = getValue(tDiffuse, vUv + vec2(-1.0, 1.0) / uResolution);
    float tx1y0 = getValue(tDiffuse, vUv + vec2( 0.0, -1.0) / uResolution);
    float tx1y1 = getValue(tDiffuse, vUv + vec2( 0.0, 0.0) / uResolution);
    float tx1y2 = getValue(tDiffuse, vUv + vec2( 0.0, 1.0) / uResolution);
    float tx2y0 = getValue(tDiffuse, vUv + vec2( 1.0, -1.0) / uResolution);
    float tx2y1 = getValue(tDiffuse, vUv + vec2( 1.0, 0.0) / uResolution);
    float tx2y2 = getValue(tDiffuse, vUv + vec2( 1.0, 1.0) / uResolution);

    float valueGx = Gx[0][0] * tx0y0 + Gx[1][0] * tx1y0 + Gx[2][0] * tx2y0 +
                    Gx[0][1] * tx0y1 + Gx[1][1] * tx1y1 + Gx[2][1] * tx2y1 +
                    Gx[0][2] * tx0y2 + Gx[1][2] * tx1y2 + Gx[2][2] * tx2y2;

    float valueGy = Gy[0][0] * tx0y0 + Gy[1][0] * tx1y0 + Gy[2][0] * tx2y0 +
                    Gy[0][1] * tx0y1 + Gy[1][1] * tx1y1 + Gy[2][1] * tx2y1 +
                    Gy[0][2] * tx0y2 + Gy[1][2] * tx1y2 + Gy[2][2] * tx2y2;

    float G = (valueGx * valueGx) + (valueGy * valueGy);
    return clamp(G, 0.0, 1.0);
  }

  vec3 getWatercolor(vec2 uv) {
    vec3 color1 = vec3(0.4, 0.6, 0.8); // Blue
    vec3 color2 = vec3(0.6, 0.7, 0.9); // Lighter Blue
    vec3 color3 = vec3(0.2, 0.4, 0.6); // Darker Blue

    float noise1 = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 400.0);
    float noise2 = fract(sin(dot(uv + vec2(0.5, 0.5), vec2(12.9898, 78.233))) * 4.0);
    float noise3 = fract(sin(dot(uv + vec2(1.0, 1.0), vec2(12.9898, 78.233))) * 0.8);

    vec3 watercolor = mix(color1, color2, noise1);
    watercolor = mix(watercolor, color3, noise2);
    watercolor = mix(watercolor, vec3(1.0), noise3);

    return watercolor;
  }

  void main() {
    vec4 baseColor = texture2D(tDiffuse, vUv);

    // Only apply effects if the alpha channel indicates the presence of an object
    if (baseColor.a > 0.0) {
      float sobelValue = combinedSobelValue();
      sobelValue = smoothstep(0.01, .9, sobelValue);

      vec3 watercolor = getWatercolor(vUv);
      vec3 lineColor = vec3(0.1, 0.12, 0.2) * watercolor;

      if (sobelValue > 0.1) {
        gl_FragColor = vec4(lineColor, 1.0);
      } else {
        gl_FragColor = vec4(watercolor, 1.0);
      }
    } else {
      gl_FragColor = baseColor;
    }
  }
`;

export class PencilLinesMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        tDiffuse: { value: null },
        uNormals: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader,
      fragmentShader,
    });
  }
}

export const npeVertexShader = `
uniform float uTime;
uniform float uPulseSpeed;
attribute float aRandomMultiplier;
varying float vAlpha;

void main() {
    vec3 pos = position;
    
    // Continuous pulsing cloud mapping input data streams
    float pulse = sin(uTime * uPulseSpeed + aRandomMultiplier * 10.0) * 0.5 + 0.5;
    
    // Slight jitter to simulate active mapping
    pos.x += sin(uTime * 2.0 + pos.y * 5.0) * 0.1 * pulse;
    pos.y += cos(uTime * 1.5 + pos.x * 5.0) * 0.1 * pulse;
    pos.z += sin(uTime * 2.5 + pos.z * 5.0) * 0.1 * pulse;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (15.0 * pulse + 5.0) * (1.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    
    vAlpha = pulse * 0.8 + 0.2;
}
`;

export const npeFragmentShader = `
varying float vAlpha;
uniform vec3 uColor;

void main() {
    // Circular particle
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) {
        discard;
    }
    
    // Soft edge glow
    float glow = exp(-r * 3.0);
    gl_FragColor = vec4(uColor, vAlpha * glow);
}
`;

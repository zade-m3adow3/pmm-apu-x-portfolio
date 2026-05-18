export const gimFragmentShader = `
varying vec2 vUv;
uniform float uTime;
uniform float uIntegrity; // 0 for safe, 1 for breach

void main() {
    // Basic pulse logic
    float pulse = sin(uTime * 5.0) * 0.5 + 0.5;
    
    vec3 safeColor = vec3(0.06, 0.72, 0.5); // Emerald
    vec3 breachColor = vec3(0.93, 0.26, 0.26); // Crimson
    
    // Mix based on integrity predicate I(t)
    vec3 color = mix(safeColor, breachColor, uIntegrity);
    
    // Add pulsing intensity when breached
    float intensity = uIntegrity > 0.5 ? (1.0 + pulse * 0.5) : 0.8;
    
    gl_FragColor = vec4(color * intensity, 0.6);
}
`;

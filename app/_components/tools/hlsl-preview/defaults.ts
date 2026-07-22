/** Default vertex entry: `vert(position, uv, out vUv) -> clip-space position` */
export const DEFAULT_VERTEX_HLSL = `float4 vert(float3 position, float2 uv, out float2 vUv)
{
	vUv = uv;
	// Fullscreen quad in clip space (z = 0)
	return float4(position.xy, 0.0, 1.0);
}
`;

/** Default fragment entry: `frag(vUv, fragCoord) -> color` */
export const DEFAULT_FRAGMENT_HLSL = `float4 frag(float2 vUv, float2 fragCoord)
{
	float2 uv = vUv;
	float3 col = float3(uv, 0.5 + 0.5 * sin(iTime));
	col = lerp(col, float3(0.1, 0.15, 0.25), 0.25);
	return float4(saturate(col), 1.0);
}
`;

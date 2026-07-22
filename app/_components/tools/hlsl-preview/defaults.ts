/** Pixel-space mesh → clip; pass color + texCoord to fragment. */
export const DEFAULT_VERTEX_HLSL = `float4 vert(float2 position, float4 color, float3 texCoord, out float4 vColor, out float3 vTexCoord)
{
	vColor = color;
	vTexCoord = texCoord;
	float2 clip = float2(
		position.x / iResolution.x * 2.0 - 1.0,
		1.0 - position.y / iResolution.y * 2.0
	);
	return float4(clip, 0.0, 1.0);
}
`;

/** Sample iChannel0 (Textures[0]) and multiply by vertex color. */
export const DEFAULT_FRAGMENT_HLSL = `float4 frag(float4 vColor, float3 vTexCoord)
{
	float4 tex = tex2D(iChannel0, vTexCoord.xy);
	return tex * vColor;
}
`;

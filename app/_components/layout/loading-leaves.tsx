import type { ReactNode } from "react";

/** Heart-shaped clover leaflet; base sits at the SVG origin. */
function Leaflet({
	fill,
	scale = 1,
	rotate = 0,
	opacity = 1,
}: {
	fill: string;
	scale?: number;
	rotate?: number;
	opacity?: number;
}) {
	// Soft heart/clover leaflet (similar to the uploaded motif), tip pointing up.
	return (
		<path
			fill={fill}
			opacity={opacity}
			transform={`rotate(${rotate}) scale(${scale})`}
			d="M0 0
				C-10 -8, -38 -18, -42 -44
				C-46 -68, -24 -86, 0 -98
				C24 -86, 46 -68, 42 -44
				C38 -18, 10 -8, 0 0
				Z"
		/>
	);
}

type SpinLayerProps = {
	duration: string;
	direction?: "normal" | "reverse";
	children: ReactNode;
};

function SpinLayer({
	duration,
	direction = "normal",
	children,
}: SpinLayerProps) {
	const to = direction === "reverse" ? "-360 0 0" : "360 0 0";
	return (
		<g>
			<animateTransform
				attributeName="transform"
				type="rotate"
				from="0 0 0"
				to={to}
				dur={duration}
				repeatCount="indefinite"
			/>
			{children}
		</g>
	);
}

/**
 * Mixed-size / mixed-color leaflets with bases meeting at the center.
 * Two layers spin in opposite directions for an interlaced effect.
 */
export const LoadingLeaves = ({ className }: { className?: string }) => {
	return (
		<svg
			className={className}
			viewBox="-120 -120 240 240"
			width={240}
			height={240}
			aria-hidden
		>
			{/* Back — larger, slower, darker */}
			<SpinLayer duration="10s">
				<Leaflet
					fill="#1b7931"
					scale={1.14}
					rotate={0}
					opacity={0.85}
				/>
				<Leaflet
					fill="#2a6b3f"
					scale={0.9}
					rotate={120}
					opacity={0.8}
				/>
				<Leaflet
					fill="#245c38"
					scale={1.04}
					rotate={240}
					opacity={0.88}
				/>
			</SpinLayer>
			{/* Front — smaller, faster, lighter, offset angles */}
			<SpinLayer
				duration="6s"
				direction="reverse"
			>
				<Leaflet
					fill="#8fbcab"
					scale={0.72}
					rotate={40}
					opacity={0.75}
				/>
				<Leaflet
					fill="#5a9a72"
					scale={0.52}
					rotate={160}
					opacity={0.7}
				/>
				<Leaflet
					fill="#6fa882"
					scale={0.62}
					rotate={280}
					opacity={0.78}
				/>
			</SpinLayer>
		</svg>
	);
};

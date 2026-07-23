import type { ReactNode } from "react";

/** Heart-shaped clover leaflet; base sits at the SVG origin. */
function Leaflet({
	fill,
	scale = 1,
	rotate = 0,
	opacity = 1,
	pulseDur = "3.2s",
	pulseDelay = "0s",
}: {
	fill: string;
	scale?: number;
	rotate?: number;
	opacity?: number;
	/** How long one breathe-in/out cycle takes. */
	pulseDur?: string;
	/** Stagger so leaflets don't pulse in sync. */
	pulseDelay?: string;
}) {
	const min = +(scale * 0.72).toFixed(3);
	const max = +(scale * 1.18).toFixed(3);

	// Soft heart/clover leaflet (similar to the uploaded motif), tip pointing up.
	// Outer group holds the fixed angle; inner group pulses scale from the base (0,0).
	return (
		<g transform={`rotate(${rotate})`}>
			<g>
				<animateTransform
					attributeName="transform"
					type="scale"
					values={`${min};${max};${min}`}
					keyTimes="0;0.5;1"
					dur={pulseDur}
					begin={pulseDelay}
					repeatCount="indefinite"
					calcMode="spline"
					keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
				/>
				<path
					fill={fill}
					opacity={opacity}
					d="M0 0
						C-10 -8, -38 -18, -42 -44
						C-46 -68, -24 -86, 0 -98
						C24 -86, 46 -68, 42 -44
						C38 -18, 10 -8, 0 0
						Z"
				/>
			</g>
		</g>
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
 * Three layers spin at different speeds/directions; each leaflet also breathes in scale.
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
					pulseDur="3.6s"
					pulseDelay="0s"
				/>
				<Leaflet
					fill="#2a6b3f"
					scale={0.9}
					rotate={120}
					opacity={0.8}
					pulseDur="4.2s"
					pulseDelay="-1.1s"
				/>
				<Leaflet
					fill="#245c38"
					scale={1.04}
					rotate={240}
					opacity={0.88}
					pulseDur="3.1s"
					pulseDelay="-2.0s"
				/>
			</SpinLayer>
			{/* Mid — medium size, mid speed, offset between the other rings */}
			<SpinLayer duration="7.5s">
				<Leaflet
					fill="#3d8f5c"
					scale={0.88}
					rotate={80}
					opacity={0.78}
					pulseDur="3.3s"
					pulseDelay="-0.7s"
				/>
				<Leaflet
					fill="#4a7d5e"
					scale={0.76}
					rotate={200}
					opacity={0.72}
					pulseDur="3.8s"
					pulseDelay="-1.9s"
				/>
				<Leaflet
					fill="#367a50"
					scale={0.84}
					rotate={320}
					opacity={0.8}
					pulseDur="2.9s"
					pulseDelay="-1.3s"
				/>
			</SpinLayer>
			{/* Front — smaller, faster, lighter, reverse */}
			<SpinLayer
				duration="6s"
				direction="reverse"
			>
				<Leaflet
					fill="#8fbcab"
					scale={0.72}
					rotate={40}
					opacity={0.75}
					pulseDur="2.8s"
					pulseDelay="-0.4s"
				/>
				<Leaflet
					fill="#5a9a72"
					scale={0.52}
					rotate={160}
					opacity={0.7}
					pulseDur="3.4s"
					pulseDelay="-1.6s"
				/>
				<Leaflet
					fill="#6fa882"
					scale={0.62}
					rotate={280}
					opacity={0.78}
					pulseDur="2.5s"
					pulseDelay="-0.9s"
				/>
			</SpinLayer>
		</svg>
	);
};

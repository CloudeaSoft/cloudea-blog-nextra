import type { CSSProperties } from "react";

type LeafletProps = {
	fill: string;
	/** Base scale of this leaflet (pulse animates around it). */
	scale?: number;
	rotate?: number;
	opacity?: number;
	pulseDur?: string;
	pulseDelay?: string;
};

/** Heart-shaped clover leaflet; tip up, base at the canvas center (120,120). */
function Leaflet({
	fill,
	scale = 1,
	rotate = 0,
	opacity = 1,
	pulseDur = "3.2s",
	pulseDelay = "0s",
}: LeafletProps) {
	const min = +(scale * 0.72).toFixed(3);
	const max = +(scale * 1.18).toFixed(3);

	// SVG attribute keeps the fixed angle (reliable). CSS only pulses scale
	// around the shared root so motion starts with the stylesheet.
	return (
		<g transform={`rotate(${rotate} 120 120)`}>
			<g
				className="leaflet-pulse"
				style={
					{
						"--leaflet-scale-min": min,
						"--leaflet-scale-max": max,
						"--leaflet-pulse-dur": pulseDur,
						"--leaflet-pulse-delay": pulseDelay,
					} as CSSProperties
				}
			>
				<path
					fill={fill}
					opacity={opacity}
					d="M120 120
						C110 112, 82 102, 78 76
						C74 52, 96 34, 120 22
						C144 34, 166 52, 162 76
						C158 102, 130 112, 120 120
						Z"
				/>
			</g>
		</g>
	);
}

type RingProps = {
	className: string;
	leaves: LeafletProps[];
};

/**
 * One spinning ring as its own SVG so CSS `transform-origin: center` is
 * reliable (avoids SMIL, which often only starts after React hydration).
 */
function LeafRing({ className, leaves }: RingProps) {
	return (
		<svg
			className={className}
			viewBox="0 0 240 240"
			width={240}
			height={240}
			aria-hidden
		>
			{leaves.map((leaf) => (
				<Leaflet
					key={`${leaf.rotate}-${leaf.fill}`}
					{...leaf}
				/>
			))}
		</svg>
	);
}

/**
 * Three rings of leaflets (mixed size/color), bases meeting at the center.
 * CSS-driven spin + pulse so motion starts with first paint, not hydration.
 */
export const LoadingLeaves = ({ className }: { className?: string }) => {
	return (
		<div className={className}>
			{/* Back — larger, slower, darker */}
			<LeafRing
				className="leaves-ring leaves-ring--slow"
				leaves={[
					{
						fill: "#1b7931",
						scale: 1.14,
						rotate: 0,
						opacity: 0.85,
						pulseDur: "3.6s",
						pulseDelay: "0s",
					},
					{
						fill: "#2a6b3f",
						scale: 0.9,
						rotate: 120,
						opacity: 0.8,
						pulseDur: "4.2s",
						pulseDelay: "-1.1s",
					},
					{
						fill: "#245c38",
						scale: 1.04,
						rotate: 240,
						opacity: 0.88,
						pulseDur: "3.1s",
						pulseDelay: "-2.0s",
					},
				]}
			/>
			{/* Mid — medium size / speed, angle-offset */}
			<LeafRing
				className="leaves-ring leaves-ring--mid"
				leaves={[
					{
						fill: "#3d8f5c",
						scale: 0.88,
						rotate: 80,
						opacity: 0.78,
						pulseDur: "3.3s",
						pulseDelay: "-0.7s",
					},
					{
						fill: "#4a7d5e",
						scale: 0.76,
						rotate: 200,
						opacity: 0.72,
						pulseDur: "3.8s",
						pulseDelay: "-1.9s",
					},
					{
						fill: "#367a50",
						scale: 0.84,
						rotate: 320,
						opacity: 0.8,
						pulseDur: "2.9s",
						pulseDelay: "-1.3s",
					},
				]}
			/>
			{/* Front — smaller, faster, reverse */}
			<LeafRing
				className="leaves-ring leaves-ring--fast"
				leaves={[
					{
						fill: "#8fbcab",
						scale: 0.72,
						rotate: 40,
						opacity: 0.75,
						pulseDur: "2.8s",
						pulseDelay: "-0.4s",
					},
					{
						fill: "#5a9a72",
						scale: 0.52,
						rotate: 160,
						opacity: 0.7,
						pulseDur: "3.4s",
						pulseDelay: "-1.6s",
					},
					{
						fill: "#6fa882",
						scale: 0.62,
						rotate: 280,
						opacity: 0.78,
						pulseDur: "2.5s",
						pulseDelay: "-0.9s",
					},
				]}
			/>
		</div>
	);
};

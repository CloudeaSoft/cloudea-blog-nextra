import { formatPercent, type RarityShareBucket } from "./stats";

const STAR_COLORS: Record<number, string> = {
	6: "#ff6a3d",
	5: "#e6b422",
	4: "#7a45e8",
	3: "#9aa3ab",
	2: "#b0bec5",
	1: "#90a4ae",
};

function starColor(stars: number): string {
	return STAR_COLORS[stars] ?? "#9e9e9e";
}

function polarToCartesian(
	cx: number,
	cy: number,
	radius: number,
	angleDeg: number,
): { x: number; y: number } {
	const rad = ((angleDeg - 90) * Math.PI) / 180;
	return {
		x: cx + radius * Math.cos(rad),
		y: cy + radius * Math.sin(rad),
	};
}

function describeSlice(
	cx: number,
	cy: number,
	radius: number,
	startAngle: number,
	endAngle: number,
): string {
	const start = polarToCartesian(cx, cy, radius, endAngle);
	const end = polarToCartesian(cx, cy, radius, startAngle);
	const largeArc = endAngle - startAngle > 180 ? 1 : 0;
	return [
		`M ${cx} ${cy}`,
		`L ${start.x} ${start.y}`,
		`A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`,
		"Z",
	].join(" ");
}

type RarityPieChartProps = {
	buckets: RarityShareBucket[];
	total: number;
};

export function RarityPieChart({ buckets, total }: RarityPieChartProps) {
	if (total === 0 || buckets.length === 0) {
		return <p className="ak-gacha__empty">暂无数据可分析。</p>;
	}

	const size = 180;
	const cx = size / 2;
	const cy = size / 2;
	const radius = 78;

	let angle = 0;
	const slices = buckets.map((bucket, index) => {
		const isLast = index === buckets.length - 1;
		const endAngle = isLast ? 360 : angle + bucket.ratio * 360;
		const startAngle = angle;
		angle = endAngle;
		const sweep = endAngle - startAngle;
		const fullCircle = buckets.length === 1 || sweep >= 359.99;
		return {
			...bucket,
			startAngle,
			endAngle,
			fullCircle,
			color: starColor(bucket.stars),
		};
	});

	return (
		<div className="ak-gacha__pie">
			<svg
				className="ak-gacha__pie-svg"
				viewBox={`0 0 ${size} ${size}`}
				width={size}
				height={size}
				role="img"
				aria-label="星级占比饼图"
			>
				{slices.map((slice) =>
					slice.fullCircle
						? (
							<circle
								key={slice.stars}
								cx={cx}
								cy={cy}
								r={radius}
								fill={slice.color}
							/>
						)
						: (
							<path
								key={slice.stars}
								d={describeSlice(
									cx,
									cy,
									radius,
									slice.startAngle,
									slice.endAngle,
								)}
								fill={slice.color}
							/>
						),
				)}
			</svg>

			<ul className="ak-gacha__pie-legend">
				{buckets.map((bucket) => (
					<li key={bucket.stars} className="ak-gacha__pie-legend-item">
						<span
							className="ak-gacha__pie-swatch"
							style={{ background: starColor(bucket.stars) }}
							aria-hidden
						/>
						<span className="ak-gacha__pie-legend-label">
							{bucket.stars}
							★
						</span>
						<span className="ak-gacha__pie-legend-count">
							{bucket.count}
							{" "}
							(
							{formatPercent(bucket.ratio)}
							)
						</span>
					</li>
				))}
				<li className="ak-gacha__pie-legend-total">
					合计
					{" "}
					{total}
					{" "}
					抽
				</li>
			</ul>
		</div>
	);
}

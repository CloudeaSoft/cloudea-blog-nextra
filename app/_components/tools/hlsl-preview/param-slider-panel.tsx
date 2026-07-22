"use client";

export type DemoParam = {
	id: string;
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
};

type ParamSliderPanelProps = {
	title: string;
	hint?: string;
	params: DemoParam[];
	onChange: (id: string, value: number) => void;
};

/** Slider panel driven by `// @param` annotations. */
export function ParamSliderPanel({
	title,
	hint,
	params,
	onChange,
}: ParamSliderPanelProps) {
	return (
		<section className="param-panel">
			<header className="param-panel__header">
				<span className="param-panel__title">{title}</span>
				{hint && <span className="param-panel__hint">{hint}</span>}
			</header>
			{params.length === 0
				? (
					<p className="param-panel__empty">
						No
						{" "}
						<code>@param</code>
						{" "}
						in this editor
					</p>
				)
				: (
					<ul className="param-panel__list">
						{params.map((param) => (
							<li
								key={param.id}
								className="param-panel__row"
							>
								<label
									className="param-panel__label"
									htmlFor={`param-${title}-${param.id}`}
								>
									<span>{param.label}</span>
									<code>{param.value.toFixed(param.step < 0.1 ? 2 : 1)}</code>
								</label>
								<input
									id={`param-${title}-${param.id}`}
									className="param-panel__range"
									type="range"
									min={param.min}
									max={param.max}
									step={param.step}
									value={param.value}
									onChange={(event) =>
										onChange(param.id, Number(event.target.value))}
								/>
							</li>
						))}
					</ul>
				)}
		</section>
	);
}

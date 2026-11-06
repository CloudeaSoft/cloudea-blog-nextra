"use client";
import { useLayoutEffect, useRef } from "react";

export type PlaybackClock = {
	getTime: () => number;
	isPlaying: () => boolean;
	subscribe: (listener: (time: number) => void) => () => void;
};

/** Draw from the media clock directly; React updates only refresh the drawing inputs. */
export function usePlaybackFrame(clock: PlaybackClock, draw: (time: number) => void) {
	const latest = useRef(draw);
	useLayoutEffect(() => {
		latest.current = draw;
		// During playback the next clock tick draws with these updated inputs.
		// Paused edits/seeks must still paint immediately, without a running tick.
		if (!clock.isPlaying()) draw(clock.getTime());
	});
	useLayoutEffect(() => clock.subscribe((time) => latest.current(time)), [clock]);
}

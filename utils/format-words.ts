export default (words: number): string => {
	if (words < 1000) return String(words);
	const formatted = (words / 1000).toFixed(1).replace(/\.0$/, "");
	return `${formatted}k`;
};

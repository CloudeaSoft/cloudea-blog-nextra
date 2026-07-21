import Link from "next/link";
import { getPosts } from "@/app/posts/get-posts";
import cn from "clsx";
import { Item } from "nextra/normalize-pages";

export default async function PostPage() {
	const posts = await getPosts();
	const groupedByYear = posts.reduce<Record<string, Record<string, Item[]>>>(
		(acc, post) => {
			const date = new Date(post.frontMatter.date);
			const year = String(date.getFullYear());
			const monthDay = `${date.getMonth() + 1}/${date.getDate()}`; // 格式: M/D

			if (!acc[year]) acc[year] = {};
			if (!acc[year][monthDay]) acc[year][monthDay] = [];
			acc[year][monthDay].push(post);
			return acc;
		},
		{},
	);

	const sortedYears = Object.keys(groupedByYear).sort((a, b) =>
		b.localeCompare(a),
	);

	return (
		<div
			className={cn(
				"pt-10 mb-7.5 flex justify-center",
				"max-lg:pt-0 max-lg:mb-0",
			)}
		>
			<div className={cn("max-w-250 relative w-[80%] h-full", "max-lg:w-full")}>
				<div
					className={cn(
						"p-7.5 border border-solid rounded-[18px] border-(--border-color) shadow-(--cloudea-box-shadow) bg-(--background-color-transparent-80)",
						"max-lg:p-5 max-lg:rounded-none",
					)}
				>
					<div>
						{sortedYears.map((year) => {
							const yearMonths = groupedByYear[year];
							const totalPosts = Object.values(yearMonths).reduce(
								(sum, posts) => sum + posts.length,
								0,
							);

							return (
								<section
									key={year}
									className="mb-2"
								>
									<div className="flex items-center mb-2">
										<span className="font-semibold text-3xl mr-2">{year}</span>
										<span className="text-xs font-bold rounded-sm bg-(--third-background-color) border py-0.5 px-2.5 border-(--border-color)">
											{totalPosts}
										</span>
									</div>
									<ul className="pl-0 md:pl-8">
										{Object.entries(groupedByYear[year]).map(
											([monthDay, posts]) => (
												<li
													key={monthDay}
													data-date={monthDay}
													className={cn(
														"px-6 pt-10 pb-2 text-xl relative border-l-2 border-(--border-color) flex flex-col gap-4",
														"before:content-[attr(data-date)] before:absolute before:left-[2em] before:top-[1em] before:font-bold before:color-(--third-text-color) before:text-[0.785rem]",
														"after:w-3 after:h-3 after:absolute after:top-5 after:-left-1.75 after:rounded-2xl after:border-2 after:border-solid after:border-(--third-text-color) after:bg-(--background-color)",
													)}
												>
													{Object.entries(posts).map(([, post]) => (
														<Link
															key={post.route}
															href={post.route}
														>
															<span
																className={cn(
																	"relative",
																	"after:w-1.75 after:h-1.75 after:block after:absolute after:top-[0.5em] after:left-[-1.8rem] after:rounded-full after:border after:border-solid after:border-(--border-color) after:bg-(--fourth-text-color)",
																)}
															>
																{post.title}
															</span>
														</Link>
													))}
												</li>
											),
										)}
									</ul>
								</section>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}

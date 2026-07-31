"use client";

import { Icon } from "@iconify-icon/react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
	clearAuth,
	isAuthComplete,
	loadAuth,
	saveAuth,
} from "./auth-storage";
import { exchangeHgToken } from "./auth-exchange";
import {
	fetchAllHistoryForCategory,
	fetchCategories,
} from "./client";
import { mergeHistoryRecords, rarityStars, recordKey, categoryLabel } from "./parse";
import { RarityPieChart } from "./rarity-pie";
import {
	knownRecordKeys,
	listCachedCategories,
	loadCategoryRecords,
	mergeDisplayCategories,
	saveCategoryRecords,
	sortRecordsNewestFirst,
	type CachedCategoryInfo,
} from "./records-storage";
import {
	computePullCostStats,
	computeRarityShare,
	filterRecordsByPool,
	formatAvgPulls,
	formatPercent,
	listPoolsFromRecords,
	sixStarHistory,
} from "./stats";
import type { GachaAuth, GachaCategory, GachaRecord } from "./types";
import { GachaApiError } from "./types";

import "./arknights-gacha.css";

function emptyAuth(): GachaAuth {
	return { uid: "", cookie: "", accountToken: "", roleToken: "" };
}

function formatTime(date: Date): string {
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleString("zh-CN", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
}

/** 6★ 出货成本对应的状态（欧皇/正常/非酋）。 */
function sixStarLuck(avg: number | null): { label: string; tone: "lucky" | "normal" | "unlucky" } | null {
	if (avg === null) return null;
	if (avg <= 35) return { label: "欧皇", tone: "lucky" };
	if (avg <= 50) return { label: "正常", tone: "normal" };
	return { label: "非酋", tone: "unlucky" };
}

/** 单个六星出货在横向时间线上的颜色（按成本从绿到红渐变）。 */
function sixStarCostColor(cost: number): string {
	// 1-30: 绿 → 黄；31-60: 黄 → 橙；61+: 橙 → 红
	if (cost <= 30) {
		const t = cost / 30;
		return `hsl(${Math.round(140 - t * 60)}, 70%, 55%)`;
	}
	if (cost <= 60) {
		const t = (cost - 30) / 30;
		return `hsl(${Math.round(80 - t * 40)}, 75%, 55%)`;
	}
	const t = Math.min((cost - 60) / 40, 1);
	return `hsl(${Math.round(40 - t * 30)}, 80%, 55%)`;
}

function errorMessage(error: unknown): string {
	if (error instanceof GachaApiError) return error.message;
	if (error instanceof Error) return error.message;
	return "Unknown error";
}

export function ArknightsGachaTool() {
	const [auth, setAuth] = useState<GachaAuth>(emptyAuth);
	const [hgToken, setHgToken] = useState("");
	const [roleLabel, setRoleLabel] = useState("");
	const [hydrated, setHydrated] = useState(false);
	const [apiCategories, setApiCategories] = useState<GachaCategory[]>([]);
	const [cachedCategories, setCachedCategories] = useState<CachedCategoryInfo[]>([]);
	const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
	const [records, setRecords] = useState<GachaRecord[]>([]);
	const [recordsExpanded, setRecordsExpanded] = useState(false);
	const [status, setStatus] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loadingCategories, setLoadingCategories] = useState(false);
	const [loadingHistory, setLoadingHistory] = useState(false);
	const [, startTransition] = useTransition();
	const abortRef = useRef<AbortController | null>(null);

	const displayCategories = useMemo(
		() => mergeDisplayCategories(apiCategories, cachedCategories),
		[apiCategories, cachedCategories],
	);

	/** All records across every cached category (global analysis), newest-first. */
	const analysisRecords = useMemo(() => {
		const uid = auth.uid.trim();
		if (!uid) return [];
		let merged: GachaRecord[] = [];
		for (const category of cachedCategories) {
			merged = mergeHistoryRecords(merged, loadCategoryRecords(uid, category.id));
		}
		return sortRecordsNewestFirst(merged);
	}, [auth.uid, cachedCategories]);

	const analysisPools = useMemo(
		() => listPoolsFromRecords(analysisRecords),
		[analysisRecords],
	);

	/**
	 * Per-pool analysis cards for the 全卡池一览 panel.
	 * Each pool gets its own stats and rarity share; pity never spans pools.
	 */
	const poolAnalyses = useMemo(
		() => analysisPools.map((pool) => {
			const poolRecords = filterRecordsByPool(analysisRecords, pool.poolId);
			return {
				...pool,
				stats: computePullCostStats(poolRecords),
				sixHistory: sixStarHistory(poolRecords),
				rarityBuckets: computeRarityShare(poolRecords),
			};
		}),
		[analysisPools, analysisRecords],
	);

	function refreshCachedCategories(uid: string) {
		setCachedCategories(uid.trim() ? listCachedCategories(uid) : []);
	}

	useEffect(() => {
		startTransition(() => {
			const loaded = loadAuth();
			setAuth(loaded);
			setHgToken(loaded.accountToken);
			if (loaded.uid) {
				setRoleLabel(`uid ${loaded.uid}`);
			}
			setCachedCategories(
				loaded.uid.trim() ? listCachedCategories(loaded.uid) : [],
			);
			setHydrated(true);
		});
		return () => {
			abortRef.current?.abort();
		};
	}, []);

	function handleClearAuth() {
		clearAuth();
		abortRef.current?.abort();
		setAuth(emptyAuth());
		setHgToken("");
		setRoleLabel("");
		setApiCategories([]);
		setCachedCategories([]);
		setActiveCategoryId(null);
		setRecords([]);
		setStatus("已清除本地认证信息（抽卡记录缓存仍保留）");
		setError(null);
	}

	async function handleUpdateCategories() {
		if (!hgToken.trim()) {
			setError("请先填写 token");
			return;
		}

		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setLoadingCategories(true);
		setError(null);
		setStatus("正在验证账号…");
		setActiveCategoryId(null);
		setRecords([]);

		try {
			const result = await exchangeHgToken(hgToken, {
				signal: controller.signal,
				preferUid: auth.uid || undefined,
			});
			const saved = saveAuth(result.auth);
			setAuth(saved);
			setHgToken(saved.accountToken);
			setRoleLabel(
				`${result.role.nickName} · ${result.role.channelName || "未知渠道"} · uid ${result.role.uid}`,
			);
			refreshCachedCategories(saved.uid);
			setStatus("账号验证成功，正在更新卡池…");

			const next = await fetchCategories(saved, { signal: controller.signal });
			setApiCategories(next);
			const cached = listCachedCategories(saved.uid);
			setCachedCategories(cached);
			const uncached = next.filter(
				(item) => !cached.some((entry) => entry.id === item.id),
			).length;
			setStatus(
				`分类 ${next.length} 个（缓存 ${cached.length}，未缓存 ${uncached}）`,
			);
		} catch (err) {
			if (err instanceof Error && err.name === "AbortError") return;
			setError(errorMessage(err));
			setStatus(null);
		} finally {
			setLoadingCategories(false);
		}
	}

	function handleSelectCategory(categoryId: string) {
		if (!auth.uid.trim()) {
			setError("请先填写 uid");
			return;
		}

		// Switching category cancels any in-flight record fetch.
		abortRef.current?.abort();
		abortRef.current = null;
		setLoadingHistory(false);

		const cached = loadCategoryRecords(auth.uid, categoryId);
		setActiveCategoryId(categoryId);
		setError(null);
		setRecords(cached);
		setStatus(
			cached.length > 0
				? `已加载缓存 ${cached.length} 条（点击「拉取记录」同步官网）`
				: "该分类暂无缓存，点击「拉取记录」从官网获取",
		);
	}

	async function handleFetchRecords() {
		if (!auth.uid.trim()) {
			setError("请先填写 uid");
			return;
		}
		if (!activeCategoryId) {
			setError("请先选择卡池分类");
			return;
		}
		if (!isAuthComplete(auth)) {
			setError("请先填写完整认证信息");
			return;
		}

		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		const categoryId = activeCategoryId;
		const cached = loadCategoryRecords(auth.uid, categoryId);
		const cacheKeys = knownRecordKeys(cached);
		const categoryMeta = displayCategories.find((item) => item.id === categoryId);
		const name = categoryMeta?.name ?? categoryId;
		const label = categoryMeta?.label ?? categoryLabel(name);

		setError(null);
		setRecords(cached);
		setLoadingHistory(true);
		setStatus(
			cached.length > 0
				? `已加载缓存 ${cached.length} 条，正在同步…`
				: "正在拉取抽卡记录…",
		);

		try {
			const fetched = await fetchAllHistoryForCategory(auth, categoryId, {
				signal: controller.signal,
				knownKeys: cacheKeys.size > 0 ? cacheKeys : undefined,
				onProgress: ({ pages, records: count, hasMore }) => {
					setStatus(
						hasMore
							? `正在同步… 新拉取 ${count} 条（第 ${pages} 页）`
							: `同步完成：本轮 ${count} 条（共 ${pages} 页）`,
					);
				},
			});

			const beforeKeys = cacheKeys;
			const added = fetched.filter((item) => !beforeKeys.has(recordKey(item))).length;
			const merged = sortRecordsNewestFirst(
				mergeHistoryRecords(fetched, cached),
			);
			saveCategoryRecords(auth.uid, categoryId, merged, { name, label });
			refreshCachedCategories(auth.uid);
			setRecords(merged);

			if (merged.length === 0) {
				setStatus("该分类暂无记录（未写入空缓存）");
			} else if (cached.length > 0) {
				setStatus(`已缓存 ${merged.length} 条（本轮新增 ${added}）`);
			} else {
				setStatus(`已缓存 ${merged.length} 条`);
			}
		} catch (err) {
			if (err instanceof Error && err.name === "AbortError") return;
			setError(errorMessage(err));
			if (cached.length === 0) {
				setStatus(null);
				setRecords([]);
			} else {
				setStatus(`同步失败，仍显示缓存 ${cached.length} 条`);
			}
		} finally {
			setLoadingHistory(false);
		}
	}

	const busy = loadingCategories || loadingHistory;

	return (
		<div className="ak-gacha">
			<header className="ak-gacha__header">
				<div>
					<h1 className="ak-gacha__title">Arknights Gacha History</h1>
					<p className="ak-gacha__desc">
						填写鹰角账号 token 后点击「更新卡池」即可登录并刷新分类。
						选择分类仅读取本地缓存；点击「拉取记录」才会请求官网并增量同步。
					</p>
				</div>
			</header>

			<section className="ak-gacha__panel" aria-labelledby="ak-gacha-auth-heading">
				<div className="ak-gacha__panel-head">
					<h2 id="ak-gacha-auth-heading" className="ak-gacha__panel-title">
						认证信息
					</h2>
					<p className="ak-gacha__hint">
						1. 在
						{" "}
						<a
							href="https://ak.hypergryph.com/"
							target="_blank"
							rel="noreferrer"
						>
							ak.hypergryph.com
						</a>
						{" "}
						登录后，打开
						{" "}
						<a
							href="https://web-api.hypergryph.com/account/info/hg"
							target="_blank"
							rel="noreferrer"
						>
							web-api.hypergryph.com/account/info/hg
						</a>
						。
						<br />
						2. 页面上会出现一大段文字。找到
						{" "}
						<code>content</code>
						{" "}
						这个词，它后面有一对英文引号
						{" "}
						<code>&quot;…&quot;</code>
						，中间那一长串才是密钥。
						<br />
						3. 只复制引号里的内容（不要带上引号），填到下方输入框。
						<br />
						注：点击「更新卡池」会自动登录并刷新分类。密钥会保存在本机浏览器里。
						<br />
						后端代理源码：
						<a
							href="https://github.com/CloudeaSoft/cloudea-blog-nextra/blob/main/scripts/cloudflare-worker.mjs"
							target="_blank"
							rel="noreferrer"
						>
							scripts/cloudflare-worker.mjs
						</a>
						。
					</p>
				</div>

				<div className="ak-gacha__form">
					<label className="ak-gacha__field">
						<span>token</span>
						<input
							value={hgToken}
							onChange={(e) => setHgToken(e.target.value)}
							autoComplete="off"
							spellCheck={false}
							disabled={!hydrated || busy}
							placeholder="鹰角账号 token"
						/>
					</label>
					{roleLabel
						? (
							<p className="ak-gacha__session">
								当前角色：
								{roleLabel}
							</p>
						)
						: null}
				</div>

				<div className="ak-gacha__actions">
					<button
						type="button"
						className="ak-gacha__btn ak-gacha__btn--primary"
						onClick={() => void handleUpdateCategories()}
						disabled={!hydrated || busy || !hgToken.trim()}
					>
						<Icon icon="mdi:download" width={16} height={16} />
						更新卡池
					</button>
					<button
						type="button"
						className="ak-gacha__btn"
						onClick={handleClearAuth}
						disabled={!hydrated || busy}
					>
						清除
					</button>
				</div>
			</section>

			{(error || (status && displayCategories.length === 0)) && (
				<div
					className={
						error ? "ak-gacha__banner ak-gacha__banner--error" : "ak-gacha__banner"
					}
					role="status"
				>
					{error ?? status}
				</div>
			)}

			{displayCategories.length > 0 && (
				<section className="ak-gacha__panel" aria-labelledby="ak-gacha-cate-heading">
					<h2 id="ak-gacha-cate-heading" className="ak-gacha__panel-title">
						卡池分类
					</h2>
					<p className="ak-gacha__hint">
						点击分类切换本地缓存；确认后再点「拉取记录」同步官网，避免误触频繁请求。
					</p>
					<div className="ak-gacha__chips" role="tablist" aria-label="卡池分类">
						{displayCategories.map((category) => {
							const selected = category.id === activeCategoryId;
							return (
								<button
									key={category.id}
									type="button"
									role="tab"
									aria-selected={selected}
									className={
										selected
											? "ak-gacha__chip ak-gacha__chip--active"
											: "ak-gacha__chip"
									}
									onClick={() => handleSelectCategory(category.id)}
									disabled={loadingCategories}
									title={category.id}
								>
									<span className="ak-gacha__chip-name">{category.label}</span>
									{category.cached
										? (
											<span className="ak-gacha__chip-meta">
												{category.recordCount}
											</span>
										)
										: (
											<span className="ak-gacha__chip-meta ak-gacha__chip-meta--new">
												未缓存
											</span>
										)}
								</button>
							);
						})}
					</div>
					<div className="ak-gacha__actions">
						<button
							type="button"
							className="ak-gacha__btn ak-gacha__btn--primary"
							onClick={() => void handleFetchRecords()}
							disabled={
								!hydrated
								|| busy
								|| !activeCategoryId
								|| !isAuthComplete(auth)
							}
						>
							<Icon icon="mdi:download" width={16} height={16} />
							拉取记录
						</button>
						{status
							? (
								<span className="ak-gacha__action-status" role="status">
									{status}
								</span>
							)
							: null}
					</div>

					{(loadingHistory || records.length > 0 || activeCategoryId) && (
						<section
							className="ak-gacha__panel ak-gacha__records-panel"
							aria-labelledby="ak-gacha-list-heading"
						>
							<div
								className={
									recordsExpanded
										? "ak-gacha__panel-head"
										: "ak-gacha__panel-head ak-gacha__panel-head--collapsed"
								}
							>
								<button
									type="button"
									className="ak-gacha__panel-title-row ak-gacha__collapse-trigger"
									aria-expanded={recordsExpanded}
									aria-controls="ak-gacha-records-body"
									onClick={() => setRecordsExpanded((open) => !open)}
								>
									<div className="ak-gacha__panel-title-group">
										<span id="ak-gacha-list-heading" className="ak-gacha__panel-title">
											抽卡记录
											{records.length > 0
												? (
													<span className="ak-gacha__count">
														(
														{records.length}
														)
													</span>
												)
												: null}
										</span>
										{loadingHistory && (
											<span className="ak-gacha__loading">
												<Icon icon="mdi:loading" width={16} height={16} className="ak-gacha__spin" />
												加载中
											</span>
										)}
									</div>
									<span className="ak-gacha__collapse-btn" aria-hidden>
										<Icon
											icon={recordsExpanded ? "mdi:chevron-up" : "mdi:chevron-down"}
											width={22}
											height={22}
										/>
									</span>
								</button>
							</div>

							{recordsExpanded
								? (
									<div id="ak-gacha-records-body">
										{!loadingHistory && records.length === 0
											? (
												<p className="ak-gacha__empty">该分类暂无记录，或尚未完成拉取。</p>
											)
											: (
												<div className="ak-gacha__table-wrap">
													<table className="ak-gacha__table">
														<thead>
															<tr>
																<th>时间</th>
																<th>卡池</th>
																<th>干员</th>
																<th>稀有度</th>
															</tr>
														</thead>
														<tbody>
															{records.map((record) => (
																<tr key={`${record.gachaTs}-${record.pos}-${record.charId}`}>
																	<td>{formatTime(record.gachaAt)}</td>
																	<td>{record.poolName}</td>
																	<td>
																		<span className="ak-gacha__char">
																			{record.charName}
																			{record.isNew
																				? (
																					<span className="ak-gacha__new-tag">NEW</span>
																				)
																				: null}
																		</span>
																	</td>
																	<td>
																		<span
																			className={`ak-gacha__rarity ak-gacha__rarity--${rarityStars(record.rarity)}`}
																		>
																			{"★".repeat(rarityStars(record.rarity))}
																		</span>
																	</td>
																</tr>
															))}
														</tbody>
													</table>
												</div>
											)}
									</div>
								)
								: null}
						</section>
					)}
				</section>
			)}

			{analysisRecords.length > 0 && (
				<section className="ak-gacha__panel" aria-labelledby="ak-gacha-analysis-heading">
					<h2 id="ak-gacha-analysis-heading" className="ak-gacha__panel-title">
						卡池分析
					</h2>
					<p className="ak-gacha__hint">
						基于全部
						{" "}
						{analysisRecords.length}
						{" "}
						条记录（
						{cachedCategories.length}
						{" "}
						个分类），按卡池分别统计。平均消耗按相邻同星出货间隔计算；保底为距上次六星的抽数。
					</p>
					<div className="ak-gacha__pool-grid">
						{poolAnalyses.map((pool) => {
							const luck = sixStarLuck(pool.stats.avgSixStar);
							const maxSixCost = Math.max(1, ...pool.sixHistory.map((e) => e.count));
							return (
								<article
									key={pool.poolId}
									className="ak-gacha__pool-card"
									title={pool.poolId}
								>
									<div className="ak-gacha__pool-card-head">
										<h3 className="ak-gacha__pool-card-title">
											<span className="ak-gacha__pool-card-name">{pool.poolName}</span>
											<span className="ak-gacha__count">
												{pool.count}
												抽
											</span>
										</h3>
										{luck
											? (
												<span
													className={`ak-gacha__luck ak-gacha__luck--${luck.tone}`}
													title={`6★ 平均消耗 ${formatAvgPulls(pool.stats.avgSixStar)} 抽`}
												>
													{luck.label}
												</span>
											)
											: null}
									</div>

									{/* 稀有度分布条 */}
									<div
										className="ak-gacha__rarity-bar"
										role="img"
										aria-label={`稀有度分布：${pool.rarityBuckets.map((b) => `${b.stars}★ ${b.count}次`).join("，")}`}
									>
										{pool.rarityBuckets.map((bucket) => (
											<span
												key={bucket.stars}
												className={`ak-gacha__rarity-bar-seg ak-gacha__rarity-bar-seg--${bucket.stars}`}
												style={{ width: `${bucket.ratio * 100}%` }}
												title={`${bucket.stars}★ ${bucket.count} 次 (${formatPercent(bucket.ratio)})`}
											/>
										))}
									</div>

									<ul className="ak-gacha__metrics">
										<li className="ak-gacha__metric ak-gacha__metric--5star">
											<span className="ak-gacha__metric-label">5★ 平均消耗</span>
											<span className="ak-gacha__metric-value">
												{formatAvgPulls(pool.stats.avgFiveStar)}
												{pool.stats.avgFiveStar !== null
													? (
														<span className="ak-gacha__metric-unit">抽</span>
													)
													: null}
											</span>
											<span className="ak-gacha__metric-sub">
												共
												{" "}
												{pool.stats.fiveStarCount}
												{" "}
												次
											</span>
										</li>
										<li className="ak-gacha__metric ak-gacha__metric--6star">
											<span className="ak-gacha__metric-label">6★ 平均消耗</span>
											<span className="ak-gacha__metric-value">
												{formatAvgPulls(pool.stats.avgSixStar)}
												{pool.stats.avgSixStar !== null
													? (
														<span className="ak-gacha__metric-unit">抽</span>
													)
													: null}
											</span>
											<span className="ak-gacha__metric-sub">
												共
												{" "}
												{pool.stats.sixStarCount}
												{" "}
												次
											</span>
										</li>
										<li className="ak-gacha__metric ak-gacha__metric--pity">
											<span className="ak-gacha__metric-label">当次保底已抽</span>
											<span className="ak-gacha__metric-value">
												{pool.stats.currentPity}
												<span className="ak-gacha__metric-unit">抽</span>
											</span>
											<span className="ak-gacha__metric-sub">距上次六星</span>
											<span
												className="ak-gacha__pity-track"
												aria-hidden
											>
												<span
													className="ak-gacha__pity-fill"
													style={{ width: `${Math.min((pool.stats.currentPity / 99) * 100, 100)}%` }}
												/>
											</span>
										</li>
									</ul>

									{/* 六星历史时间线 */}
									<div className="ak-gacha__six-history">
										<span className="ak-gacha__six-history-label">六星历史</span>
										{pool.sixHistory.length === 0
											? (
												<span className="ak-gacha__six-history-empty">无</span>
											)
											: (
												<ul className="ak-gacha__six-history-list">
													{pool.sixHistory.map((entry, index) => (
														<li
															key={`${entry.name}-${entry.count}-${index}`}
															className="ak-gacha__six-history-item"
															style={{ flexGrow: entry.count }}
															title={`${entry.name} · ${entry.count} 抽`}
														>
															<span
																className="ak-gacha__six-history-bar"
																style={{
																	backgroundColor: sixStarCostColor(entry.count),
																	opacity: 0.25 + (entry.count / maxSixCost) * 0.75,
																}}
															/>
															<span className="ak-gacha__six-history-tip">
																<span className="ak-gacha__six-history-name">{entry.name}</span>
																<span className="ak-gacha__six-history-count">
																	{entry.count}
																	抽
																</span>
															</span>
														</li>
													))}
												</ul>
											)}
									</div>

									<RarityPieChart
										compact
										buckets={pool.rarityBuckets}
										total={pool.count}
									/>
								</article>
							);
						})}
					</div>
				</section>
			)}
		</div>
	);
}

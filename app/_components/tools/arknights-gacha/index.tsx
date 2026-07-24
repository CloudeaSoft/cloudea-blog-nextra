"use client";

import { Icon } from "@iconify-icon/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
	clearAuth,
	isAuthComplete,
	loadAuth,
	saveAuth,
} from "./auth-storage";
import {
	fetchAllHistoryForCategory,
	fetchCategories,
} from "./client";
import { mergeHistoryRecords, rarityStars, recordKey, categoryLabel } from "./parse";
import {
	knownRecordKeys,
	listCachedCategories,
	loadCategoryRecords,
	mergeDisplayCategories,
	saveCategoryRecords,
	sortRecordsNewestFirst,
	type CachedCategoryInfo,
} from "./records-storage";
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

function errorMessage(error: unknown): string {
	if (error instanceof GachaApiError) return error.message;
	if (error instanceof Error) return error.message;
	return "Unknown error";
}

export function ArknightsGachaTool() {
	const [auth, setAuth] = useState<GachaAuth>(emptyAuth);
	const [hydrated, setHydrated] = useState(false);
	const [apiCategories, setApiCategories] = useState<GachaCategory[]>([]);
	const [cachedCategories, setCachedCategories] = useState<CachedCategoryInfo[]>([]);
	const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
	const [records, setRecords] = useState<GachaRecord[]>([]);
	const [recordsExpanded, setRecordsExpanded] = useState(true);
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

	function refreshCachedCategories(uid: string) {
		setCachedCategories(uid.trim() ? listCachedCategories(uid) : []);
	}

	useEffect(() => {
		startTransition(() => {
			const loaded = loadAuth();
			setAuth(loaded);
			setCachedCategories(
				loaded.uid.trim() ? listCachedCategories(loaded.uid) : [],
			);
			setHydrated(true);
		});
		return () => {
			abortRef.current?.abort();
		};
	}, []);

	function updateField<K extends keyof GachaAuth>(key: K, value: GachaAuth[K]) {
		setAuth((prev) => {
			const next = { ...prev, [key]: value };
			if (key === "uid") {
				refreshCachedCategories(String(value));
			}
			return next;
		});
	}

	function handleSaveAuth() {
		const saved = saveAuth(auth);
		setAuth(saved);
		refreshCachedCategories(saved.uid);
		setStatus("认证信息已保存到 localStorage");
		setError(null);
	}

	function handleClearAuth() {
		clearAuth();
		abortRef.current?.abort();
		setAuth(emptyAuth());
		setApiCategories([]);
		setCachedCategories([]);
		setActiveCategoryId(null);
		setRecords([]);
		setStatus("已清除本地认证信息（抽卡记录缓存仍保留）");
		setError(null);
	}

	async function handleFetchCategories() {
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setLoadingCategories(true);
		setError(null);
		setStatus("正在拉取卡池分类…");
		setActiveCategoryId(null);
		setRecords([]);

		try {
			const saved = saveAuth(auth);
			setAuth(saved);
			refreshCachedCategories(saved.uid);
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

	async function handleSelectCategory(categoryId: string) {
		if (!auth.uid.trim()) {
			setError("请先填写 uid");
			return;
		}

		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		const cached = loadCategoryRecords(auth.uid, categoryId);
		const cacheKeys = knownRecordKeys(cached);
		const categoryMeta = displayCategories.find((item) => item.id === categoryId);
		const name = categoryMeta?.name ?? categoryId;
		const label = categoryMeta?.label ?? categoryLabel(name);

		setActiveCategoryId(categoryId);
		setRecordsExpanded(true);
		setError(null);
		setRecords(cached);

		if (!isAuthComplete(auth)) {
			setLoadingHistory(false);
			setStatus(
				cached.length > 0
					? `已加载缓存 ${cached.length} 条（认证不完整，无法同步）`
					: "认证不完整，无法拉取记录",
			);
			return;
		}

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
					<Link href="/tools" className="ak-gacha__back">
						<Icon icon="mdi:arrow-left" width={16} height={16} />
						Tools
					</Link>
					<h1 className="ak-gacha__title">Arknights Gacha History</h1>
					<p className="ak-gacha__desc">
						填写官网认证信息后，经 Cloudflare Worker 拉取卡池分类与寻访记录。
						已缓存分类会始终展示；拉取卡池时再补上未缓存的分类。仅在真正拉到记录后写入缓存。
					</p>
				</div>
			</header>

			<section className="ak-gacha__panel" aria-labelledby="ak-gacha-auth-heading">
				<div className="ak-gacha__panel-head">
					<h2 id="ak-gacha-auth-heading" className="ak-gacha__panel-title">
						认证信息
					</h2>
					<p className="ak-gacha__hint">
						从官网寻访记录页 Network 中复制 Cookie、x-account-token、x-role-token 与 uid。
						明文保存在 localStorage。Cookie 经 Worker 的 x-cookie 头转发（浏览器无法直接设置 Cookie）。
					</p>
				</div>

				<div className="ak-gacha__form">
					<label className="ak-gacha__field">
						<span>uid</span>
						<input
							value={auth.uid}
							onChange={(e) => updateField("uid", e.target.value)}
							autoComplete="off"
							spellCheck={false}
							disabled={!hydrated || busy}
						/>
					</label>
					<label className="ak-gacha__field">
						<span>Cookie</span>
						<textarea
							value={auth.cookie}
							onChange={(e) => updateField("cookie", e.target.value)}
							rows={2}
							spellCheck={false}
							disabled={!hydrated || busy}
						/>
					</label>
					<label className="ak-gacha__field">
						<span>x-account-token</span>
						<input
							value={auth.accountToken}
							onChange={(e) => updateField("accountToken", e.target.value)}
							autoComplete="off"
							spellCheck={false}
							disabled={!hydrated || busy}
						/>
					</label>
					<label className="ak-gacha__field">
						<span>x-role-token</span>
						<input
							value={auth.roleToken}
							onChange={(e) => updateField("roleToken", e.target.value)}
							autoComplete="off"
							spellCheck={false}
							disabled={!hydrated || busy}
						/>
					</label>
				</div>

				<div className="ak-gacha__actions">
					<button
						type="button"
						className="ak-gacha__btn ak-gacha__btn--primary"
						onClick={() => void handleFetchCategories()}
						disabled={!hydrated || busy || !isAuthComplete(auth)}
					>
						<Icon icon="mdi:download" width={16} height={16} />
						拉取卡池
					</button>
					<button
						type="button"
						className="ak-gacha__btn"
						onClick={handleSaveAuth}
						disabled={!hydrated || busy}
					>
						保存认证
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

			{(status || error) && (
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
									onClick={() => void handleSelectCategory(category.id)}
									disabled={busy}
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
				</section>
			)}

			{(loadingHistory || records.length > 0 || activeCategoryId) && (
				<section className="ak-gacha__panel" aria-labelledby="ak-gacha-list-heading">
					<div className="ak-gacha__panel-head">
						<div className="ak-gacha__panel-title-row">
							<h2 id="ak-gacha-list-heading" className="ak-gacha__panel-title">
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
							</h2>
							<button
								type="button"
								className="ak-gacha__btn ak-gacha__collapse-btn"
								aria-expanded={recordsExpanded}
								aria-controls="ak-gacha-records-body"
								onClick={() => setRecordsExpanded((open) => !open)}
							>
								<Icon
									icon={recordsExpanded ? "mdi:chevron-up" : "mdi:chevron-down"}
									width={18}
									height={18}
								/>
								{recordsExpanded ? "折叠" : "展开"}
							</button>
						</div>
						{loadingHistory && (
							<span className="ak-gacha__loading">
								<Icon icon="mdi:loading" width={16} height={16} className="ak-gacha__spin" />
								加载中
							</span>
						)}
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
		</div>
	);
}

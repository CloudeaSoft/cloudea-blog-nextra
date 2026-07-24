/**
 * Cloudflare Worker proxy for Arknights / Hypergryph APIs.
 *
 * - /arknights-service → https://ak.hypergryph.com
 * - /arknights-as-service → https://as.hypergryph.com
 * - /arknights-binding-service → https://binding-api-account-prod.hypergryph.com
 *
 * Browser JS cannot set Cookie; clients send `x-cookie` and we rewrite it.
 * Upstream `Set-Cookie: ak-user-center=...` is exposed as `x-ak-user-center`
 * (browsers block reading Set-Cookie from fetch).
 */

const ROUTES = {
	"/arknights-service": {
		targetHost: "https://ak.hypergryph.com",
		rewritePath: true,
	},
	"/arknights-as-service": {
		targetHost: "https://as.hypergryph.com",
		rewritePath: true,
	},
	"/arknights-binding-service": {
		targetHost: "https://binding-api-account-prod.hypergryph.com",
		rewritePath: true,
	},
	"default": null,
};

function extractAkUserCenter(response) {
	const cookies = typeof response.headers.getSetCookie === "function"
		? response.headers.getSetCookie()
		: [];

	for (const raw of cookies) {
		const match = /^ak-user-center=([^;]+)/i.exec(raw);
		if (match) return match[1];
	}

	const single = response.headers.get("set-cookie");
	if (!single) return null;
	const match = /(?:^|,\s*)ak-user-center=([^;]+)/i.exec(single);
	return match ? match[1] : null;
}

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
			"Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "*",
			"Access-Control-Expose-Headers": "x-ak-user-center",
			"Access-Control-Max-Age": "86400",
		};

		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: corsHeaders,
			});
		}

		const matchedPrefix = Object.keys(ROUTES).find(
			(prefix) => prefix !== "default" && url.pathname.startsWith(prefix),
		);
		const rule = matchedPrefix ? ROUTES[matchedPrefix] : ROUTES.default;
		if (!matchedPrefix || !rule) {
			return new Response(null, {
				status: 404,
				headers: corsHeaders,
			});
		}

		let realPathname = url.pathname;
		if (rule.rewritePath) {
			realPathname = url.pathname.replace(matchedPrefix, "") || "/";
		}

		const targetUrl = `${rule.targetHost}${realPathname}${url.search}`;

		const newHeaders = new Headers(request.headers);
		newHeaders.set("Host", new URL(rule.targetHost).host);

		const proxyCookie = request.headers.get("x-cookie");
		if (proxyCookie) {
			newHeaders.set("Cookie", proxyCookie);
			newHeaders.delete("x-cookie");
		}

		if (rule.headers) {
			Object.entries(rule.headers).forEach(([k, v]) => newHeaders.set(k, v));
		}

		try {
			const response = await fetch(new Request(targetUrl, {
				method: request.method,
				headers: newHeaders,
				body: request.body,
				redirect: "follow",
			}));

			const modifiedHeaders = new Headers(response.headers);
			Object.entries(corsHeaders).forEach(([k, v]) => modifiedHeaders.set(k, v));

			const akUserCenter = extractAkUserCenter(response);
			if (akUserCenter) {
				modifiedHeaders.set("x-ak-user-center", akUserCenter);
			}

			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: modifiedHeaders,
			});
		} catch (err) {
			return new Response(JSON.stringify({ error: "Proxy Request Failed", details: err.message }), {
				status: 502,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			});
		}
	},
};

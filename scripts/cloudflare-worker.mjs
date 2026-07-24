/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const ROUTES = {
	"/arknights-service": {
		targetHost: "https://ak.hypergryph.com",
		rewritePath: true,
	},
	"default": null,
};

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
			"Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "*",
			"Access-Control-Max-Age": "86400",
		};

		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: corsHeaders,
			});
		}

		// 2. 匹配路由规则
		let matchedPrefix = Object.keys(ROUTES).find((prefix) => prefix !== "default" && url.pathname.startsWith(prefix));
		let rule = matchedPrefix ? ROUTES[matchedPrefix] : ROUTES["default"];
		if (!matchedPrefix || !rule) {
			return new Response(null, {
				status: 404,
				headers: corsHeaders,
			});
		}

		// 3. 计算实际的 pathname
		let realPathname = url.pathname;
		if (matchedPrefix && rule.rewritePath) {
			// 抹去前缀：比如把 /user-service/v1/info 变成 /v1/info
			realPathname = url.pathname.replace(matchedPrefix, "") || "/";
		}

		// 4. 拼接最终目标 URL
		const targetUrl = `${rule.targetHost}${realPathname}${url.search}`;

		// 5. 组装 Header
		const newHeaders = new Headers(request.headers);
		newHeaders.set("Host", new URL(rule.targetHost).host);

		// Browser JS cannot set Cookie; clients send x-cookie and we rewrite it.
		const proxyCookie = request.headers.get("x-cookie");
		if (proxyCookie) {
			newHeaders.set("Cookie", proxyCookie);
			newHeaders.delete("x-cookie");
		}

		// 如果该规则下有特殊要求的 Header，注入进去
		if (rule.headers) {
			Object.entries(rule.headers).forEach(([k, v]) => newHeaders.set(k, v));
		}

		// 6. 发起转发
		try {
			const response = await fetch(new Request(targetUrl, {
				method: request.method,
				headers: newHeaders,
				body: request.body,
				redirect: "follow",
			}));

			// 7. 拼接并返回带有 CORS 的响应
			const modifiedHeaders = new Headers(response.headers);
			Object.entries(corsHeaders).forEach(([k, v]) => modifiedHeaders.set(k, v));

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

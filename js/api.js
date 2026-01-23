import { CONFIG } from "./config.js";
import { utils } from "./utils.js";
import { state } from "./state.js";

export const api = {
	async loadLpmsFromCsv() {
		try {
			const response = await fetch(CONFIG.CSV_PATH);
			const csvText = await response.text();

			return new Promise((resolve, reject) => {
				Papa.parse(csvText, {
					header: true,
					skipEmptyLines: true,
					complete: (results) => {
						const lpms = results.data
							.map((row) => ({
								provinsi: row.Provinsi?.trim() || row.provinsi?.trim(),
								city: row.City?.trim() || row.city?.trim(),
								univ: row.Univ?.trim() || row.univ?.trim(),
								faculty: row.Faculty?.trim() || row.faculty?.trim(),
								lpmName: row["LPM Name"]?.trim() || row.lpmName?.trim() || row["LPM_Name"]?.trim(),
								link: row.LINK?.trim() || row.link?.trim(),
								note: row.Note?.trim() || row.note?.trim(),
							}))
							.filter((lpm) => lpm.lpmName && lpm.link);

						resolve(lpms);
					},
					error: (error) => reject(error),
				});
			});
		} catch (error) {
			console.error("Error loading CSV:", error);
			return [];
		}
	},

	getApiUrl(lpm) {
		const baseUrl = lpm.link.endsWith("/") ? lpm.link.slice(0, -1) : lpm.link;
		const afterDate = utils.getLastMonthDate();

		if (lpm.note === "Blogspot") {
			const blogspotUrl = `${baseUrl}/feeds/posts/default?alt=json-in-script&max-results=100&published-min=${afterDate}`;
			return CONFIG.CORS_PROXY + encodeURIComponent(blogspotUrl);
		} else if (lpm.note === "(old) Wordpress") {
			return `${baseUrl}?rest_route=/wp/v2/posts&per_page=100&page=1&after=${afterDate}&_embed`;
		} else {
			return `${baseUrl}/wp-json/wp/v2/posts?per_page=100&page=1&after=${afterDate}&_embed`;
		}
	},

	async fetchPosts(lpm) {
		try {
			const url = api.getApiUrl(lpm);
			console.log(`Fetching ${lpm.lpmName}...`);

			// basically skips the whole thing if it is Blogspot specifically
			if (lpm.note === "Blogspot") {
				return await api.fetchBlogspotPosts(lpm);
			}

			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const data = await response.json();
			const posts = api.parseWordpressPosts(data, lpm);

			state.lpmStats.set(lpm.lpmName, {
				lpm: lpm,
				count: posts.length,
				status: "success",
			});

			return posts;
		} catch (error) {
			console.error(`Error fetching ${lpm.lpmName}:`, error);
			state.lpmStats.set(lpm.lpmName, {
				lpm: lpm,
				count: 0,
				status: "error",
				error: error.message,
			});
			return [];
		}
	},

	async fetchBlogspotPosts(lpm) {
		try {
			const baseUrl = lpm.link.endsWith("/") ? lpm.link.slice(0, -1) : lpm.link;
			const afterDate = utils.getLastMonthDate();

			// Method 1: Try direct JSON first (some Blogspot blogs allow this)
			try {
				const jsonUrl = `${baseUrl}/feeds/posts/default?alt=json&max-results=100&published-min=${afterDate}`;
				const response = await fetch(jsonUrl);

				if (response.ok) {
					const data = await response.json();
					const posts = api.parseBlogspotPosts(data, lpm);

					state.lpmStats.set(lpm.lpmName, {
						lpm: lpm,
						count: posts.length,
						status: "success",
					});

					return posts;
				}
			} catch (e) {
				console.log(`JSON method failed for ${lpm.lpmName}, trying JSONP...`);
			}

			// Method 2: Use JSONP with dynamic script injection
			const posts = await new Promise((resolve, reject) => {
				const callbackName = `blogspotCallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
				const jsonpUrl = `${baseUrl}/feeds/posts/default?alt=json-in-script&callback=${callbackName}&max-results=100&published-min=${afterDate}`;

				// Create global callback
				window[callbackName] = (data) => {
					try {
						const posts = api.parseBlogspotPosts(data, lpm);
						delete window[callbackName];
						document.body.removeChild(script);
						resolve(posts);
					} catch (error) {
						reject(error);
					}
				};

				// Create script tag
				const script = document.createElement("script");
				script.src = jsonpUrl;
				script.onerror = () => {
					delete window[callbackName];
					document.body.removeChild(script);
					reject(new Error("JSONP request failed"));
				};

				// Set timeout
				setTimeout(() => {
					if (window[callbackName]) {
						delete window[callbackName];
						if (document.body.contains(script)) {
							document.body.removeChild(script);
						}
						reject(new Error("JSONP request timeout"));
					}
				}, 10000);

				document.body.appendChild(script);
			});

			state.lpmStats.set(lpm.lpmName, {
				lpm: lpm,
				count: posts.length,
				status: "success",
			});

			return posts;
		} catch (error) {
			console.error(`Error fetching Blogspot ${lpm.lpmName}:`, error);
			state.lpmStats.set(lpm.lpmName, {
				lpm: lpm,
				count: 0,
				status: "error",
				error: error.message,
			});
			return [];
		}
	},

	parseBlogspotPosts(data, lpm) {
		if (!data.feed || !data.feed.entry) return [];

		return data.feed.entry.map((post) => {
			let image = null;

			// Try media thumbnail
			if (post.media$thumbnail?.url) {
				image = post.media$thumbnail.url.replace(/s72-c/, "s1600");
			}

			// Try extracting from content
			if (!image && post.content?.$t) {
				image = utils.extractImage(post.content.$t);
			}

			// Try summary
			if (!image && post.summary?.$t) {
				image = utils.extractImage(post.summary.$t);
			}

			return {
				title: post.title.$t,
				link: post.link.find((l) => l.rel === "alternate")?.href || "",
				date: new Date(post.published.$t),
				image: image,
				excerpt: utils.stripHtml(post.summary?.$t).substring(0, 150),
				lpmName: lpm.lpmName,
				location: `${lpm.city}, ${lpm.provinsi}`,
				provinsi: lpm.provinsi,
				city: lpm.city,
			};
		});
	},

	parseWordpressPosts(data, lpm) {
		if (!Array.isArray(data)) return [];

		console.log("Parsing " + lpm.lpmName + "'s Wordpress data");

		return data.map((post) => {
			let image = null;

			if (post._embedded?.["wp:featuredmedia"]?.[0]?.source_url) {
				image = post._embedded["wp:featuredmedia"][0].source_url;
			}
			if (!image && post.jetpack_featured_media_url) {
				image = post.jetpack_featured_media_url;
			}
			if (!image && post.featured_media_url) {
				image = post.featured_media_url;
			}
			if (!image && post.content?.rendered) {
				image = utils.extractImage(post.content.rendered);
			}
			if (!image && post.excerpt?.rendered) {
				image = utils.extractImage(post.excerpt.rendered);
			}

			return {
				title: post.title?.rendered
					? post.title.rendered.replace(/<[^>]*>/g, "").trim() // remove all HTML tags
					: "No Title",
				link: post.link || "",
				date: new Date(post.date),
				image: image,
				excerpt: utils
					.stripHtml(post.excerpt?.rendered || "")
					.replace(/&#8230;|&hellip;/g, " [&#8230]") // remove encoded ellipsis
					.substring(0, 150),
				lpmName: lpm.lpmName,
				location: `${lpm.city}, ${lpm.provinsi}`,
				provinsi: lpm.provinsi,
				city: lpm.city,
			};
		});
	},
};

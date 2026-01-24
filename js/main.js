import { CONFIG } from "./config.js";
import { utils } from "./utils.js";
import { state, updateFilteredPosts, updateDisplayedPosts, loadMorePosts } from "./state.js";
import { api } from "./api.js";
import { render } from "./render.js";
import { cache } from "./cache.js";

// Initialize
document.getElementById("current-date").textContent = utils.formatDateFull(new Date());

// Event Handlers
document.getElementById("show-more-btn").addEventListener("click", () => {
	state.showAllStats = !state.showAllStats;
	render.stats();
});

document.getElementById("filter-provinsi").addEventListener("change", (e) => {
	console.log("Provinsi filter changed:", e.target.value);
	state.filters.provinsi = e.target.value;
	updateFilteredPosts();
	render.posts();
});

document.getElementById("filter-city").addEventListener("change", (e) => {
	console.log("City filter changed:", e.target.value);
	state.filters.city = e.target.value;
	updateFilteredPosts();
	render.posts();
});

document.getElementById("filter-Universitas").addEventListener("change", (e) => {
	console.log("Universitas filter changed:", e.target.value);
	state.filters.universitas = e.target.value;
	updateFilteredPosts();
	render.posts();
});

document.getElementById("filter-lpm").addEventListener("change", (e) => {
	console.log("LPM filter changed:", e.target.value);
	state.filters.lpm = e.target.value;
	updateFilteredPosts();
	render.posts();
});
document.getElementById("reset-filters").addEventListener("click", () => {
	console.log("Resetting filters");
	state.filters = { lpm: "", provinsi: "", city: "" };
	document.getElementById("filter-lpm").value = "";
	document.getElementById("filter-provinsi").value = "";
	document.getElementById("filter-city").value = "";
	updateFilteredPosts();
	render.posts();
});

// Load More Button
const loadMoreBtn = document.getElementById("load-more-btn");
if (loadMoreBtn) {
	loadMoreBtn.addEventListener("click", () => {
		console.log("Load more clicked");
		loadMorePosts();
		render.posts();

		// Smooth scroll to first new post
		setTimeout(() => {
			const postCards = document.querySelectorAll(".post-card");
			const scrollTarget = postCards[(state.currentPage - 1) * CONFIG.POSTS_PER_PAGE];
			if (scrollTarget) {
				scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" });
			}
		}, 100);
	});
}

async function init() {
	try {
		console.log("=== INIT START ===");
		state.isLoading = true;
		render.loadingProgress();

		// Try cache first
		const cachedData = cache.load();
		if (cachedData && cachedData.posts.length > 0) {
			console.log("✓ Using cached data");
			console.log("Cached posts:", cachedData.posts.length);

			state.allPosts = cachedData.posts;
			state.lpmStats = cachedData.stats;
			state.cacheTimestamp = Date.now();

			// Log cached highlight posts
			console.log("Cached highlight posts:");
			CONFIG.HIGHLIGHT_LPMS.forEach((lpmName) => {
				const posts = state.allPosts.filter((p) => p.lpmName === lpmName);
				console.log(`  ${lpmName}: ${posts.length} posts`);
			});

			updateDisplayedPosts();
			render.hero();
			render.stats();
			render.scrollingNews();
			render.filters();
			render.posts();

			state.isLoading = false;

			// FIXED: Disable background refresh to prevent posts from disappearing
			// Only refresh if user explicitly requests it or on next page load
			console.log("✓ Cache loaded successfully, skipping background refresh");
			console.log("=== INIT END (from cache) ===");
			return;
		}

		console.log("No valid cache, loading fresh data");
		// Load fresh data
		await loadFreshData();
		console.log("=== INIT END (fresh data) ===");
	} catch (error) {
		console.error("Initialization error:", error);
		state.isLoading = false;
		document.getElementById("loading").textContent = "Terjadi kesalahan saat memuat data";
	}
}

async function loadFreshData() {
	console.log("=== LOAD FRESH DATA START ===");
	state.lpms = await api.loadLpmsFromCsv();
	state.totalLpms = state.lpms.length;

	if (state.lpms.length === 0) {
		console.error("No LPMs loaded");
		state.isLoading = false;
		return;
	}

	console.log(`Loading from ${state.lpms.length} LPMs...`);

	// Log highlight LPMs
	const highlightLpms = state.lpms.filter((lpm) => CONFIG.HIGHLIGHT_LPMS.includes(lpm.lpmName));
	console.log(
		"Highlight LPMs found in CSV:",
		highlightLpms.map((l) => l.lpmName),
	);

	state.loadedLpmCount = 0;
	state.allPosts = []; // Clear old posts

	const threshold = Math.ceil(state.totalLpms * CONFIG.LOADING_THRESHOLD);
	let hasShownInitialContent = false;
	let highlightLpmsLoaded = new Set();

	// Fetch all LPMs
	const promises = state.lpms.map(async (lpm) => {
		const posts = await api.fetchPosts(lpm);

		// Log highlight LPM posts
		if (CONFIG.HIGHLIGHT_LPMS.includes(lpm.lpmName)) {
			console.log(`🌟 Loaded ${posts.length} posts from ${lpm.lpmName}`);
			posts.forEach((post) => {
				console.log(`   - "${post.title}"`);
			});
			highlightLpmsLoaded.add(lpm.lpmName);
		}

		state.allPosts.push(...posts);
		state.loadedLpmCount++;

		console.log(`Progress: ${state.loadedLpmCount}/${state.totalLpms} - Total posts: ${state.allPosts.length}`);

		// NEW: Check if we have all highlight LPMs loaded OR reached threshold
		const allHighlightsLoaded = CONFIG.HIGHLIGHT_LPMS.every((name) => highlightLpmsLoaded.has(name));
		const reachedThreshold = state.loadedLpmCount >= threshold;

		// Show content when BOTH conditions met: threshold reached AND highlight LPMs loaded
		if (!hasShownInitialContent && reachedThreshold && allHighlightsLoaded) {
			hasShownInitialContent = true;
			console.log(`✓ ${Math.round(CONFIG.LOADING_THRESHOLD * 100)}% loaded + All highlight LPMs ready`);
			console.log(`Highlight LPMs loaded: ${Array.from(highlightLpmsLoaded).join(", ")}`);
			console.log(`Posts before first render: ${state.allPosts.length}`);

			updateDisplayedPosts();
			render.hero();
			render.stats();
			render.scrollingNews();
			render.filters();
			render.posts();
		}

		// Update progress
		if (state.loadedLpmCount % 5 === 0 || state.loadedLpmCount === state.totalLpms) {
			render.loadingProgress();
		}

		return posts;
	});

	await Promise.all(promises);

	console.log("=== ALL LPMS LOADED ===");
	console.log(`Final post count: ${state.allPosts.length}`);
	console.log("Highlight posts in final state:");
	CONFIG.HIGHLIGHT_LPMS.forEach((lpmName) => {
		const posts = state.allPosts.filter((p) => p.lpmName === lpmName);
		console.log(`  ${lpmName}: ${posts.length} posts`);
		posts.forEach((p) => console.log(`    - "${p.title}"`));
	});

	// Final render - IMPORTANT: Don't clear state.allPosts here
	state.isLoading = false;

	// Only update display, don't recreate arrays
	updateDisplayedPosts();
	render.hero();
	render.stats();
	render.scrollingNews();
	render.filters();
	render.posts();

	// Save to cache
	console.log(`Saving ${state.allPosts.length} posts to cache...`);
	cache.save({
		posts: state.allPosts,
		stats: state.lpmStats,
	});

	console.log(`✓ Complete: ${state.allPosts.length} posts from ${state.lpms.length} LPMs`);
	console.log("=== LOAD FRESH DATA END ===");
}

async function refreshData() {
	console.log("=== BACKGROUND REFRESH START ===");
	console.log("Old post count:", state.allPosts.length);
	const oldCount = state.allPosts.length;

	// IMPORTANT: Don't clear allPosts if we're doing background refresh
	// This was causing posts to disappear
	const oldPosts = [...state.allPosts]; // Keep a backup

	state.allPosts = [];
	state.lpmStats.clear();
	state.isLoading = true;

	await loadFreshData();

	console.log("New post count:", state.allPosts.length);
	console.log("=== BACKGROUND REFRESH END ===");

	if (state.allPosts.length !== oldCount) {
		console.log(`✓ Refreshed: ${oldCount} → ${state.allPosts.length} posts`);
		updateDisplayedPosts();
		render.hero(); // Re-render hero with fresh data
		render.posts();
	} else if (state.allPosts.length === 0) {
		console.error("⚠ Refresh resulted in 0 posts, restoring old posts");
		state.allPosts = oldPosts;
		updateDisplayedPosts();
	}
}

init();

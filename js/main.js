import { CONFIG } from "./config.js";
import { utils } from "./utils.js";
import { state, updateFilteredPosts, updateDisplayedPosts, loadMorePosts } from "./state.js";
import { api } from "./api.js";
import { render } from "./render.js";
import { cache } from "./cache.js";

function getUrlParams() {
	const params = new URLSearchParams(window.location.search);
	return {
		lpm: params.get("lpm") || "",
		provinsi: params.get("provinsi") || "",
		city: params.get("city") || "",
		universitas: params.get("universitas") || "",
	};
}

function updateUrlParams(filters) {
	const params = new URLSearchParams();

	if (filters.lpm) params.set("lpm", filters.lpm);
	if (filters.provinsi) params.set("provinsi", filters.provinsi);
	if (filters.city) params.set("city", filters.city);
	if (filters.universitas) params.set("universitas", filters.universitas);

	const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
	window.history.pushState({}, "", newUrl);
}

document.getElementById("current-date").textContent = utils.formatDateFull(new Date());

document.getElementById("show-more-btn").addEventListener("click", () => {
	state.showAllStats = !state.showAllStats;
	render.stats();
});

document.getElementById("filter-provinsi").addEventListener("change", (e) => {
	console.log("Provinsi filter changed:", e.target.value);
	state.filters.provinsi = e.target.value;

	// Clear dependent filters if provinsi is cleared
	if (!e.target.value) {
		state.filters.city = "";
		state.filters.universitas = "";
		state.filters.lpm = "";
	}

	updateUrlParams(state.filters);
	render.filters(); // Re-render to update dependent dropdowns
	updateFilteredPosts();
	render.posts();
});

document.getElementById("filter-city").addEventListener("change", (e) => {
	console.log("City filter changed:", e.target.value);
	state.filters.city = e.target.value;

	// Clear dependent filters if city is cleared
	if (!e.target.value) {
		state.filters.universitas = "";
		state.filters.lpm = "";
	}

	updateUrlParams(state.filters);
	render.filters(); // Re-render to update dependent dropdowns
	updateFilteredPosts();
	render.posts();
});

document.getElementById("filter-Universitas").addEventListener("change", (e) => {
	console.log("Universitas filter changed:", e.target.value);
	state.filters.universitas = e.target.value;

	// Clear LPM filter if universitas is cleared
	if (!e.target.value) {
		state.filters.lpm = "";
	}

	updateUrlParams(state.filters);
	render.filters(); // Re-render to update dependent dropdowns
	updateFilteredPosts();
	render.posts();
});

document.getElementById("filter-lpm").addEventListener("change", (e) => {
	console.log("LPM filter changed:", e.target.value);
	state.filters.lpm = e.target.value;
	updateUrlParams(state.filters);
	updateFilteredPosts();
	render.posts();
});
document.getElementById("reset-filters").addEventListener("click", () => {
	console.log("Resetting filters");
	state.filters = { lpm: "", provinsi: "", city: "", universitas: "" };
	document.getElementById("filter-lpm").value = "";
	document.getElementById("filter-provinsi").value = "";
	document.getElementById("filter-city").value = "";
	document.getElementById("filter-Universitas").value = "";

	// Clear URL params
	window.history.pushState({}, "", window.location.pathname);

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

const refreshBtn = document.getElementById("refresh-btn");
if (refreshBtn) {
	refreshBtn.addEventListener("click", async () => {
		console.log("=== MANUAL REFRESH TRIGGERED ===");

		// Clear cache
		cache.clear();

		// Show loading state
		state.isLoading = true;
		refreshBtn.disabled = true;
		refreshBtn.textContent = "⟳ Refreshing...";

		// Clear current data FIRST to show blank state
		state.allPosts = [];
		state.filteredPosts = [];
		state.displayedPosts = [];
		state.lpmStats.clear();
		state.currentPage = 1;

		// Clear UI to show blank state
		document.getElementById("posts-grid").innerHTML = "";
		document.getElementById("hero-section").innerHTML = '<div class="loading">Memuat berita unggulan...</div>';
		document.getElementById("stats-grid").innerHTML = "";

		// Show loading indicator
		render.loadingProgress();

		// Reload fresh data
		await loadFreshData();

		// Reset button
		state.isLoading = false;
		refreshBtn.disabled = false;
		refreshBtn.textContent = "↻ Refresh";

		console.log("=== MANUAL REFRESH COMPLETE ===");
	});
}

async function init() {
	try {
		console.log("=== INIT START ===");
		state.isLoading = true;
		render.loadingProgress();

		// Load filters from URL
		const urlFilters = getUrlParams();
		state.filters = urlFilters;
		console.log("Loaded filters from URL:", urlFilters);

		// Try cache first
		const cachedData = cache.load();
		if (cachedData && cachedData.posts.length > 0) {
			console.log("✓ Using cached data");

			state.allPosts = cachedData.posts;
			state.lpmStats = cachedData.stats;
			state.cacheTimestamp = Date.now();

			console.log("Cached highlight posts:");
			updateDisplayedPosts();
			render.hero();
			render.stats();
			render.scrollingNews();
			render.filters();

			// Apply URL filters to UI
			applyFiltersToUI();

			render.posts();

			console.log("=== INIT END (from cache) ===");
			state.isLoading = false;
			return;
		}

		console.log("No valid cache, loading fresh data");
		await loadFreshData();

		// Apply URL filters after loading fresh data
		applyFiltersToUI();

		console.log("=== INIT END (fresh data) ===");
	} catch (error) {
		console.error("Initialization error:", error);
		state.isLoading = false;
		document.getElementById("loading").textContent = "Terjadi kesalahan saat memuat data";
	}
}

function applyFiltersToUI() {
	if (state.filters.lpm) {
		document.getElementById("filter-lpm").value = state.filters.lpm;
	}
	if (state.filters.provinsi) {
		document.getElementById("filter-provinsi").value = state.filters.provinsi;
	}
	if (state.filters.city) {
		document.getElementById("filter-city").value = state.filters.city;
	}
	if (state.filters.universitas) {
		document.getElementById("filter-Universitas").value = state.filters.universitas;
	}

	// Apply the filters
	if (state.filters.lpm || state.filters.provinsi || state.filters.city || state.filters.universitas) {
		updateFilteredPosts();
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

		// Track highlight LPMs
		if (CONFIG.HIGHLIGHT_LPMS.includes(lpm.lpmName)) {
			highlightLpmsLoaded.add(lpm.lpmName); // THIS LINE WAS MISSING!
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
		if (hasShownInitialContent && state.shownLpmCount < state.loadedLpmCount) {
			// Show content when we've loaded more LPMs than we've shown
			state.shownLpmCount = state.loadedLpmCount;
			console.log(`✓ Showing content after loading ${state.loadedLpmCount} LPMs`);
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

// Handle browser back/forward
window.addEventListener("popstate", () => {
	console.log("Browser navigation detected");
	const urlFilters = getUrlParams();
	state.filters = urlFilters;
	applyFiltersToUI();
	render.posts();
});

init();

import { CONFIG } from "./config.js";
import { utils } from "./utils.js";
import { state, updateFilteredPosts } from "./state.js";
import { api } from "./api.js";
import { render } from "./render.js";

console.log("Main module started");

try {
	import("./config.js").then((m) => console.log("✓ config.js loaded", m)).catch(console.error);
	import("./utils.js").then((m) => console.log("✓ utils.js loaded", m)).catch(console.error);
	import("./api.js").then((m) => console.log("✓ api.js loaded", m)).catch(console.error);
	import("./state.js").then((m) => console.log("✓ state.js loaded", m)).catch(console.error);
	import("./render.js").then((m) => console.log("✓ render.js loaded", m)).catch(console.error);
} catch (e) {
	console.error("Import failed:", e);
}

// Initialize date display
document.getElementById("current-date").textContent = utils.formatDateFull(new Date());

// Event Handlers
document.getElementById("show-more-btn").addEventListener("click", () => {
	state.showAllStats = !state.showAllStats;
	render.stats();
});

// Filter for provinsi
document.getElementById("filter-provinsi").addEventListener("change", (e) => {
	state.filters.provinsi = e.target.value;
	updateFilteredPosts();
	render.posts();
});

// Filter for city
document.getElementById("filter-city").addEventListener("change", (e) => {
	state.filters.city = e.target.value;
	updateFilteredPosts();
	render.posts();
});


// Filter for da LPM
document.getElementById("filter-lpm").addEventListener("change", (e) => {
	state.filters.lpm = e.target.value;
	updateFilteredPosts();
	render.posts();
});


// Filter for da Universitas
document.getElementById("filter-Universitas").addEventListener("change", (e) => {
	state.filters.universitas = e.target.value;
	updateFilteredPosts();
	render.posts();
});

// Reset filters
document.getElementById("reset-filters").addEventListener("click", () => {
	state.filters = { provinsi: "", city: "", univ: "", lpm: "" };
	document.getElementById("filter-provinsi").value = "";
	document.getElementById("filter-city").value = "";
	document.getElementById("filter-Universitas").value = "";
	document.getElementById("filter-lpm").value = "";
	updateFilteredPosts();
	render.posts();
});

init();
// Main initialization
async function init() {
	try {
		// Load LPMs from CSV
		state.lpms = await api.loadLpmsFromCsv();

		if (state.lpms.length === 0) {
			console.error("No LPMs loaded from CSV");
			return;
		}

		console.log(`Loaded ${state.lpms.length} LPMs from CSV`);

		const promises = state.lpms
			// .filter((lpm) => lpm.note === "Blogspot") 
			.map((lpm) =>
				api.fetchPosts(lpm).then((posts) => {
					state.allPosts.push(...posts);
					state.filteredPosts = [...state.allPosts];

					// Update UI progressively
					render.hero();
					render.stats();
					render.scrollingNews();
					render.filters();
					render.posts();
				}),
			);

		await Promise.all(promises);

		// Final render
		render.hero();
		render.stats();
		render.scrollingNews();
		render.filters();
		render.posts();

		console.log(`Loaded ${state.allPosts.length} total posts`);
	} catch (error) {
		console.error("Initialization error:", error);
		document.getElementById("loading").textContent = "Terjadi kesalahan saat memuat data";
	}
}

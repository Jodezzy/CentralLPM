import { CONFIG } from "./config.js";

export const state = {
	lpms: [],
	allPosts: [],
	filteredPosts: [],
	displayedPosts: [],
	lpmStats: new Map(),
	showAllStats: false,
	filters: {
		provinsi: "",
		city: "",
		universitas: "",
		lpm: "",
	},
	currentPage: 1,
	loadedLpmCount: 0,
	totalLpms: 0,
	isLoading: false,
	cacheTimestamp: null,
};

export function updateFilteredPosts() {
	console.log("Updating filtered posts with filters:", state.filters);
	if (!state.filters.provinsi && !state.filters.city && !state.filters.universitas && !state.filters.lpm) {
		state.filteredPosts = [...state.allPosts];
	} else {
		state.filteredPosts = state.allPosts.filter((post) => {
			if (state.filters.provinsi && post.provinsi !== state.filters.provinsi) return false;
			if (state.filters.city && post.city !== state.filters.city) return false;
			if (state.filters.universitas && post.universitas !== state.filters.universitas) return false;
			if (state.filters.lpm && post.lpmName !== state.filters.lpm) return false;
			return true;
		});
	}

	console.log(`Filtered: ${state.filteredPosts.length} posts out of ${state.allPosts.length}`);
	state.currentPage = 1;
	updateDisplayedPosts();
}

export function updateDisplayedPosts() {
	const postsToUse = state.filters.provinsi || state.filters.city || state.filters.universitas || state.filters.lpm ? state.filteredPosts : state.allPosts;

	const sortedPosts = [...postsToUse].sort((a, b) => b.date - a.date);
	const endIndex = state.currentPage * CONFIG.POSTS_PER_PAGE;
	state.displayedPosts = sortedPosts.slice(0, endIndex);

	console.log(`Displaying ${state.displayedPosts.length} posts (page ${state.currentPage})`);
}

export function loadMorePosts() {
	state.currentPage++;
	console.log(`Loading page ${state.currentPage}`);
	updateDisplayedPosts();
}

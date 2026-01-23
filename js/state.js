export const state = {
    lpms: [],
    allPosts: [],
    filteredPosts: [],
    lpmStats: new Map(),
    showAllStats: false,
    filters: {
        provinsi: '',
        city: '',
        universitas: '',
        lpm: ''
    }
};

export function updateFilteredPosts() {
    state.filteredPosts = state.allPosts.filter(post => {
        if (state.filters.lpm && post.lpmName !== state.filters.lpm) return false;
        if (state.filters.provinsi && post.provinsi !== state.filters.provinsi) return false;
        if (state.filters.city && post.city !== state.filters.city) return false;
        if (state.filters.universitas && post.universitas !== state.filters.universitas) return false;
        return true;
    });
}
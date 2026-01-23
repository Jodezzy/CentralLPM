import { CONFIG } from "./config.js";
import { utils } from "./utils.js";
import { state, updateFilteredPosts } from "./state.js";

export const render = {
	hero() {
		const heroSection = document.getElementById("hero-section");
		const highlightPosts = state.allPosts
			.filter((post) => CONFIG.HIGHLIGHT_LPMS.includes(post.lpmName))
			.sort((a, b) => b.date - a.date)
			.slice(0, 4);

		if (highlightPosts.length === 0) {
			heroSection.innerHTML = '<div class="loading">Tidak ada berita unggulan</div>';
			return;
		}

		const [main, ...secondary] = highlightPosts;
		const placeholder = utils.getPlaceholderImage();

		heroSection.innerHTML = `
            <div class="hero-main" onclick="window.open('${main.link}', '_blank')">
                <img src="${main.image || placeholder}" alt="${main.title}" onerror="this.src='${placeholder}'">
                <div class="hero-overlay">
                    <div class="hero-badge">
                        <img src="${utils.getLpmLogo(main.lpmName, CONFIG.LOGO_PATH)}" alt="${main.lpmName}" onerror="this.style.display='none'">
                        <span>${main.lpmName}</span>
                    </div>
                    <h2 class="hero-title">${main.title}</h2>
                    <div class="hero-meta">${utils.formatDate(main.date)} • ${main.universitas}, ${main.city}, ${main.provinsi}</div>
                </div>
            </div>
            <div class="hero-secondary">
                ${secondary
					.map(
						(post) => `
                    <div class="hero-card" onclick="window.open('${post.link}', '_blank')">
                        <img src="${post.image || placeholder}" alt="${post.title}" onerror="this.src='${placeholder}'">
                        <div class="hero-card-overlay">
                            <div class="hero-card-title">${post.title}</div>
                        </div>
                    </div>
                `,
					)
					.join("")}
                 </div>
        `;
	},

stats() {
    const statsGrid = document.getElementById("stats-grid");
    const showMoreBtn = document.getElementById("show-more-btn");
    
    // Separate stats into categories
    const allStats = Array.from(state.lpmStats.values());
    const successStats = allStats.filter(s => s.status === 'success').sort((a, b) => b.count - a.count);
    const errorStats = allStats.filter(s => s.status === 'error').sort((a, b) => a.lpm.lpmName.localeCompare(b.lpm.lpmName));
    
    // Combine: successful stats first (sorted by count), then errors at the bottom
    const sortedStats = [...successStats, ...errorStats];
    
    const maxCount = Math.max(...successStats.map((s) => s.count), 1);
    const displayStats = state.showAllStats ? sortedStats : sortedStats.slice(0, CONFIG.STATS_INITIAL_SHOW);
    
    statsGrid.innerHTML = displayStats
        .map((stat) => {
            const percentage = (stat.count / maxCount) * 100;
            
            return `
                <div class="stat-item" onclick="window.open('${stat.lpm.link}', '_blank')">
                    <img src="${utils.getLpmLogo(stat.lpm.lpmName, CONFIG.LOGO_PATH)}" alt="${stat.lpm.lpmName}" class="stat-logo" onerror="this.style.display='none'">
                    <div class="stat-info">
                        <div class="stat-name">${stat.lpm.lpmName}</div>
                        <div class="stat-meta">${stat.lpm.univ} • ${stat.lpm.city}</div>
                        ${
                            stat.status === "error"
                                ? `<div class="stat-error">⚠ Error: ${stat.error}</div>`
                                : `<div class="stat-progress">
                                    <div class="stat-progress-bar" style="width: ${percentage}%"></div>
                                </div>`
                        }
                    </div>
                    ${stat.status === "error" ? '' : `<div class="stat-count">${stat.count}</div>`}
                </div>
            `;
        })
        .join("");
    
    if (sortedStats.length > CONFIG.STATS_INITIAL_SHOW) {
        showMoreBtn.style.display = "block";
        showMoreBtn.textContent = state.showAllStats ? "Tampilkan Lebih Sedikit" : "Tampilkan Semua LPM";
    }
    
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    document.getElementById("stats-period").textContent = `${utils.formatDate(lastMonth)} - ${utils.formatDate(now)}`;
},

	scrollingNews() {
		const scrollingNews = document.getElementById("scrolling-news");
		const latestPosts = state.allPosts.sort((a, b) => b.date - a.date).slice(0, CONFIG.SCROLLING_NEWS_COUNT);

		const newsItems = latestPosts.map((post) => `<span class="news-item">${post.title}</span>`).join("");

		scrollingNews.innerHTML = newsItems;
	},

	filters() {
		const filterLpm = document.getElementById("filter-lpm");
		const filterProvinsi = document.getElementById("filter-provinsi");
		const filterCity = document.getElementById("filter-city");
		const filterUniversitas = document.getElementById("filter-Universitas");

		// Get unique values
		const lpms = [...new Set(state.allPosts.map((p) => p.lpmName))].sort();
		const provinsis = [...new Set(state.allPosts.map((p) => p.provinsi))].sort();
		const cities = [...new Set(state.allPosts.map((p) => p.city))].sort();
		const universitas = [...new Set(state.allPosts.map((p) => p.universitas))].sort();

		// Populate LPM filter
		filterLpm.innerHTML = '<option value="">Semua LPM</option>' + lpms.map((lpm) => `<option value="${lpm}">${lpm}</option>`).join("");

		// Populate Provinsi filter
		filterProvinsi.innerHTML = '<option value="">Semua Provinsi</option>' + provinsis.map((prov) => `<option value="${prov}">${prov}</option>`).join("");

		// Populate City filter
		filterCity.innerHTML = '<option value="">Semua Kota</option>' + cities.map((city) => `<option value="${city}">${city}</option>`).join("");

		// Populate Universitas filter
		filterUniversitas.innerHTML = '<option value="">Semua Universitas</option>' + universitas.map((univ) => `<option value="${univ}">${univ}</option>`).join("");
	},

	posts() {
		const postsGrid = document.getElementById("posts-grid");
		const loading = document.getElementById("loading");

		const postsToDisplay =  state.filters.city || state.filters.provinsi || state.filters.lpm || state.filters.universitas ? state.filteredPosts : state.allPosts;

		const sortedPosts = postsToDisplay.sort((a, b) => b.date - a.date);
		const placeholder = utils.getPlaceholderImage();

		if (sortedPosts.length === 0) {
			loading.textContent = "Tidak ada artikel yang sesuai filter";
			postsGrid.innerHTML = "";
			return;
		}

		postsGrid.innerHTML = sortedPosts
			.map(
				(post) => `
            <article class="post-card" onclick="window.open('${post.link}', '_blank')">
                <div class="post-image-container">
                    <img src="${post.image || placeholder}" alt="${post.title}" class="post-image" onerror="this.src='${placeholder}'">
                    <div class="lpm-badge">
                        <img src="${utils.getLpmLogo(post.lpmName, CONFIG.LOGO_PATH)}" alt="${post.lpmName}" class="lpm-logo" onerror="this.style.display='none'">
                        <span class="lpm-name">${post.lpmName}</span>
                    </div>
                </div>
                <div class="post-content">
                    <div class="post-meta">
                        <span>${post.universitas}, ${post.city}, ${post.provinsi}</span>
                        <span>${utils.formatDate(post.date)}</span>
                    </div>
                    <h3 class="post-title">${post.title}</h3>
                    ${post.excerpt ? `<p class="post-excerpt">${post.excerpt}</p>` : ""}
                </div>
            </article>
        `,
			)
			.join("");

		loading.style.display = "none";
	},
};

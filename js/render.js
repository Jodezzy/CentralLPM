import { CONFIG } from "./config.js";
import { utils } from "./utils.js";
import { state } from "./state.js";

export const render = {
	hero() {
		console.log("=== HERO RENDER START ===");
		console.log("Total posts in state.allPosts:", state.allPosts.length);
		console.log("Highlight LPMs:", CONFIG.HIGHLIGHT_LPMS);

		const heroSection = document.getElementById("hero-section");

		const highlightPosts = state.allPosts
			.filter((post) => {
				const isHighlight = CONFIG.HIGHLIGHT_LPMS.includes(post.lpmName);
				return isHighlight;
			})
			.sort((a, b) => b.date - a.date)
			.slice(0, 4);

		console.log("Filtered highlight posts:", highlightPosts.length);

		if (highlightPosts.length === 0) {
			console.log("⚠ No highlight posts found, showing loading message");
			heroSection.innerHTML = '<div class="loading">Memuat berita unggulan...</div>';
			console.log("=== HERO RENDER END (empty) ===");
			return;
		}

		// Need at least 4 posts for full hero, but show with 1+ posts
		if (highlightPosts.length < 4) {
			console.log(`⚠ Only ${highlightPosts.length} highlight posts (need 4 for full display)`);
		}

		console.log("Hero posts selected:");
		highlightPosts.forEach((post, idx) => {
			console.log(`  ${idx + 1}. ${post.lpmName}: "${post.title}" (${post.date})`);
		});

		const [main, ...secondary] = highlightPosts;
		console.log("=== HERO RENDER END ===");

		heroSection.innerHTML = `
            <div class="hero-main" onclick="window.open('${main.link}', '_blank')">
                <img src="${main.image || CONFIG.MISSING_IMAGE}" alt="${main.title}" onerror="this.src='${CONFIG.MISSING_IMAGE}'">
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
                        <img src="${post.image || CONFIG.MISSING_IMAGE}" alt="${post.title}" onerror="this.src='${CONFIG.MISSING_IMAGE}'">
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

		const allStats = Array.from(state.lpmStats.values());
		const successStats = allStats.filter((s) => s.status === "success").sort((a, b) => b.count - a.count);
		const errorStats = allStats.filter((s) => s.status === "error").sort((a, b) => a.lpm.lpmName.localeCompare(b.lpm.lpmName));

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
                        ${stat.status === "error" ? "" : `<div class="stat-count">${stat.count}</div>`}
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

		if (latestPosts.length === 0) {
			scrollingNews.innerHTML = '<span class="news-item">Memuat berita terkini...</span>';
			return;
		}

		const newsItems = latestPosts.map((post) => `<span class="news-item">${post.title}</span>`).join("");

		scrollingNews.innerHTML = newsItems + newsItems;
	},

	filters() {
		const filterProvinsi = document.getElementById("filter-provinsi");
		const filterCity = document.getElementById("filter-city");
		const filterUniversitas = document.getElementById("filter-Universitas");
		const filterLpm = document.getElementById("filter-lpm");

		const provinsis = [...new Set(state.allPosts.map((p) => p.provinsi))].sort();
		const cities = [...new Set(state.allPosts.map((p) => p.city))].sort();
		const universitas = [...new Set(state.allPosts.map((p) => p.universitas))].sort();
		const lpms = [...new Set(state.allPosts.map((p) => p.lpmName))].sort();

		filterProvinsi.innerHTML = '<option value="">Semua Provinsi</option>' + provinsis.map((prov) => `<option value="${prov}">${prov}</option>`).join("");

		filterCity.innerHTML = '<option value="">Semua Kota</option>' + cities.map((city) => `<option value="${city}">${city}</option>`).join("");

		filterUniversitas.innerHTML = '<option value="">Semua Universitas</option>' + universitas.map((univ) => `<option value="${univ}">${univ}</option>`).join("");

		filterLpm.innerHTML = '<option value="">Semua LPM</option>' + lpms.map((lpm) => `<option value="${lpm}">${lpm}</option>`).join("");
	},

	posts() {
		const postsGrid = document.getElementById("posts-grid");
		const loading = document.getElementById("loading");
		const loadMoreBtn = document.getElementById("load-more-btn");

		console.log("Rendering posts:", state.displayedPosts.length);

		if (state.displayedPosts.length === 0 && !state.isLoading) {
			console.log("No posts to display, but still loading");
			loading.textContent = "Tidak ada artikel yang sesuai filter";
			loading.style.display = "block";
			postsGrid.innerHTML = "";
			if (loadMoreBtn) loadMoreBtn.style.display = "none";
			return;
		}

		const postsToUse = state.filters.lpm || state.filters.provinsi || state.filters.city ? state.filteredPosts : state.allPosts;
		const sortedTotal = [...postsToUse].sort((a, b) => b.date - a.date);
		const hasMore = state.displayedPosts.length < sortedTotal.length;

		postsGrid.innerHTML = state.displayedPosts
			.map((post) => {
				const imageUrl = post.image || CONFIG.MISSING_IMAGE;

				return `
                <article class="post-card" onclick="window.open('${post.link}', '_blank')">
                    <div class="post-image-container">
                        <img 
                            src="${CONFIG.PLACEHOLDER_IMAGE}" 
                            data-src="${imageUrl}" 
                            alt="${post.title}" 
                            class="post-image lazy-load" 
                            onerror="this.src='${CONFIG.MISSING_IMAGE}'">
                        <div class="lpm-badge">
                            <img src="${utils.getLpmLogo(post.lpmName, CONFIG.LOGO_PATH)}" 
                                alt="${post.lpmName}" 
                                class="lpm-logo" 
                                onerror="this.style.display='none'">
                            <span class="lpm-name">${post.lpmName}</span>
                        </div>
                    </div>
                    <div class="post-content">
                        <div class="post-meta">
                            <span>${utils.formatDate(post.date)}</span>
                            <span>${post.universitas}, ${post.city}, ${post.provinsi}</span>
                        </div>
                        <h3 class="post-title">${post.title}</h3>
                        ${post.excerpt ? `<p class="post-excerpt">${post.excerpt}</p>` : ""}
                    </div>
                </article>
            `;
			})
			.join("");

		// Lazy load images
		this.lazyLoadImages();

		if (state.isLoading && state.totalLpms > 0) {
			const progress = Math.round((state.loadedLpmCount / state.totalLpms) * 100);
			loading.innerHTML = `
				<div class="loading-progress">
					<div class="progress-bar">
						<div class="progress-fill" style="width: ${progress}%"></div>
					</div>
					<div class="progress-text">
						Memuat ${state.loadedLpmCount}/${state.totalLpms} LPM (${progress}%)
					</div>
				</div>
			`;
			loading.style.display = "block";
		} else {
			loading.style.display = "none";
		}

		// Show/hide load more button
		if (loadMoreBtn) {
			if (hasMore) {
				loadMoreBtn.style.display = "block";
				loadMoreBtn.textContent = `Muat Lebih Banyak (${state.displayedPosts.length}/${sortedTotal.length})`;
			} else {
				loadMoreBtn.style.display = "none";
			}
		}
	},

	lazyLoadImages() {
		const images = document.querySelectorAll("img.lazy-load");

		if ("IntersectionObserver" in window) {
			const imageObserver = new IntersectionObserver((entries, observer) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const img = entry.target;
						img.src = img.dataset.src;
						img.classList.remove("lazy-load");
						observer.unobserve(img);
					}
				});
			});

			images.forEach((img) => imageObserver.observe(img));
		} else {
			// Fallback for browsers without IntersectionObserver
			images.forEach((img) => {
				img.src = img.dataset.src;
				img.classList.remove("lazy-load");
			});
		}
	},

	loadingProgress() {
		const progress = Math.round((state.loadedLpmCount / state.totalLpms) * 100);
		const loading = document.getElementById("loading");

		if (loading) {
			loading.innerHTML = `
                <div class="loading-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="progress-text">
                        Memuat ${state.loadedLpmCount}/${state.totalLpms} LPM (${progress}%)
                    </div>
                </div>
            `;
			loading.style.display = "block";
		}
	},
};

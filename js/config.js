export const CONFIG = {
    HIGHLIGHT_LPMS: ['LPM Kavling', 'LPM Mercusuar'],
    STATS_INITIAL_SHOW: 6,
    SCROLLING_NEWS_COUNT: 10,
    CORS_PROXY: 'https://api.allorigins.win/raw?url=',
    LOGO_PATH: './logos/',
    CSV_PATH: './data/lpms.csv',
    
    // Lazy loading settings
    POSTS_PER_PAGE: 45,
    CACHE_DURATION: 1 * 60 * 1000, // 30 minutes
    LOADING_THRESHOLD: 0.8, // Show content when 80% loaded
    
    // Image assets
    PLACEHOLDER_IMAGE: './assets/imagePending.png',
    MISSING_IMAGE: './assets/imageMissing.png'
};
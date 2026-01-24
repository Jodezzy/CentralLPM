import { CONFIG } from './config.js';

export const cache = {
    CACHE_KEY: 'lpm_news_cache_v2',
    
    save(data) {
        try {
            const cacheData = {
                timestamp: Date.now(),
                posts: data.posts.map(post => ({
                    ...post,
                    date: post.date.toISOString() // Convert Date to string
                })),
                stats: Array.from(data.stats.entries())
            };
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
            console.log(`✓ Cache saved: ${data.posts.length} posts`);
        } catch (error) {
            console.error('Error saving cache:', error);
            // If quota exceeded, clear old cache
            if (error.name === 'QuotaExceededError') {
                this.clear();
            }
        }
    },
    
    load() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (!cached) {
                console.log('No cache found');
                return null;
            }
            
            const cacheData = JSON.parse(cached);
            const age = Date.now() - cacheData.timestamp;
            
            if (age > CONFIG.CACHE_DURATION) {
                console.log(`Cache expired (${Math.round(age / 1000 / 60)} minutes old)`);
                this.clear();
                return null;
            }
            
            console.log(`✓ Cache loaded: ${cacheData.posts.length} posts (${Math.round(age / 1000 / 60)} min old)`);
            
            return {
                posts: cacheData.posts.map(post => ({
                    ...post,
                    date: new Date(post.date) // Convert string back to Date
                })),
                stats: new Map(cacheData.stats)
            };
        } catch (error) {
            console.error('Error loading cache:', error);
            this.clear();
            return null;
        }
    },
    
    clear() {
        localStorage.removeItem(this.CACHE_KEY);
        console.log('✓ Cache cleared');
    }
};
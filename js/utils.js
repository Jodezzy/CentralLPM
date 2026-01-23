export const utils = {
	formatDate(date) {
		const options = { day: "numeric", month: "long", year: "numeric" };
		return date.toLocaleDateString("id-ID", options);
	},

	formatDateFull(date) {
		const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
		return date.toLocaleDateString("id-ID", options);
	},

	getLastMonthDate() {
		const now = new Date();
		const lastMonth = new Date(now);
		lastMonth.setMonth(lastMonth.getMonth() - 1);
		return lastMonth.toISOString();
	},

	getLpmLogo(lpmName, logoPath) {
		return `${logoPath}Logo_${lpmName.replace(/ /g, "_")}.png`;
	},

	stripHtml(html) {
		console.log("stripHtml input:", html);
		return html ? html.replace(/<[^>]+>/g, "").trim() : "Text unavailable";
	},

	stripHtml(html) {
		if (!html) return "";
		return html.replace(/<[^>]+>/g, "").trim();
	},

	stripHtmlBlogspot(html) {
		if (!html) return "";
		let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
		text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

        text = text.replace(/<[^>]+>/g, " ");

		text = text.replace(/&nbsp;/g, " ");
		text = text.replace(/&quot;/g, '"');
		text = text.replace(/&apos;/g, "'");
		text = text.replace(/&lt;/g, "<");
		text = text.replace(/&gt;/g, ">");
		text = text.replace(/&amp;/g, "&");
		text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));

		text = text.replace(/\s+/g, " ");

		return text.trim();
	},

	extractBlogspotExcerpt(post) {
		let excerpt = "";

		if (post.content && post.content.$t) {
			excerpt = this.stripHtmlBlogspot(post.content.$t);
		}
		if (!excerpt && post.summary && post.summary.$t) {
			excerpt = this.stripHtmlBlogspot(post.summary.$t);
		}
		if (!excerpt && post.title && post.title.$t) {
			excerpt = post.title.$t;
		}
		excerpt = excerpt.substring(0, 200);
		return excerpt;
	},

	extractImage(content) {
		if (!content) return null;
		const imgRegex = /<img[^>]+src="([^">]+(?<!\.gif))"/i;
		const match = content.match(imgRegex);
		return match ? match[1] : null;
	},

	getPlaceholderImage() {
		return "./assets/imageMissing.png";
	},
};

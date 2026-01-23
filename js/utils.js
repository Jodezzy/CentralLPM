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
		return html ? html.replace(/<[^>]+>/g, "").trim() : "";
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

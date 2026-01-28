/**
 * Calculate estimated reading time for blog content
 * @param {string} content - HTML content of the blog
 * @returns {number} - Estimated reading time in minutes
 */
const calculateReadTime = (content) => {
    if (!content) return 1;

    // Remove HTML tags
    const text = content.replace(/<[^>]*>/g, '');

    // Count words
    const words = text.trim().split(/\s+/).length;

    // Average reading speed: 200 words per minute
    const minutes = Math.ceil(words / 200);

    return minutes < 1 ? 1 : minutes;
};

module.exports = calculateReadTime;

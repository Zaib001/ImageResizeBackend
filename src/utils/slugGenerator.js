const slugify = require('slugify');

/**
 * Generate a URL-friendly slug from text
 * @param {string} text - Text to convert to slug
 * @returns {string} - URL-friendly slug
 */
const generateSlug = (text) => {
    return slugify(text, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g
    });
};

/**
 * Ensure slug uniqueness by checking against existing slugs
 * @param {string} slug - Base slug
 * @param {Model} Model - Mongoose model to check against
 * @param {string} excludeId - ID to exclude from check (for updates)
 * @returns {string} - Unique slug
 */
const ensureUniqueSlug = async (slug, Model, excludeId = null) => {
    let uniqueSlug = slug;
    let counter = 1;

    while (true) {
        const query = { slug: uniqueSlug };
        if (excludeId) {
            query._id = { $ne: excludeId };
        }

        const existing = await Model.findOne(query);

        if (!existing) {
            return uniqueSlug;
        }

        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }
};

module.exports = {
    generateSlug,
    ensureUniqueSlug
};

const mongoose = require('mongoose');
const { generateSlug, ensureUniqueSlug } = require('../utils/slugGenerator');
const calculateReadTime = require('../utils/readTimeCalculator');

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Blog title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true
    },
    content: {
        type: String,
        required: [true, 'Blog content is required']
    },
    excerpt: {
        type: String,
        maxlength: [300, 'Excerpt cannot exceed 300 characters'],
        default: ''
    },
    metaTitle: {
        type: String,
        maxlength: [60, 'Meta title should not exceed 60 characters'],
        default: ''
    },
    metaDescription: {
        type: String,
        maxlength: [160, 'Meta description should not exceed 160 characters'],
        default: ''
    },
    author: {
        type: String,
        default: 'Admin'
    },
    featuredImage: {
        type: String,
        default: ''
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    category: {
        type: String,
        trim: true,
        default: 'Uncategorized',
        index: true
    },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft',
        index: true
    },
    publishedAt: {
        type: Date,
        default: null
    },
    viewCount: {
        type: Number,
        default: 0
    },
    readTime: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

// Indexes for better query performance
blogSchema.index({ tags: 1 });
blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ category: 1, status: 1 });
blogSchema.index({ title: 'text', content: 'text' }); // Full-text search

// Pre-save hook to generate slug and calculate read time
blogSchema.pre('save', async function () {
    // Generate slug from title if not provided or if title changed
    if (!this.slug || this.isModified('title')) {
        const baseSlug = generateSlug(this.title);
        this.slug = await ensureUniqueSlug(baseSlug, this.constructor, this._id);
    }

    // Calculate read time
    if (this.isModified('content')) {
        this.readTime = calculateReadTime(this.content);
    }

    // Set publishedAt when status changes to published
    if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
    }

    // Clear publishedAt when unpublishing
    if (this.isModified('status') && this.status === 'draft') {
        this.publishedAt = null;
    }
});

// Virtual for formatted date
blogSchema.virtual('formattedDate').get(function () {
    return this.publishedAt ? this.publishedAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : 'Not published';
});

// Ensure virtuals are included in JSON
blogSchema.set('toJSON', { virtuals: true });
blogSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Blog', blogSchema);

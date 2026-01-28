const express = require('express');
const router = express.Router();
const {
    // Admin
    createBlog,
    getAllBlogs,
    getBlogById,
    updateBlog,
    deleteBlog,
    toggleStatus,
    getBlogStats,
    // Public
    getPublishedBlogs,
    getBlogBySlug,
    getRelatedBlogs,
    searchBlogs,
    getCategories,
    getTags
} = require('../controllers/blog.controller');
const { authenticate } = require('../middleware/auth.middleware');
const {
    validateCreateBlog,
    validateUpdateBlog,
    validateBlogId,
    validateSlug,
    validateBlogQuery
} = require('../middleware/validation.middleware');

// ============================================
// PUBLIC ROUTES
// ============================================

// Get all published blogs
router.get('/', validateBlogQuery, getPublishedBlogs);

// Search blogs
router.get('/search', searchBlogs);

// Get categories
router.get('/categories', getCategories);

// Get tags
router.get('/tags', getTags);

// Get single blog by slug
router.get('/:slug', validateSlug, getBlogBySlug);

// Get related blogs
router.get('/:slug/related', validateSlug, getRelatedBlogs);

// ============================================
// ADMIN ROUTES (Protected)
// ============================================

// Get blog statistics
router.get('/admin/stats', authenticate, getBlogStats);

// Create blog
router.post('/admin', authenticate, validateCreateBlog, createBlog);

// Get all blogs (admin)
router.get('/admin/all', authenticate, validateBlogQuery, getAllBlogs);

// Get single blog by ID (admin)
router.get('/admin/:id', authenticate, validateBlogId, getBlogById);

// Update blog
router.put('/admin/:id', authenticate, validateUpdateBlog, updateBlog);

// Delete blog
router.delete('/admin/:id', authenticate, validateBlogId, deleteBlog);

// Toggle status
router.patch('/admin/:id/status', authenticate, validateBlogId, toggleStatus);

module.exports = router;

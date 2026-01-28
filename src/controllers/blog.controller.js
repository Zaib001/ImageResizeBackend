const Blog = require('../models/Blog.model');
const { ensureUniqueSlug, generateSlug } = require('../utils/slugGenerator');
const { logActivity } = require('./log.controller');

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * @desc    Create new blog
 * @route   POST /api/admin/blogs
 * @access  Private
 */
const createBlog = async (req, res) => {
    try {
        const blogData = req.body;

        // If slug provided, ensure it's unique
        if (blogData.slug) {
            blogData.slug = await ensureUniqueSlug(blogData.slug, Blog);
        }

        const blog = await Blog.create(blogData);

        // Log blog creation
        await logActivity(req.admin?._id || null, 'BLOG_CREATE', `New node created: ${blog.title}`, 'info');

        res.status(201).json({
            success: true,
            message: 'Blog created successfully',
            data: blog
        });

    } catch (error) {
        console.error('Create blog error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create blog',
            error: error.message
        });
    }
};

/**
 * @desc    Get all blogs (admin)
 * @route   GET /api/admin/blogs
 * @access  Private
 */
const getAllBlogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            category,
            tag,
            search,
            sort = '-createdAt'
        } = req.query;

        // Build query
        const query = {};

        if (status) query.status = status;
        if (category) query.category = category;
        if (tag) query.tags = tag;
        if (search) {
            query.$text = { $search: search };
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Execute query
        const blogs = await Blog.find(query)
            .sort(sort)
            .limit(parseInt(limit))
            .skip(skip);

        // Get total count
        const total = await Blog.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                blogs,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Get all blogs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch blogs',
            error: error.message
        });
    }
};

/**
 * @desc    Get single blog by ID (admin)
 * @route   GET /api/admin/blogs/:id
 * @access  Private
 */
const getBlogById = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        res.status(200).json({
            success: true,
            data: blog
        });

    } catch (error) {
        console.error('Get blog by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch blog',
            error: error.message
        });
    }
};

/**
 * @desc    Update blog
 * @route   PUT /api/admin/blogs/:id
 * @access  Private
 */
const updateBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        // Update fields
        Object.keys(req.body).forEach(key => {
            blog[key] = req.body[key];
        });

        await blog.save();

        res.status(200).json({
            success: true,
            message: 'Blog updated successfully',
            data: blog
        });

    } catch (error) {
        console.error('Update blog error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update blog',
            error: error.message
        });
    }
};

/**
 * @desc    Delete blog
 * @route   DELETE /api/admin/blogs/:id
 * @access  Private
 */
const deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findByIdAndDelete(req.params.id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        // Log blog deletion
        await logActivity(req.admin?._id || 'SYSTEM', 'BLOG_DELETE', `Inventory node purged: ${blog.title}`, 'warning');

        res.status(200).json({
            success: true,
            message: 'Blog deleted successfully'
        });

    } catch (error) {
        console.error('Delete blog error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete blog',
            error: error.message
        });
    }
};

/**
 * @desc    Toggle blog status (publish/unpublish)
 * @route   PATCH /api/admin/blogs/:id/status
 * @access  Private
 */
const toggleStatus = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        blog.status = blog.status === 'published' ? 'draft' : 'published';
        await blog.save();

        // Log status toggle
        await logActivity(req.admin?._id || null, 'BLOG_STATUS_TOGGLE', `Status of node ${blog.title} updated to ${blog.status}`, 'info');

        res.status(200).json({
            success: true,
            message: `Blog ${blog.status === 'published' ? 'published' : 'unpublished'} successfully`,
            data: blog
        });

    } catch (error) {
        console.error('Toggle status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle status',
            error: error.message
        });
    }
};

/**
 * @desc    Get blog statistics
 * @route   GET /api/admin/blogs/stats
 * @access  Private
 */
const getBlogStats = async (req, res) => {
    try {
        const totalBlogs = await Blog.countDocuments();
        const publishedBlogs = await Blog.countDocuments({ status: 'published' });
        const draftBlogs = await Blog.countDocuments({ status: 'draft' });

        const totalViews = await Blog.aggregate([
            { $group: { _id: null, total: { $sum: '$viewCount' } } }
        ]);

        const recentBlogs = await Blog.find()
            .sort('-createdAt')
            .limit(5)
            .select('title status createdAt viewCount');

        // Graph Data: Blogs per category
        const categoryData = await Blog.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $project: { name: '$_id', value: '$count', _id: 0 } }
        ]);

        // Graph Data: Growth over last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const growthData = await Blog.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            { $project: { name: '$_id', value: '$count', _id: 0 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalBlogs,
                publishedBlogs,
                draftBlogs,
                totalViews: totalViews[0]?.total || 0,
                recentBlogs,
                graphData: {
                    categories: categoryData,
                    growth: growthData
                }
            }
        });

    } catch (error) {
        console.error('Get blog stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
};

// ============================================
// PUBLIC ENDPOINTS
// ============================================

/**
 * @desc    Get published blogs
 * @route   GET /api/blogs
 * @access  Public
 */
const getPublishedBlogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 12,
            category,
            tag,
            search,
            sort = '-publishedAt'
        } = req.query;

        // Build query - only published blogs
        const query = { status: 'published' };

        if (category) query.category = category;
        if (tag) query.tags = tag;
        if (search) {
            query.$text = { $search: search };
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Execute query
        const blogs = await Blog.find(query)
            .sort(sort)
            .limit(parseInt(limit))
            .skip(skip)
            .select('-__v');

        // Get total count
        const total = await Blog.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                blogs,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Get published blogs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch blogs',
            error: error.message
        });
    }
};

/**
 * @desc    Get single blog by slug
 * @route   GET /api/blogs/:slug
 * @access  Public
 */
const getBlogBySlug = async (req, res) => {
    try {
        const blog = await Blog.findOne({
            slug: req.params.slug,
            status: 'published'
        }).select('-__v');

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        // Increment view count
        blog.viewCount += 1;
        await blog.save();

        res.status(200).json({
            success: true,
            data: blog
        });

    } catch (error) {
        console.error('Get blog by slug error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch blog',
            error: error.message
        });
    }
};

/**
 * @desc    Get related blogs
 * @route   GET /api/blogs/:slug/related
 * @access  Public
 */
const getRelatedBlogs = async (req, res) => {
    try {
        const currentBlog = await Blog.findOne({
            slug: req.params.slug,
            status: 'published'
        });

        if (!currentBlog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        // Find blogs with similar tags or category
        const relatedBlogs = await Blog.find({
            _id: { $ne: currentBlog._id },
            status: 'published',
            $or: [
                { tags: { $in: currentBlog.tags } },
                { category: currentBlog.category }
            ]
        })
            .sort('-publishedAt')
            .limit(4)
            .select('title slug excerpt featuredImage category tags publishedAt readTime');

        res.status(200).json({
            success: true,
            data: relatedBlogs
        });

    } catch (error) {
        console.error('Get related blogs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch related blogs',
            error: error.message
        });
    }
};

/**
 * @desc    Search blogs
 * @route   GET /api/blogs/search
 * @access  Public
 */
const searchBlogs = async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const blogs = await Blog.find({
            status: 'published',
            $text: { $search: q }
        })
            .limit(parseInt(limit))
            .select('title slug excerpt featuredImage publishedAt readTime')
            .sort({ score: { $meta: 'textScore' } });

        res.status(200).json({
            success: true,
            data: blogs
        });

    } catch (error) {
        console.error('Search blogs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search blogs',
            error: error.message
        });
    }
};

/**
 * @desc    Get all categories
 * @route   GET /api/blogs/categories
 * @access  Public
 */
const getCategories = async (req, res) => {
    try {
        const categories = await Blog.distinct('category', { status: 'published' });

        res.status(200).json({
            success: true,
            data: categories
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message
        });
    }
};

/**
 * @desc    Get all tags
 * @route   GET /api/blogs/tags
 * @access  Public
 */
const getTags = async (req, res) => {
    try {
        const tags = await Blog.distinct('tags', { status: 'published' });

        res.status(200).json({
            success: true,
            data: tags
        });

    } catch (error) {
        console.error('Get tags error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tags',
            error: error.message
        });
    }
};

module.exports = {
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
};

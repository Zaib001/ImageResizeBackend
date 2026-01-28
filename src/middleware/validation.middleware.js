const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }

    next();
};

/**
 * Validation rules for admin login
 */
const validateLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email'),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    handleValidationErrors
];

/**
 * Validation rules for creating a blog
 */
const validateCreateBlog = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
    body('content')
        .notEmpty().withMessage('Content is required'),
    body('excerpt')
        .optional()
        .isLength({ max: 300 }).withMessage('Excerpt cannot exceed 300 characters'),
    body('metaTitle')
        .optional()
        .isLength({ max: 60 }).withMessage('Meta title should not exceed 60 characters'),
    body('metaDescription')
        .optional()
        .isLength({ max: 160 }).withMessage('Meta description should not exceed 160 characters'),
    body('slug')
        .optional()
        .trim()
        .matches(/^[a-z0-9-]+$/).withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
    body('tags')
        .optional()
        .isArray().withMessage('Tags must be an array'),
    body('category')
        .optional()
        .trim(),
    body('status')
        .optional()
        .isIn(['draft', 'published']).withMessage('Status must be either draft or published'),
    body('featuredImage')
        .optional()
        .trim(),
    handleValidationErrors
];

/**
 * Validation rules for updating a blog
 */
const validateUpdateBlog = [
    param('id')
        .isMongoId().withMessage('Invalid blog ID'),
    ...validateCreateBlog
];

/**
 * Validation rules for blog ID parameter
 */
const validateBlogId = [
    param('id')
        .isMongoId().withMessage('Invalid blog ID'),
    handleValidationErrors
];

/**
 * Validation rules for slug parameter
 */
const validateSlug = [
    param('slug')
        .trim()
        .notEmpty().withMessage('Slug is required')
        .matches(/^[a-z0-9-]+$/).withMessage('Invalid slug format'),
    handleValidationErrors
];

/**
 * Validation rules for pagination and filters
 */
const validateBlogQuery = [
    query('page')
        .optional({ values: 'falsy' })
        .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
        .optional({ values: 'falsy' })
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status')
        .optional({ values: 'falsy' })
        .isIn(['draft', 'published']).withMessage('Invalid status'),
    query('category')
        .optional({ values: 'falsy' })
        .trim(),
    query('tag')
        .optional({ values: 'falsy' })
        .trim(),
    query('search')
        .optional({ values: 'falsy' })
        .trim(),
    handleValidationErrors
];

module.exports = {
    validateLogin,
    validateCreateBlog,
    validateUpdateBlog,
    validateBlogId,
    validateSlug,
    validateBlogQuery,
    handleValidationErrors
};

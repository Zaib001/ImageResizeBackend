require('dotenv').config();
const mongoose = require('mongoose');
const Blog = require('../src/models/Blog.model');
const slugify = require('slugify');

const sampleBlogs = [
    {
        title: "Mastering Neural Upscaling for Enterprise Assets",
        slug: "mastering-neural-upscaling-for-enterprise-assets",
        content: "<h2>The Evolution of Scaling</h2><p>In the modern digital landscape, high-resolution imagery is no longer a luxury—it's a requirement. Neural upscaling leverages deep learning models to predict and fill in missing pixel data, creating sharp, professional results from lower-resolution sources.</p><h3>Why it Matters</h3><ul><li>Saves bandwidth during upload</li><li>Ensures brand consistency across all displays</li><li>Future-proofs legacy assets</li></ul><p>By implementing these workflows, enterprises can maintain a premium visual identity without the overhead of massive raw files.</p>",
        excerpt: "Discover how neural upscaling is revolutionizing asset management for modern enterprises.",
        category: "Engineering",
        tags: ["upscaling", "neural", "enterprise", "quality"],
        status: "published",
        featuredImage: "https://images.unsplash.com/photo-1620712943543-bcc4628c6730?auto=format&fit=crop&q=80",
        metaTitle: "Mastering Neural Upscaling | Resizely.Core",
        metaDescription: "Learn how to leverage neural networks for professional image upscaling."
    },
    {
        title: "Securing Digital Assets in High-Throughput Environments",
        slug: "securing-digital-assets-in-high-throughput-environments",
        content: "<h2>Security by Design</h2><p>When processing thousands of images per hour, security cannot be an afterthought. Ephemeral processing ensures that data only exists in memory while it is being actively manipulated.</p><blockquote>\"Data security is the cornerstone of trust in the digital age.\"</blockquote><p>Our CORE engine utilizes hardware-level isolation to ensure that your sensitive assets never touch persistent storage unless explicitly requested.</p>",
        excerpt: "An in-depth look at the security protocols protecting your imaging pipeline.",
        category: "Enterprise",
        tags: ["security", "cloud", "processing", "privacy"],
        status: "published",
        featuredImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80",
        metaTitle: "Secure Asset Processing | Resizely.Core",
        metaDescription: "Comprehensive guide to image processing security and ephemeral workflows."
    },
    {
        title: "Optimizing Image Delivery for Web Vitals",
        slug: "optimizing-image-delivery-for-web-vitals",
        content: "<h2>Performance Engineering</h2><p>LCP (Largest Contentful Paint) is heavily influenced by image load times. By utilizing modern formats like WebP and AVIF, and implementing responsive delivery, you can significantly boost your core web vitals.</p><h3>Optimization Checklist</h3><ol><li>Use modern formats</li><li>Implement lazy loading</li><li>Adopt responsive image sets (srcset)</li><li>Maintain aspect ratio containers</li></ol>",
        excerpt: "Strategies to ensure your high-fidelity images don't slow down your user experience.",
        category: "Synthesis",
        tags: ["performance", "web-vitals", "optimization", "webp"],
        status: "published",
        featuredImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80",
        metaTitle: "Image Optimization for Web | Resizely.Core",
        metaDescription: "Boost your site performance with modern image delivery strategies."
    }
];

const seedBlogs = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        for (const blogData of sampleBlogs) {
            // Check if exists
            const existing = await Blog.findOne({ slug: blogData.slug });
            if (existing) {
                console.log(`⚠️  Skipped (Exists): ${blogData.title}`);
                continue;
            }
            await Blog.create(blogData);
            console.log(`📝 Seeded: ${blogData.title}`);
        }

        console.log(`\n✅ Seeding process complete`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding blogs:', error.message);
        process.exit(1);
    }
};

seedBlogs();

const connectDB = require("../config/db");
const PromotionalProject = require("../models/PromotionalProject");

const promotionalProjects = [
  {
    img: "/images/project (2).jpeg",
    category: ["ecommerce", "affiliate"],
    title: "Asian Import Export LTD",
    description:
      "Our agricultural solutions are designed to support modern farming through sustainable practices, premium-quality products, and efficient supply chains.",
    technologies: ["Next.js", "Nodemailer", "JavaScript"],
    client: "Craft Masters",
    date: "2024",
  },
  {
    img: "/images/project (3).jpeg",
    category: ["ecommerce", "affiliate"],
    title: "Asian Import Export Co.",
    description:
      "An import-export e-commerce platform connecting Asian manufacturers with global buyers.",
    technologies: ["Next.js", "Nodemailer", "JavaScript"],
    client: "Tech Corp",
    date: "2023",
  },
  {
    img: "/images/project (4).jpeg",
    category: ["ecommerce", "affiliate"],
    title: "BestBikeReview – Affiliate Bike Review Platform",
    description:
      "Affiliate-based bicycle review and buying guide platform focused on helping users choose the best bikes and accessories.",
    technologies: ["React", "Node.js", "MongoDB"],
    client: "Review Pros",
    date: "2024",
  },
  {
    img: "/images/project (5).jpeg",
    category: ["affiliate"],
    title: "BestGearBuy – Affiliate Product Discovery Platform",
    description:
      "Affiliate-driven product discovery and buying guide platform focused on electronics, tools, and everyday gear.",
    technologies: ["Next.js", "Framer Motion", "Nodemailer"],
    client: "Creative Agency",
    date: "2023",
  },
  {
    img: "/images/project (6).jpeg",
    category: ["ecommerce", "affiliate"],
    title: "BestBuyersView – Discover, Compare & Pick the Best Products",
    description:
      "A scalable UI/UX design system created to support a high-performance affiliate review and content-driven platform.",
    technologies: ["Next.js", "Node.js", "express.js", "mongodb"],
    client: "Fresh Foods",
    date: "2024",
  },
  {
    img: "/images/project (7).jpeg",
    category: ["affiliate"],
    title: "Best Baby Gears",
    description:
      "A centralized analytics dashboard to track affiliate performance, content growth, and traffic insights across multiple review websites.",
    technologies: ["Next.js", "Framer Motion"],
    client: "Diamond Collections",
    date: "2023",
  },
  {
    img: "/images/project (8).jpeg",
    category: ["affiliate"],
    title: "Best Smart Gadget",
    description:
      "A centralized analytics dashboard to track affiliate performance, content growth, and traffic insights across multiple review websites.",
    technologies: ["Next.js", "Framer Motion"],
    client: "Daily News",
    date: "2024",
  },
  {
    img: "/images/project (9).jpeg",
    category: ["shopify", "ecommerce"],
    title: "BackPack Pro – Affiliate Travel Gear Review Platform",
    description:
      "A travel gear review platform providing in-depth analysis and affiliate links for the latest backpacks and travel accessories.",
    technologies: ["shopify"],
    client: "Tech Savvy",
    date: "2023",
  },
  {
    img: "/images/project (10).jpeg",
    category: ["ecommerce", "wordpress"],
    title:
      "Kitchen Pro Supply – Kitchen Appliances & Equipment Review Platform",
    description:
      "An affiliate-driven kitchen appliance and equipment review platform helping users choose the best tools for home and professional kitchens.",
    technologies: ["HTML", "CSS", "JavaScript", "PHP"],
    client: "Gourmet Bistro",
    date: "2024",
  },
  {
    img: "/images/project (11).jpeg",
    category: ["affiliate"],
    title: "BestProductBuy – Affiliate Product Comparison Platform",
    description:
      "A scalable affiliate product discovery platform helping users find the best products through comparisons, reviews, and buying guides.",
    technologies: ["HTML", "CSS", "JavaScript"],
    client: "Gourmet Bistro",
    date: "2024",
  },
  {
    img: "/images/project (12).jpeg",
    category: ["ecommerce"],
    title: "Fitness and Health Store",
    description:
      "A scalable e-commerce store for fitness and health products, built on Shopify with a focus on user experience and product discovery.",
    technologies: ["HTML", "CSS", "JavaScript"],
    client: "Gourmet Bistro",
    date: "2024",
  },
  {
    img: "/images/project (13).jpeg",
    category: ["wordpress"],
    title: "JuteCraftify – Sustainable Jute E-commerce Platform",
    description:
      "A modern e-commerce platform dedicated to promoting sustainable jute products worldwide, featuring secure payments, streamlined inventory management, and export-ready workflows.",
    technologies: ["HTML", "CSS", "JavaScript", "wordpress"],
    client: "Gourmet Bistro",
    date: "2024",
  },
  {
    img: "/images/project (14).jpeg",
    category: ["wordpress"],
    title: "Cargo Logistic Company",
    description: "Moving Your Cargo, Moving Your Business Forward.",
    technologies: ["HTML", "CSS", "JavaScript", "wordpress"],
    client: "Gourmet Bistro",
    date: "2024",
  },
];

(async () => {
  try {
    const conn = await connectDB();

    for (const p of promotionalProjects) {
      const doc = {
        title: p.title,
        subtitle: p.subtitle || "",
        description: p.description || "",
        image: p.img || p.image || "",
        category: Array.isArray(p.category)
          ? p.category
          : [p.category].filter(Boolean),
        technologies: Array.isArray(p.technologies)
          ? p.technologies
          : (p.technologies || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
        client: p.client || "",
        date: p.date || "",
        isActive: true,
      };

      await PromotionalProject.findOneAndUpdate(
        { title: doc.title },
        { $setOnInsert: doc },
        { upsert: true },
      );
    }

    console.log("Seeding promotional projects completed.");
    await conn.close();
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
})();

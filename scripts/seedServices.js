require("dotenv").config();
const mongoose = require("mongoose");
const Service = require("../models/Service");
const ServiceCategory = require("../models/ServiceCategory");

// The 8 services currently hardcoded in the frontend navbar.
// icon = react-icons name (Fa*) so the navbar keeps its original brand icons.
const services = [
  {
    title: "Design & Development",
    description:
      "Custom, high-performance websites and web apps designed and built for your business.",
    icon: "FaLaptopCode",
    features: [
      "Responsive web design",
      "Custom web application development",
      "Performance optimization",
    ],
    category: "development",
    path: "/services/design-development",
    color: "bg-[#0066ff]",
    order: 1,
  },
  {
    title: "E-Commerce",
    description:
      "Complete e-commerce solutions to sell your products online with a seamless checkout.",
    icon: "FaCartShopping",
    features: ["Online store setup", "Payment integration", "Inventory management"],
    category: "e-commerce",
    path: "/services/e-commerce",
    color: "bg-[#0066ff]",
    order: 2,
  },
  {
    title: "Amazon",
    description:
      "Grow your Amazon business with Vendor Central, DSP, FBA, and marketing solutions.",
    icon: "FaAmazon",
    features: ["Amazon Vendor Central", "Amazon FBA", "Amazon DSP & advertising"],
    category: "marketing",
    path: "/services/amazon",
    color: "bg-[#0066ff]",
    order: 3,
  },
  {
    title: "Shopify",
    description:
      "Professional Shopify store design, development, and optimization services.",
    icon: "FaShopify",
    features: ["Shopify store setup", "Theme customization", "App integration"],
    category: "e-commerce",
    path: "/services/shopify",
    color: "bg-[#0066ff]",
    order: 4,
  },
  {
    title: "ERP System Development",
    description:
      "Tailor-made ERP systems to streamline and automate your business operations.",
    icon: "FaVectorSquare",
    features: ["Custom ERP development", "Business process automation", "Reporting & analytics"],
    category: "development",
    path: "/services/erp",
    color: "bg-[#0066ff]",
    order: 5,
  },
  {
    title: "SEO / SEM / PPC",
    description:
      "Data-driven search marketing to boost your visibility and drive qualified traffic.",
    icon: "FaSearch",
    features: ["Search engine optimization", "Paid search (PPC)", "Keyword & competitor research"],
    category: "marketing",
    path: "/services/seo",
    color: "bg-[#0066ff]",
    order: 6,
  },
  {
    title: "Server and Hosting Services",
    description:
      "Reliable, secure, and scalable hosting and server management for your applications.",
    icon: "FaUsers",
    features: ["Managed hosting", "Server setup & maintenance", "Security & backups"],
    category: "development",
    path: "/services/server-hosting",
    color: "bg-[#0066ff]",
    order: 7,
  },
  {
    title: "E-bay",
    description:
      "Set up, manage, and optimize your eBay store to reach more buyers and increase sales.",
    icon: "FaEbay",
    features: ["eBay store setup", "Listing optimization", "Order management"],
    category: "e-commerce",
    path: "/services/e-bay",
    color: "bg-[#0066ff]",
    order: 8,
  },
];

const categories = [
  { name: "development", displayName: "Development" },
  { name: "e-commerce", displayName: "E-Commerce" },
  { name: "marketing", displayName: "Marketing" },
];

const seed = async () => {
  const mongoUri =
    process.env.MONGO_URI ||
    "mongodb+srv://naimaa2it_db_user:LseCFqfqltKY58GW@cluster0.g3sv2kc.mongodb.net/a2it-database?appName=Cluster0";

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("✅ MongoDB connected");

  // Ensure categories
  for (const cat of categories) {
    await ServiceCategory.updateOne(
      { name: cat.name },
      { $setOnInsert: cat },
      { upsert: true },
    );
  }
  console.log("✅ Categories ensured");

  // Upsert services by path (won't duplicate on re-run)
  let created = 0;
  let updated = 0;
  for (const svc of services) {
    const existing = await Service.findOne({ path: svc.path });
    if (existing) {
      await Service.updateOne({ path: svc.path }, { $set: svc });
      updated += 1;
    } else {
      await Service.create(svc);
      created += 1;
    }
  }

  console.log(`✅ Services seeded — created: ${created}, updated: ${updated}`);
  await mongoose.disconnect();
  console.log("✅ Done");
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

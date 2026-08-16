require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Employee = require("../models/Employee");

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb+srv://naimaa2it_db_user:LseCFqfqltKY58GW@cluster0.g3sv2kc.mongodb.net/a2it-database?appName=Cluster0";
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB");

    // Check if admin already exists
    const adminExists = await User.findOne({ email: "naimaa2it@gmail.com" });

    if (!adminExists) {
      // Create default admin
      const defaultAdmin = new User({
        name: "Main Admin",
        email: "naimaa2it@gmail.com",
        password: "123456", // Change this in production
        role: "admin",
        isActive: true,
      });

      await defaultAdmin.save();

      console.log("✅ Default admin created successfully");
      console.log("\n📧 Email: naimaa2it@gmail.com");
      console.log("🔑 Password: 123456");
      console.log("\n⚠️  Please change the password after first login!\n");
    } else {
      console.log("✅ Default admin already exists");
    }

    // Seed sample employees if none exist
    const employeeCount = await Employee.countDocuments();
    if (employeeCount === 0) {
      const employees = [
        {
          name: "NAIMA UDDIN",
          number: "01",
          position: "Full Stack Web Developer",
          image: "/assets/EmployeeSection/Naima.jpeg",
          description: "Expert in React, Node.js, and cloud architecture with a passion for scalable solutions",
          achievements: ["AWS Certified Solutions Architect","Led 15+ Successful Projects","Tech Innovation Award Winner"],
          skills: ["Next.js","JavaScript","React.js","Node.js","Express.js","Git","TypeScript","HTML","CSS","Tailwind","AWS","MongoDB"],
          role: "developer",
        },
        {
          name: "Tahsin Jahan",
          number: "02",
          position: "Digital Marketing Executive",
          image: "/assets/EmployeeSection/borsha2.jpg",
          description: "Digital Marketing Executive with experience in SEO, content strategy, and social media management.",
          achievements: [],
          skills: ["SEO","Programming(C, Python, HTML, CSS, Php)","Microsoft Office(Word, Excel, Pptx)"],
          role: "marketing",
        },
        {
          name: "Ashik Mahamud",
          number: "03",
          position: "Digital Marketing Executive & HR",
          image: "/assets/EmployeeSection/ashik.jpeg",
          description: "Digital Marketing Executive and HR professional skilled in SEO, social media campaigns.",
          achievements: ["Best Project Performer"],
          skills: ["SEO","Keyword Research","Google Ads","Email Marketing","Social Media Marketing","CCNA","RHCSA & RHCE","Graphics Designer"],
          role: "marketing",
        },
        {
          name: "MD Minhajur Rahman Fahime",
          number: "04",
          position: "Digital Marketing Executive",
          image: "/assets/EmployeeSection/faime.png",
          description: "Digital Marketing Executive and HR professional skilled in SEO, social media campaigns.",
          achievements: [],
          skills: ["SEO","Keyword Research","Google Ads","Email Marketing","Social Media Marketing","CCNA","RHCSA & RHCE","Graphics Designer"],
          role: "marketing",
        },
        {
          name: "Md. Mahmudul Islam",
          number: "05",
          position: "Digital Marketing Executive",
          image: "/assets/EmployeeSection/my-formal-image2.jpg",
          description: "Responsible for planning and executing digital marketing campaigns, improving SEO performance.",
          achievements: [],
          skills: ["SEO","Content Marketing","Social Media Management","Analytics & Reporting","Keyword Research"],
          role: "marketing",
        },
        {
          name: "Shohana Rahman",
          number: "06",
          position: "MERN Stack Developer",
          image: "/assets/EmployeeSection/shohana.jpeg",
          description: "Responsible for designing, developing, and maintaining full-stack web applications using MongoDB, Express.js, React, and Node.js.",
          achievements: [],
          skills: ["Next.js","JavaScript","React.js","Node.js","Express.js","Git","HTML","CSS","Tailwind","AWS","MongoDB","firebase","Jquery","nodeJS","Bootstrap"],
          role: "developer",
        },
        {
          name: "Indra Ghosh",
          number: "07",
          position: "Web Developer",
          image: "/assets/EmployeeSection/indra.jpg",
          description: "Experienced Full Stack Developer proficient in React, Node, Next.js, databases, and building responsive web applications.",
          achievements: [],
          skills: ["React.js","JavaScript","Tailwind CSS","Node.js","Express.js","Next.js","C, C++","MongoDB","MySQL","Firebase","JWT"],
          role: "developer",
        },
        {
          name: "Ananya Kundu",
          number: "08",
          position: "Digital Marketing",
          image: "/assets/EmployeeSection/Ananya.jpeg",
          description: "Digital Marketing specialist with expertise in campaign management and analytics.",
          achievements: [],
          skills: ["Database Management (DBM)","Programming Fundamentals","Microsoft Office (Word, Excel, Pptx)"],
          role: "marketing",
        }
      ];

      await Employee.insertMany(employees);
      console.log(`✅ Seeded ${employees.length} employees`);
    } else {
      console.log(`✅ ${employeeCount} employees already exist`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error.message);
    process.exit(1);
  }
};

seedDatabase();

# A2it-Full-Website

A2IT-এর website/CMS (`a2it-website-dashboard`) আর HRM (`A2It-HRM`) — দুটো প্রজেক্ট merge করে একটাই app।
একটাই domain (`a2itltd.com`), একটাই database, একটাই Cloudinary account।

```
A2it-Full-Website/
├── backend/     ← Express server (port 5000) — website API + HRM API
└── frontend/    ← Next.js app (port 3000) — website + dashboard + HRM
```

---

## Ports

| | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:5000 |

আর কোনো port/server নেই।

## চালানোর নিয়ম

```bash
# terminal 1
cd backend
npm install
npm run dev          # http://localhost:5000

# terminal 2
cd frontend
npm install
npm run dev          # http://localhost:3000
```

Production: `npm start` (backend) এবং `npm run build && npm start` (frontend)।

---

## Frontend routes

| Route | কী আছে |
|---|---|
| `/` | A2IT public website (home, about, services, portfolio, blog, contact …) |
| `/login` | **Unified login** — website dashboard আর HRM, দুটোর account-ই এখানে কাজ করে |
| `/dashboard` | Website CMS dashboard (blog, services, portfolio, employees, users, settings) |
| `/hrm` | HRM login page |
| `/hrm/dashboard` | HRM admin dashboard |
| `/hrm/profile` | Employee dashboard |
| `/hrm/moderatorDashboard` | Moderator dashboard |
| `/hrm/attendance`, `/hrm/leave`, `/hrm/payroll`, `/hrm/meal`, `/hrm/user-roles`, `/hrm/holiday`, `/hrm/audit`, `/hrm/officeRent`, `/hrm/utilityBills`, `/hrm/foodCost`, … | বাকি সব HRM page |

### `/login` কীভাবে কাজ করে

একটাই form। প্রথমে website account হিসেবে চেষ্টা করে (`POST /api/auth/login`) — মিলে গেলে `/dashboard`-এ যায়।
না মিললে সেই একই email/password দিয়ে HRM-এ চেষ্টা করে (`POST /api/v1/unified-login`) — মিলে গেলে role অনুযায়ী
`/hrm/dashboard`, `/hrm/profile` বা `/hrm/moderatorDashboard`-এ যায়।

শুধু HRM-এর জন্য আলাদা login চাইলে `/hrm`।

---

## Backend API

| Prefix | কী |
|---|---|
| `/api/...` | Website/CMS API (auth, users, blog, services, portfolio, employees, upload, …) |
| `/api/v1/...` | HRM API (unified-login, attendance, payroll, leave, meal, reports, …) |

দুটো API-র path আগের মতোই আছে — শুধু এখন একই server-এ (`backend/index.js`)।

```
backend/
├── index.js          ← দুটো API mount করে, port 5000
├── config/           ← db.js (MongoDB), cloudinary.js, dns.js
├── controllers/ models/ routes/ middleware/   ← website/CMS
├── hrm/              ← পুরো HRM backend (আগের src/ folder)
│   ├── bootstrap.js  ← HRM cron job + startup কাজ
│   ├── controller/ models/ routes/ services/ utility/ cron/ seed/
└── scripts/          ← seed + migration script
```

---

## Database

একটাই MongoDB: **`a2it-database`** (website-এর cluster)।

| Collection | কার |
|---|---|
| `users` | Website/CMS account (admin, moderator) |
| `hrm_users` | HRM account (superAdmin, admin, moderator, employee) |
| `attendances`, `payrolls`, `leaves`, `holidays`, `tasks`, `auditlogs`, `mealsubscriptions`, `officerents`, … | HRM |
| `services`, `blogposts`, `portfolios`, `employees`, `roles`, … | Website |

**কেন `hrm_users`:** দুটো system-এরই আলাদা user schema ছিল আর দুটোই `users` collection ব্যবহার করত।
তাই website-এর data অক্ষত রাখতে HRM-এর user গুলো `hrm_users`-এ রাখা হয়েছে
(`backend/hrm/models/UsersModel.js`), আর website-এর model-এর নাম `WebUser` করা হয়েছে
(collection আগের মতোই `users`)।

### Migration (✅ চালানো হয়ে গেছে)

```bash
cd backend
npm run migrate:hrm           # পুরনো HRM DB → a2it-database  (--dry-run দিয়ে আগে দেখা যায়)
npm run migrate:hrm-images    # পুরনো HRM Cloudinary → নতুন account
```

**Migration = শুধু COPY, কোনো DELETE না।** এটাই নিয়ম, এবং script দুটোতে এটা enforce করা:

| | |
|---|---|
| পুরনো HRM database | শুধু `find` / `count` — একটাও write বা delete নেই। ✅ verify করা: ২১টা collection-এর count হুবহু আগের মতোই |
| পুরনো HRM Cloudinary | একটাও asset delete হয়নি (৪১টা asset আগের মতোই আছে), পুরনো URL গুলোও এখনো কাজ করে। নতুন account-এ শুধু copy তৈরি হয়েছে |
| নতুন `a2it-database` | website-এর নিজের data (`users`, `services`, `portfolios` …) ছোঁয়া হয়নি — HRM data আলাদা collection-এ যোগ হয়েছে |
| পুরনো code folder | `A2It-HRM` আর `a2it-website-dashboard` অক্ষত আছে |

script দুটোতে কোনো `deleteOne` / `deleteMany` / `drop` / `destroy` নেই — সব লেখা হয় `_id` দিয়ে
upsert করে, তাই বারবার চালালেও duplicate হয় না।

> ⚠️ **Cutover-এর আগে আরেকবার চালাবেন।** পুরনো HRM (`hrm.a2itltd.com`) এখনো live, তাই ওখানে
> নতুন attendance/leave/login হলে সেটা এই copy-তে আসবে না। নতুন site চালু করার ঠিক আগে
> `npm run migrate:hrm` আবার চালালে মাঝের সময়ের সব data চলে আসবে (idempotent, তাই নিরাপদ)।

---

## Cloudinary

একটাই account: `dqyaobg8j`। HRM-এর profile picture গুলো পুরনো account (`dxpvgmeds`) থেকে
migrate করে দেওয়া হয়েছে; নতুন upload সব `hrm_profiles` folder-এ এই account-এই যাবে।

---

## Environment

- `backend/.env` — PORT, MONGO_URI, JWT_SECRET, SMTP_* (website mail), EMAIL_* (HRM mail),
  CLOUDINARY_*, CALENDARIFIC_API_KEY, আর migration-এর জন্য `HRM_LEGACY_*`।
- `frontend/.env.local` —
  - `NEXT_PUBLIC_API_URL=http://localhost:5000` → website API
  - `NEXT_PUBLIC_HRM_API_URL=http://localhost:5000/api/v1` → HRM API

Production-এ deploy করার সময় `frontend/.env.local`-এর নিচের comment করা লাইনগুলো
(`https://a2itltd.com`) চালু করে দিলেই হবে, আর `backend/.env`-এ `NODE_ENV=production`।

---

## Merge করতে গিয়ে যা বদলাতে হয়েছে

1. **User model conflict** — website model `WebUser` (collection `users`), HRM model `User`
   (collection `hrm_users`)।
2. **HRM এর সব page `/hrm/*`-এ** — ভেতরের সব link, `router.push`, sidebar menu path আপডেট করা হয়েছে।
   HRM-এর logout এখন `/hrm`-এ পাঠায়।
3. **HRM frontend-এর API env var** `NEXT_PUBLIC_API_URL` → `NEXT_PUBLIC_HRM_API_URL`
   (website-এরটার সাথে সংঘর্ষ এড়াতে)। পুরনো hardcode করা Render URL গুলোও সরানো হয়েছে।
4. **HRM components** → `frontend/components/hrm/`, sidebar → `frontend/components/hrm/sidebar.js`।
5. **Next.js 16 + React 19.2** (HRM-এর version) — website-এর তিনটে framer-motion component-এ
   `"use client"` দিতে হয়েছে, নাহলে build fail করত।
6. **HRM cron job** গুলো `backend/hrm/bootstrap.js`-এ, MongoDB connect হওয়ার পর চালু হয়।
7. **DNS fallback** (`backend/config/dns.js`) — এই মেশিনে Node `mongodb+srv` SRV lookup করতে
   পারছিল না, তাই system DNS fail করলে public DNS ব্যবহার করে।

পুরনো দুটো folder (`A2It-HRM`, `a2it-website-dashboard`) অক্ষত আছে — backup হিসেবে।

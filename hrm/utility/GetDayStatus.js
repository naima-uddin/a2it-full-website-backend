const Holiday = require("../models/HolidayModel");
const OfficeSchedule = require("../models/OfficeScheduleModel");
const OfficeScheduleOverride = require("../models/TemporaryOfficeSchedule");

exports.getDayStatus = async (date) => {
  const dayMoment = new Date(date);
  const dayName = dayMoment.toLocaleString("en-US", {
    weekday: "long",
    timeZone: "Asia/Dhaka",
  });
  const dayStart = new Date(
    `${dayMoment.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" })}T00:00:00+06:00`,
  );
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(dayEnd.getHours() + 24);

  // 1️⃣ Govt / Company Holiday
  const holiday = await Holiday.findOne({
    date: { $gte: dayStart, $lt: dayEnd },
    isActive: { $ne: false }
  });

  if (holiday) {
    return "HOLIDAY";
  }

  // 2️⃣ Temporary Weekly Override
  const override = await OfficeScheduleOverride.findOne({
    isActive: true,
    startDate: { $lt: dayEnd },
    endDate: { $gte: dayStart }
  });

  if (override && override.weeklyOffDays.includes(dayName)) {
    return "WEEKLY_OFF";
  }

  // 3️⃣ Default Office Schedule
  const schedule = await OfficeSchedule.findOne({ isActive: true });

  const weeklyOffDays = schedule?.weeklyOffDays || ["Friday", "Saturday"];

  if (weeklyOffDays.includes(dayName)) {
    return "WEEKLY_OFF";
  }

  // 4️⃣ Normal Working Day
  return "WORKING_DAY";
};

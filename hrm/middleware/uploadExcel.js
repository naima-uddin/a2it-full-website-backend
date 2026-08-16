const multer = require("multer");

// In-memory storage so the controller can read the buffer with ExcelJS.
const storage = multer.memoryStorage();

const allowedExts = [".xlsx", ".xls", ".csv", ".pdf"];
const allowedMimes = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "text/csv",
  "application/csv",
  "application/pdf", // .pdf
  "application/octet-stream", // some browsers send this for xlsx/pdf
];

const fileFilter = (req, file, cb) => {
  const name = (file.originalname || "").toLowerCase();
  const extOk = allowedExts.some((ext) => name.endsWith(ext));
  const mimeOk = allowedMimes.includes(file.mimetype);
  if (extOk || mimeOk) {
    cb(null, true);
  } else {
    cb(
      new Error("Only Excel/CSV/PDF files (.xlsx, .xls, .csv, .pdf) are allowed"),
      false,
    );
  }
};

const uploadExcel = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = uploadExcel;

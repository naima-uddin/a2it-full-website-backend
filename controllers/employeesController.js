const Employee = require("../models/Employee");

const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ isActive: true }).sort({
      createdAt: 1,
    });
    return res.json({ success: true, data: employees });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

const getAdminEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: employees });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

const createEmployee = async (req, res) => {
  try {
    const employee = new Employee(req.body);
    await employee.save();
    return res.status(201).json({ success: true, data: employee });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, error: error.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Employee.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updated) {
      return res.status(404).json({ success: false, error: "Not found" });
    }
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, error: error.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await Employee.findByIdAndDelete(id);
    if (!removed) {
      return res.status(404).json({ success: false, error: "Not found" });
    }
    return res.json({ success: true, data: removed });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

module.exports = {
  getEmployees,
  getAdminEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};

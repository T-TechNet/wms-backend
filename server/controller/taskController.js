const express = require('express');
const Task = require('../model/task');
const PurchaseOrder = require('../model/purchaseOrder');
const User = require('../model/model');
const { body, param, validationResult } = require('express-validator');

// POST /api/tasks - Create a new task
exports.createTask = [
  body('purchaseOrderId').isMongoId(),
  body('type').isIn(['Picking', 'Packing', 'Quality Check', 'Shipping']),
  body('assignedTo').isString().notEmpty(),
  body('details').isString().notEmpty(),
  body('deadline').isISO8601(),
  body('status').optional().isIn(['Pending', 'In Progress', 'Completed']),
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Check purchase order exists
    const { purchaseOrderId, type, assignedTo, details, deadline, status } = req.body;
    const po = await PurchaseOrder.findById(purchaseOrderId);
    if (!po) {
      return res.status(400).json({ message: 'Invalid purchaseOrderId' });
    }
    // Create task
    const task = new Task({
      purchaseOrderId, type, assignedTo, details, deadline, status
    });
    await task.save();
    res.status(201).json(task);
  }
];

// GET /api/tasks/:id - Retrieve a task by _id
exports.getTask = [
  param('id').isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  }
];

// PUT /api/tasks/:id - Update a task
exports.updateTask = [
  param('id').isMongoId(),
  body('type').optional().isIn(['Picking', 'Packing', 'Quality Check', 'Shipping']),
  body('status').optional().isIn(['Pending', 'In Progress', 'Completed']),
  body('assignedTo').optional().isString().notEmpty(),
  body('details').optional().isString().notEmpty(),
  body('deadline').optional().isISO8601(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const update = req.body;
    const task = await Task.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  }
];

// DELETE /api/tasks/:id - Delete a task
exports.deleteTask = [
  param('id').isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.status(204).send();
  }
];

// GET /api/purchase-orders/:purchaseOrderId/tasks - List all tasks for a purchase order
exports.getTasksByPurchaseOrder = [
  param('purchaseOrderId').isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Populate assignedTo with user name and email
    const tasks = await Task.find({ purchaseOrderId: req.params.purchaseOrderId }).populate({
      path: 'assignedTo',
      model: User,
      select: 'name email'
    });
    res.json(tasks);
  }
];

// GET /api/orders/:orderId/tasks - List all tasks for an order
exports.getTasksByOrder = [
  param('orderId').isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const tasks = await Task.find({ orderId: req.params.orderId });
    res.json(tasks);
  }
];

// GET /api/tasks - List all tasks (for admin/manager views)
exports.getTasks = async (req, res) => {
  try {
    // Populate assignedTo with user name and email
    const tasks = await Task.find().populate({
      path: 'assignedTo',
      model: User,
      select: 'name email'
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching tasks: ' + err.message });
  }
};
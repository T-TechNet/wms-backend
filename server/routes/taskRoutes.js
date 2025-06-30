const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const taskController = require('../controller/taskController');

// All routes protected by JWT auth
router.post('/tasks', verifyToken, ...taskController.createTask);
router.get('/tasks/:id', verifyToken, ...taskController.getTask);
router.put('/tasks/:id', verifyToken, ...taskController.updateTask);
router.delete('/tasks/:id', verifyToken, ...taskController.deleteTask);
router.get('/purchase-orders/:purchaseOrderId/tasks', verifyToken, ...taskController.getTasksByPurchaseOrder);
router.get('/orders/:orderId/tasks', verifyToken, ...taskController.getTasksByOrder);
router.get('/tasks', verifyToken, taskController.getTasks);

module.exports = router;

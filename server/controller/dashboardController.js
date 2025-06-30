const express = require('express');
const Order = require('../model/order');
const Customer = require('../model/customer');
const Product = require('../model/product');
const Task = require('../model/task');
const PurchaseOrder = require('../model/purchaseOrder');

// Mock data for dashboard
const mockStats = {
    totalOrders: 150,
    totalRevenue: 25000,
    totalCustomers: 45,
    totalProducts: 78,
    totalTasks: 3,
    completedTasks: 1,
    lowStockProducts: 5
};

const mockTasks = [
    { id: 1, title: 'Process new orders', status: 'pending', priority: 'high' },
    { id: 2, title: 'Update inventory', status: 'in-progress', priority: 'medium' },
    { id: 3, title: 'Customer support tickets', status: 'completed', priority: 'low' }
];

const mockStock = [
    { id: 1, productName: 'Product A', quantity: 100, reorderLevel: 20 },
    { id: 2, productName: 'Product B', quantity: 50, reorderLevel: 15 },
    { id: 3, productName: 'Product C', quantity: 75, reorderLevel: 25 }
];

// Controller methods
const getStats = async (req, res) => {
    const role = req.user?.role;
    if (!role) {
        return res.status(401).json({ message: 'Unauthorized: No role found' });
    }
    try {
        // Use PurchaseOrder for PO-based stats
        const [totalPOs, totalRevenueAgg, totalCustomers, totalProducts, totalTasks, completedTasks, lowStockProducts] = await Promise.all([
            PurchaseOrder.countDocuments(),
            PurchaseOrder.aggregate([
                { $unwind: "$items" },
                { $lookup: {
                    from: "products",
                    localField: "items.product",
                    foreignField: "_id",
                    as: "productInfo"
                }},
                { $unwind: "$productInfo" },
                { $group: { _id: null, total: { $sum: { $multiply: ["$items.quantity", "$productInfo.price"] } } } }
            ]),
            Customer.countDocuments(),
            Product.countDocuments(),
            Task.countDocuments({ purchaseOrderId: { $exists: true, $ne: null } }),
            Task.countDocuments({ purchaseOrderId: { $exists: true, $ne: null }, status: 'Completed' }),
            Product.countDocuments({ stock: { $lte: 10 } })
        ]);
        const totalRevenue = totalRevenueAgg[0]?.total || 0;

        // Add detailed task status counts
        const [pendingTasks, inProgressTasks, completedTasksCount] = await Promise.all([
            Task.countDocuments({ purchaseOrderId: { $exists: true, $ne: null }, status: 'Pending' }),
            Task.countDocuments({ purchaseOrderId: { $exists: true, $ne: null }, status: 'In Progress' }),
            Task.countDocuments({ purchaseOrderId: { $exists: true, $ne: null }, status: 'Completed' })
        ]);
        const stats = {
            totalPOs,
            totalRevenue,
            totalCustomers,
            totalProducts,
            totalTasks,
            completedTasks,
            pendingTasks,
            inProgressTasks,
            completedTasksCount,
            lowStockProducts
        };
        if (role === 'superadmin') {
            return res.json(stats);
        } else if (role === 'manager') {
            const { totalRevenue, ...managerStats } = stats;
            return res.json(managerStats);
        } else if (role === 'user') {
            return res.json({
                totalProducts: stats.totalProducts,
                totalTasks: stats.totalTasks,
                completedTasks: stats.completedTasks,
                lowStockProducts: stats.lowStockProducts
            });
        } else {
            return res.status(403).json({ message: 'Forbidden: unknown role' });
        }
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        return res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};

const getTasks = async (req, res) => {
    try {
        // Only return tasks linked to POs
        const tasks = await Task.find({ purchaseOrderId: { $exists: true, $ne: null } }, 'title status priority');
        const formatted = tasks.map(task => ({
            id: task._id,
            title: task.title,
            status: task.status,
            priority: task.priority
        }));
        return res.json(formatted);
    } catch (err) {
        console.error('Error fetching tasks:', err);
        return res.status(500).json({ message: 'Error fetching tasks' });
    }
};

const getStock = async (req, res) => {
    try {
        const products = await Product.find({}, 'name stock');
        const formatted = products.map(product => ({
            id: product._id,
            productName: product.name,
            quantity: product.stock,
            reorderLevel: 10 // You can adjust or fetch from product if available
        }));
        return res.json(formatted);
    } catch (err) {
        console.error('Error fetching stock:', err);
        return res.status(500).json({ message: 'Error fetching stock' });
    }
};

module.exports = {
    getStats,
    getTasks,
    getStock
};
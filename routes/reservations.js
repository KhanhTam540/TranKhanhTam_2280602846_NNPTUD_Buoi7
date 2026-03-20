const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { checkLogin } = require("../utils/authHandler");
const reservationController = require("../controllers/reservations");
const cartModel = require("../schemas/carts");
const reservationModel = require("../schemas/reservations");
const inventoryModel = require("../schemas/inventories");

// [GET] /reservations/ - Lấy tất cả của user
router.get("/", checkLogin, async (req, res) => {
    const data = await reservationController.getAllByUserId(req.userId);
    res.send(data);
});

// [GET] /reservations/:id - Lấy 1 cái của user
router.get("/:id", checkLogin, async (req, res) => {
    const data = await reservationController.getById(req.params.id, req.userId);
    if (!data) return res.status(404).send({ message: "Không tìm thấy đơn" });
    res.send(data);
});

// [POST] /reservations/reserveACart - Chuyển toàn bộ giỏ hàng sang reservation
router.post("/reserveACart", checkLogin, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const cart = await cartModel.findOne({ user: req.userId }).session(session);
        if (!cart || cart.cartItems.length === 0) throw new Error("Giỏ hàng trống");

        const reservation = await reservationController.createReservation(req.userId, cart.cartItems, session);
        
        // Xóa giỏ hàng sau khi đã giữ hàng thành công
        cart.cartItems = [];
        await cart.save({ session });

        await session.commitTransaction();
        res.send(reservation);
    } catch (error) {
        await session.abortTransaction();
        res.status(400).send({ message: error.message });
    } finally {
        session.endSession();
    }
});

// [POST] /reservations/reserveItems - Đặt chỗ các item cụ thể từ body
router.post("/reserveItems", checkLogin, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { items } = req.body; // Expect: [{product: id, quantity: n}]
        const reservation = await reservationController.createReservation(req.userId, items, session);
        
        await session.commitTransaction();
        res.send(reservation);
    } catch (error) {
        await session.abortTransaction();
        res.status(400).send({ message: error.message });
    } finally {
        session.endSession();
    }
});

// [POST] /reservations/cancelReserve/:id - Hủy đặt chỗ (Transaction)
router.post("/cancelReserve/:id", checkLogin, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const reservation = await reservationModel.findOne({ 
            _id: req.params.id, 
            user: req.userId,
            status: "actived" 
        }).session(session);

        if (!reservation) throw new Error("Đơn không tồn tại hoặc không thể hủy");

        // Trả lại số lượng vào kho
        for (const item of reservation.items) {
            await inventoryModel.findOneAndUpdate(
                { product: item.product },
                { 
                    $inc: { stock: item.quantity, reserved: -item.quantity } 
                },
                { session }
            );
        }

        reservation.status = "cancelled";
        await reservation.save({ session });

        await session.commitTransaction();
        res.send({ message: "Hủy thành công", reservation });
    } catch (error) {
        await session.abortTransaction();
        res.status(400).send({ message: error.message });
    } finally {
        session.endSession();
    }
});

module.exports = router;
const reservationModel = require("../schemas/reservations");
const inventoryModel = require("../schemas/inventories");
const productModel = require("../schemas/products");

module.exports = {
    // Lấy tất cả các đơn đặt chỗ của user
    getAllByUserId: async function (userId) {
        return await reservationModel.find({ user: userId }).populate('items.product');
    },

    // Lấy chi tiết 1 đơn đặt chỗ
    getById: async function (id, userId) {
        return await reservationModel.findOne({ _id: id, user: userId }).populate('items.product');
    },

    // Logic chung để tạo reservation từ danh sách items (dùng cho cả Cart và Direct)
    createReservation: async function (userId, items, session) {
        let totalAmount = 0;
        const reservationItems = [];

        for (const item of items) {
            // 1. Kiểm tra tồn kho
            const inventory = await inventoryModel.findOne({ product: item.product }).session(session);
            if (!inventory || inventory.stock < item.quantity) {
                throw new Error(`Sản phẩm ${item.product} không đủ hàng hoặc không tồn tại`);
            }

            // 2. Lấy thông tin sản phẩm để lưu snapshot giá
            const product = await productModel.findById(item.product).session(session);
            const subtotal = product.price * item.quantity;
            totalAmount += subtotal;

            reservationItems.push({
                product: item.product,
                quantity: item.quantity,
                title: product.title,
                price: product.price,
                subtotal: subtotal
            });

            // 3. Cập nhật Inventory (Trừ stock, tăng reserved)
            inventory.stock -= item.quantity;
            inventory.reserved += item.quantity;
            await inventory.save({ session });
        }

        // 4. Tạo bản ghi Reservation
        const newReservation = new reservationModel({
            user: userId,
            items: reservationItems,
            amount: totalAmount,
            status: "actived",
            expiredIn: new Date(Date.now() + 30 * 60 * 1000) // Hết hạn sau 30 phút
        });

        return await newReservation.save({ session });
    }
};
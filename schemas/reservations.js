const mongoose = require('mongoose');

// Định nghĩa các item trong một đơn đặt chỗ
let reservationItems = mongoose.Schema({
    product: {
        type: mongoose.Types.ObjectId,
        ref: 'product',
        required: true
        // Lưu ý: Không để unique: true ở đây để có thể chứa nhiều sản phẩm trong các đơn khác nhau
    },
    quantity: {
        type: Number,
        min: 1,
        default: 1
    },
    title: {
        type: String
    },
    price: {
        type: Number
    },
    subtotal: {
        type: Number
    }
}, { _id: false }); // Không cần tạo ID riêng cho từng item trong mảng

let reservationSchema = mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: true
    },
    items: {
        type: [reservationItems],
        default: []
    },
    amount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ["actived", "expired", "cancelled", "paid"],
        default: "actived"
    },
    expiredIn: {
        type: Date,
        required: true
    }
}, {
    timestamps: true // Thêm thời gian tạo và cập nhật đơn hàng
});

module.exports = mongoose.model('reservation', reservationSchema);
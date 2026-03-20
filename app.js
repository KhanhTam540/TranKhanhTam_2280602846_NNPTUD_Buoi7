var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
let mongoose = require('mongoose');

var app = express();

// Thiết lập view engine (EJS)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Cấu hình Middleware cơ bản
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Kết nối cơ sở dữ liệu MongoDB
mongoose.connect('mongodb://localhost:27017/NNPTUD-S2', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.connection.on('connected', function () {
  console.log("Đã kết nối thành công tới MongoDB");
});

// Đăng ký các Route chính của ứng dụng
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));
app.use('/roles', require('./routes/roles'));
app.use('/auth', require('./routes/auth'));
app.use('/carts', require('./routes/carts'));
app.use('/products', require('./routes/products'));

// Route mới cho hệ thống Reservation (Đặt chỗ/Giữ hàng)
app.use('/reservations', require('./routes/reservations'));

// Xử lý lỗi 404 - Không tìm thấy trang
app.use(function (req, res, next) {
  next(createError(404));
});

// Middleware xử lý lỗi tập trung
app.use(function (err, req, res, next) {
  // Thiết lập thông báo lỗi tùy theo môi trường (development/production)
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Trả về mã trạng thái lỗi (mặc định là 500)
  res.status(err.status || 500);
  
  // Gửi phản hồi lỗi dưới dạng JSON cho client (thay vì render trang error)
  res.send({
    success: false,
    message: err.message
  });
});

module.exports = app;
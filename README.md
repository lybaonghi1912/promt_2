# Prompt 2 E-commerce Monolithic API

Backend thương mại điện tử MVP phục vụ thực hành Node.js, Express, Prisma ORM và PostgreSQL.
Các chức năng chạy chung trong một ứng dụng backend, được triển khai trong container API. PostgreSQL chạy ở container riêng.

## Chức năng

- Đăng ký: tự gán role normal và membership BASIC có score 10; mật khẩu được băm bằng bcrypt.
- Đăng nhập trả JWT; middleware kiểm tra token và quyền ADMIN.
- Xem sản phẩm; ADMIN được thêm, sửa và xóa sản phẩm.
- Đặt hàng: kiểm tra và trừ tồn kho, tạo Order, OrderDetail và Shipment PENDING trong cùng transaction.
- Xem danh sách và chi tiết đơn: khách chỉ xem đơn của mình; ADMIN xem tất cả.
- Health check API và kết nối PostgreSQL; Docker Compose chạy toàn bộ hệ thống.

## Cấu trúc

~~~text
prisma/
  schema.prisma       # 7 model và quan hệ
  migrations/         # SQL tạo và cập nhật cấu trúc database
  seed.js             # Role và membership ban đầu
  create-admin.js     # Tạo tài khoản ADMIN từ biến môi trường
src/
  config/             # Cấu hình JWT
  middlewares/        # Xác thực và phân quyền
  routes/             # API xác thực, sản phẩm và đơn hàng
  prisma.js           # Prisma Client và PostgreSQL adapter
  server.js           # Ghép routes, health check và mở cổng API
  docker-start.js     # Migration, seed và khởi động trong Docker
compose.yaml
Dockerfile
prisma7.config.ts
.env.example
~~~

## Chạy bằng Docker Compose

Yêu cầu Docker Desktop đang chạy và cổng 3002, 5433 còn trống.
Trong PowerShell tại thư mục dự án:

~~~powershell
Copy-Item .env.example .env
~~~

Chỉ sao chép trên máy mới chưa có .env. Điền giá trị riêng cho POSTGRES_PASSWORD, JWT_SECRET (ít nhất 32 byte) và ADMIN_PASSWORD.
DATABASE_URL trong .env phải khớp tài khoản, mật khẩu, tên database; ký tự đặc biệt trong URL cần được percent-encode.

~~~powershell
docker volume create promt_postgres_data
docker compose up -d --build --wait
docker compose ps
curl.exe http://localhost:3002/health
~~~

API tự chạy migration và seed sau khi PostgreSQL healthy. PORT trong .env là cổng API trên máy, mặc định 3002; container API dùng cổng 3000 và kết nối database qua db:5432.
Volume đã tồn tại được giữ nguyên; thay mật khẩu trong .env không tự đổi mật khẩu database đã khởi tạo trong volume cũ.
Health trả HTTP 200 với status ok, database up; HTTP 503 khi database lỗi hoặc quá thời gian kiểm tra.

## Cấu hình và Git

.env chứa giá trị thật trên máy và không được đưa lên GitHub. .env.example chỉ chứa cấu hình mẫu.
.gitignore cũng bỏ qua node_modules, cấu hình công cụ và log.

~~~powershell
git ls-files -- .env
git check-ignore .env
~~~

Lệnh đầu phải không có kết quả; lệnh sau hiển thị .env. Có thể đọc tên biến từ .env.example mà không công khai mật khẩu.

## API chính

| Method | Endpoint | Quyền |
|---|---|---|
| POST | /api/auth/register | Công khai |
| POST | /api/auth/login | Công khai |
| GET | /api/auth/me | Có JWT |
| GET | /api/products và /api/products/:id | Công khai |
| POST | /api/products | ADMIN |
| PUT, DELETE | /api/products/:id | ADMIN |
| POST | /api/orders | Có JWT |
| GET | /api/orders và /api/orders/:id | Có JWT, kiểm tra chủ đơn |
| GET | /health | Công khai |

JWT được gửi trong header Authorization: Bearer TOKEN. Khi tạo/sửa sản phẩm qua API, price là chuỗi thập phân, quantity là số nguyên.

## Luồng thực hành

1. Giải thích cấu trúc Monolithic và file server.js.
2. Trình bày .gitignore, .env.example và kiểm tra .env không được Git theo dõi.
3. Trình bày schema, migration, Prisma Client và transaction đặt hàng.
4. Chạy Compose, kiểm tra healthy và liệt kê container bằng docker ps.
5. Truy cập PostgreSQL, xem đủ bảng và tạo X, Y bằng CLI.
6. Đăng ký tài khoản mới, chỉ role normal và score 10; đăng nhập lấy JWT.
7. Đặt hàng không token nhận 401; có token đặt X x2, Y x5; xem details và shipments.
8. Dùng SQL kiểm tra Order, OrderDetail, Product.quantity và Shipment.

Vào PostgreSQL bằng biến môi trường của container:

~~~powershell
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
~~~

Trong psql:

~~~sql
\pset pager off
\dt
INSERT INTO "Product" (pname, price, quantity)
VALUES ('X', 100000, 20), ('Y', 50000, 20) RETURNING *;
~~~

Ghi lại pid thực tế vừa tạo. Trong Postman chọn Body > raw > JSON.
Đăng ký POST http://localhost:3002/api/auth/register:

~~~json
{"username":"demo_p2_01","fullname":"Sinh vien demo","password":"PracticeP2_2026!"}
~~~

Mỗi lần luyện dùng username mới. Đăng nhập POST /api/auth/login bằng cùng username/password để lấy token.
Đặt hàng POST /api/orders với Bearer Token; thay 12 và 13 bằng pid thực tế của X, Y:

~~~json
{"items":[{"pid":12,"qty":2},{"pid":13,"qty":5}]}
~~~

Phản hồi HTTP 201 gồm order, details, shipments PENDING và total 450000.00. createat được database tự lấy thời gian hiện tại.
Gửi thành công một lần thì X còn 18, Y còn 15. GET /api/orders/OID để xem lại đơn.
Trong psql, thay 123 bằng oid và 12,13 bằng pid thực tế:

~~~sql
SELECT * FROM "Order" WHERE oid=123;
SELECT * FROM "OrderDetail" WHERE oid=123;
SELECT * FROM "Product" WHERE pid IN (12,13);
SELECT * FROM "Shipment" WHERE oid=123;
\q
~~~

## Chạy trực tiếp bằng Node.js

Sử dụng Node.js đáp ứng yêu cầu Prisma 7, ví dụ Node 22.12 trở lên trong nhánh 22.
Sau khi cấu hình .env và khởi chạy database:

~~~powershell
npm ci
npm run prisma:generate
npm run db:deploy
npm run db:seed
node prisma/create-admin.js
npm start
~~~

Không chạy API Node trực tiếp và API Docker đồng thời trên cùng cổng.
Script npm test hiện là placeholder, chưa có bộ test tự động tích hợp trong repository. Kiểm tra thực hành theo luồng API và SQL ở trên.

## Dừng hệ thống

~~~powershell
docker compose down
~~~

Dữ liệu được lưu trong volume promt_postgres_data. Xem DOCKER.md để biết thêm lệnh vận hành.

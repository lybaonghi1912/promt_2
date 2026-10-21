# Chay he thong bang Docker Compose

1. Tren may moi, sao chep .env.example thanh .env va thay mat khau, JWT_SECRET. Giu nguyen .env hien tai neu da cau hinh.
2. Tao volume neu chua co: `docker volume create promt_postgres_data`. Lenh nay giu nguyen volume neu da ton tai.
3. Dung API Node dang chay truc tiep tren cung cong truoc khi chay Docker.
4. Chay: `docker compose up -d --build --wait`.

API tu chay migration va seed khi khoi dong. Database dung lai volume hien co.
Host truy cap database qua localhost:5433; API trong Docker dung db:5432.
PORT trong .env la cong API tren host (mac dinh 3002), trong container la 3000.

## Lenh kiem tra khi thuc hanh

`docker compose ps`

`docker ps`

`docker compose logs --tail 50 api`

`curl.exe http://localhost:3002/health`

Health tra HTTP 200 voi status ok, database up khi ket noi duoc PostgreSQL; HTTP 503 khi database loi hoac qua 3 giay.

`docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'`

Trong psql, dung `\dt` de liet ke cac bang; `\q` de thoat.

Dung he thong: `docker compose down`. Volume du lieu van duoc giu lai.

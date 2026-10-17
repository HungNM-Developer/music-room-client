# Music Room — client

Giao diện **Next.js 16** của Music Room: màn hình điện thoại 3 tab (Phòng / Thêm bài / Mọi người) và màn hình máy phát `/r/<MÃ>/host`. Server, thiết kế và hướng dẫn cài đặt nằm ở repo [`music-room-server`](https://github.com/hungnm-developer/music-room-server).

## Phát triển

Cần server chạy ở `http://localhost:3001` (xem README của server).

```bash
npm ci
npm run contracts:sync                       # copy src/contracts từ ../music-room-server
NEXT_PUBLIC_SERVER_URL=http://localhost:3001 npm run dev
```

| Lệnh | Việc |
|---|---|
| `npm run lint` · `npm run typecheck` · `npm run build` | |

- Mọi chữ hiển thị nằm trong [`src/i18n/vi.ts`](src/i18n/vi.ts).
- Ở production, client gọi API cùng origin qua Caddy nên không cần biến môi trường nào.

## Deploy lên Vercel

1. Import repo vào Vercel (framework: Next.js, giữ cấu hình mặc định).
2. Thêm biến môi trường `NEXT_PUBLIC_SERVER_URL` = địa chỉ API, không có `/` ở cuối (bản đang chạy: `https://api.musicroom.io.vn`; mới dựng thì `https://<api>.onrender.com`) và `PUBLIC_APP_URL` = địa chỉ web chính thức (bản đang chạy: `https://musicroom.io.vn`; chưa có tên miền riêng thì `https://<app>.vercel.app`), dùng cho link và QR trong ảnh xem trước. Rồi **Redeploy**: `NEXT_PUBLIC_SERVER_URL` được nhúng vào lúc build.
3. Bên server (Render), đặt `PUBLIC_URL` bằng địa chỉ web chính thức và `CORS_ORIGINS` bằng mọi địa chỉ web được gọi API (ví dụ `https://musicroom.io.vn,https://<app>.vercel.app`). Nếu thiếu, trình duyệt sẽ bị chặn kết nối.
4. Tên miền riêng (DNS, redirect `www` và `*.vercel.app`, Google Search Console, OAuth): xem §8.8 của tài liệu dưới.

Hướng dẫn đầy đủ (gồm Render và Postgres) nằm ở [`music-room-server/deploy/README.md` §8](https://github.com/HungNM-Developer/music-room-server/blob/develop/deploy/README.md).

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
| `npm test` | Unit test (Vitest) cho `src/lib`, `src/i18n` |
| `npm run test:e2e` | Playwright E2E — server với `YOUTUBE_FAKE=1`, client với `NEXT_PUBLIC_E2E=1` (trình phát giả) |
| `npm run lint` · `npm run typecheck` · `npm run build` | |

- Mọi chữ hiển thị nằm trong [`src/i18n/vi.ts`](src/i18n/vi.ts).
- Ở production, client gọi API cùng origin qua Caddy nên không cần biến môi trường nào.

# Music Room client: thiết kế lại giao diện và tối ưu hiệu năng

**Mục tiêu:** làm lại toàn bộ giao diện client cho đẹp, hợp chủ đề và có cá tính riêng. Đồng thời giảm dung lượng tải về, giảm CPU/GPU khi chạy lâu (máy phát mở cả ngày) và giảm render thừa. **Không đổi hành vi**: giao thức socket, quyền và luật hàng chờ giữ nguyên.

**Phạm vi:** repo `music-room-client`, cộng thêm một thay đổi nhỏ trong `music-room-server/src/contracts` (tách hằng số khỏi Zod, không đổi hành vi).

**Kiểm tra (theo yêu cầu không viết test):** sau mỗi bước chạy `lint`, `typecheck` và `build`. Chụp màn hình ở 375 px, 768 px và 1440 px. Thử tay trên môi trường dev LAN (điện thoại cộng máy phát).

---

## 1. Hiện trạng: các điểm cần sửa

### Hiệu năng

| # | Vấn đề | Ở đâu | Hậu quả |
|---|---|---|---|
| P1 | **Zod chạy trong trình duyệt**, kèm toàn bộ file dịch lỗi (tiếng Ba Lan, Đức…), vì client import `@/contracts` dạng barrel | `contracts/index.ts` → `schemas.ts` | Chunk lớn nhất **104 KB gzip** (Zod cộng Socket.IO). Tổng JS client **363 KB gzip** |
| P2 | `RoomContext` tạo object `value` mới mỗi lần render, `onReaction`/`onDj` là hàm mới mỗi lần | `context/RoomContext.tsx` | Một tin nhắn chat làm render lại toàn bộ trang: hàng chờ, người, bài đang phát. Effect đăng ký reaction bị gỡ ra rồi gắn lại liên tục |
| P3 | Nền phòng có 3 khối blur 150–200 px chạy animation vô hạn, cộng ảnh bìa blur 120 px và `mix-blend` | `RoomBackground.tsx` | GPU luôn bận, tốn pin điện thoại, máy phát nóng và có thể giật video |
| P4 | `backdrop-filter: blur(25–30px)` trên mọi thẻ (`glass-effect`) | `globals.css` | Mỗi lần cuộn hay cập nhật là vẽ lại toàn bộ lớp mờ |
| P5 | Canvas tim chạy `requestAnimationFrame` 60 lần/giây **kể cả khi không có tim nào**, không xử lý màn hình độ phân giải cao (DPR) | `HeartCanvas.tsx` | CPU không bao giờ nghỉ; hình mờ trên màn Retina |
| P6 | `framer-motion` chỉ dùng cho fade, thanh nhạc và toast | 6 file | Khoảng 40 KB gzip cho các hiệu ứng CSS làm được |
| P7 | `useNow(500)` render lại cả thẻ "Đang phát" 2 lần mỗi giây; thanh tiến trình animate `width` | `NowPlayingCard.tsx` | Mỗi lần đổi layout là trình duyệt tính lại bố cục |
| P8 | Ảnh bìa YouTube `hqdefault` (480×360) hiển thị ở ô 48 px, không có `loading="lazy"` hay kích thước | Queue, kết quả tìm, thẻ đang phát | Tải thừa ảnh, bố cục nhảy khi ảnh về |
| P9 | `applause.wav` nặng **1,9 MB**, cả thư mục sounds 2,3 MB; mỗi lần bấm DJ tạo `new Audio()` mới | `public/sounds`, `PlayerEngine` | Lần đầu bấm bị trễ, tốn băng thông |
| P10 | Modal, `PlayerEngine` (react-youtube) và Settings/DJ luôn được tải dù hiếm khi dùng | `r/[code]/page.tsx` | JS ban đầu nặng hơn cần thiết |
| P11 | Font Geist Mono chỉ dùng cho mã phòng; file svg mẫu của Next (`file/globe/next/vercel/window.svg`) không dùng tới | `layout.tsx`, `public/` | Tải thừa |

### Thiết kế và trợ năng

- Giao diện là bộ "glassmorphism tím–hồng" mặc định: gradient, glow và nhãn VIẾT HOA giãn chữ ở mọi tiêu đề. Không có gì gợi tới chủ đề "văn phòng cùng nghe nhạc, một loa".
- Hàng chờ công bằng theo **vòng** là luật cốt lõi, nhưng giao diện chỉ ghi "vòng 2" trong dòng chữ nhỏ.
- Modal tự làm bằng `div`: không giữ focus, không đóng bằng Esc, không trả focus về chỗ cũ. Tab dưới đáy không điều hướng được bằng phím mũi tên.
- Không tôn trọng `prefers-reduced-motion`. Chữ phụ `slate-500` trên nền tối không đạt độ tương phản AA.
- Thông tin phụ ghép bằng " · " ở khắp nơi, khó đọc trên điện thoại.

---

## 2. Hướng thiết kế: "Đài phát thanh của văn phòng"

**Ý tưởng gốc:** tính năng đặc trưng nhất của app là **gửi lời chúc kèm bài hát, rồi máy đọc lời chúc trước khi phát**. Đó chính là "Quà tặng âm nhạc" của đài phát thanh Việt Nam. Vì vậy app được thiết kế như một **chiếc radio của văn phòng**: mặt số dò đài, đèn ON AIR, phiếu gửi lời chúc. Mọi chi tiết trang trí đều lấy từ thế giới đó, không dùng gradient hay glow chung chung.

### Màu (một theme tối, vì máy phát mở cả ngày)

| Token | Hex | Vai trò |
|---|---|---|
| `dial` | `#0F2A26` | Nền: xanh rêu đậm như mặt số radio cũ. Có màu rõ ràng chứ không phải đen pha |
| `panel` | `#173A34` | Bề mặt thẻ, sheet (đặc, không blur) |
| `line` | `#2A524A` | Viền, vạch chia trên mặt số |
| `paper` | `#F3ECDD` | Chữ chính: màu giấy của phiếu lời chúc |
| `sage` | `#A9C1B8` | Chữ phụ (đạt AA trên `dial` và `panel`) |
| `amber` | `#F6A623` | Đèn nền mặt số: kim tiến trình, nút chính, tab đang chọn |
| `onair` | `#E8483A` | Đèn ON AIR: trạng thái đang phát, tim, cảnh báo nguy hiểm |

Mỗi màu nhấn có một vai trò cố định: amber là "điều khiển", đỏ là "đang phát / cảm xúc". Không có gradient trang trí.

### Chữ

- **Bricolage Grotesque** (có bộ dấu tiếng Việt), dùng cho tên bài, tên phòng, mã phòng và số trên mặt số. Dùng độ rộng hẹp và đậm, như nhãn in trên radio.
- **Be Vietnam Pro** cho toàn bộ chữ giao diện. Font do người Việt thiết kế nên dấu tiếng Việt chuẩn, dễ đọc ở cỡ nhỏ.
- Cả hai load bằng `next/font` (subset `latin` và `vietnamese`, `display: swap`). Bỏ Geist và Geist Mono.
- Thang chữ: 13 / 15 / 17 / 22 / 30 / 44 px. Nhãn viết thường đầu câu, **không viết hoa giãn chữ**. Số dùng `tabular-nums`.

### Điểm nhấn duy nhất: mặt số dò đài

Thanh tiến trình được thay bằng **mặt số radio**: một dải vạch chia, các mốc phút đánh số, và **kim màu amber** chạy theo vị trí bài hát. Khi đổi bài, kim quét từ đầu dải, đây là khoảnh khắc chuyển động duy nhất do hệ thống tự chạy. Mặt số xuất hiện nhỏ trên điện thoại và rất lớn trên màn hình máy phát. Mọi thứ xung quanh giữ yên tĩnh: bề mặt phẳng, viền mảnh, bo góc có thứ bậc (20 px cho panel lớn, 12 px cho dòng, tròn hẳn cho avatar).

### Bố cục

```
Điện thoại: tab Phòng                 Máy tính ≥1024px
┌──────────────────────────┐          ┌───────────────────────┬──────────────┐
│ Phòng Dev tầng 3  [K7M2QX]⤴│          │ header                │              │
├──────────────────────────┤          ├───────────────────────┤ [Thêm][Người]│
│ ● ON AIR                 │          │ Đang phát (lớn)       │ [Chat]       │
│ [ảnh]  Tên bài hát       │          │ mặt số dò đài         │              │
│        Minh Anh chọn     │          │ reaction              │ nội dung tab │
│ ┌ Lời chúc từ Minh Anh ┐ │          ├───────────────────────┤              │
│ │ "Chúc team chạy..."  │ │          │ Tiếp theo             │              │
│ └──────────────────────┘ │          │  Lượt 1 …             │              │
│ |·|·|·|·▲·|·|·|·|·|·|    │          │  Lượt 2 …             │              │
│ 1:12            3:45     │          └───────────────────────┴──────────────┘
│ [Bỏ qua 1/3] [⏸]        │
│ ❤️ 😂 🔥 👏 …             │          Máy phát /r/CODE/host (toàn màn hình)
│ Tiếp theo                │          ┌─────────────────────────────┬────────┐
│  Lượt 1                  │          │  video YouTube (16:9)       │ Quét để│
│   ▢ Bài A   Lan     ♥2   │          │                             │ chọn   │
│  Lượt 2                  │          │                             │ [QR]   │
│   ▢ Bài B   Minh Anh     │          ├─────────────────────────────┤ K7M2QX │
├──────────────────────────┤          │ ● ON AIR  Tên bài (44px)    ├────────┤
│  Phòng   Thêm bài  Mọi người│        │ mặt số dò đài cỡ lớn        │ Tiếp   │
└──────────────────────────┘          └─────────────────────────────┴ theo ×3┘
```

- Chữ căn trái ở mọi nơi. Chỉ phiếu QR trên màn hình máy phát căn giữa.
- **Hàng chờ chia nhóm theo "Lượt 1, Lượt 2…"**, đúng luật xếp lượt công bằng. Bài ghim nằm trên cùng với nhãn "Phát tiếp theo".
- Lời chúc hiện như một **phiếu gửi tặng** dưới bài đang phát và trên dòng hàng chờ có lời chúc.
- Máy tính: cột phải là bảng có tab (Thêm bài / Mọi người / Trò chuyện), thay cho việc xếp chồng mọi panel.
- Trang chủ: tiêu đề "Cả phòng chọn nhạc, một loa phát." đặt cạnh form tạo/vào phòng; mặt số dò đài làm hình nền tĩnh, kim quét một lần khi tải trang.

### Đã so với các lối mòn và điều chỉnh

- Ban đầu định dùng nền gần đen với một màu amber. Đó đúng là lối mòn "nền đen + một màu sáng", nên **đổi nền sang xanh rêu đậm** có màu thật, thêm đỏ ON AIR với vai trò riêng.
- Bỏ nhãn viết hoa giãn chữ, gradient, glow, glassmorphism và font mono cho nhãn.
- Bỏ chuỗi " · " nối thông tin. Người thêm, thời lượng và lời chúc tách thành các phần tử riêng.
- Số thứ tự chỉ dùng khi đúng là trình tự: "Lượt 1, 2…" chính là thứ tự phát.

### Trợ năng

- Focus nhìn thấy rõ (vòng amber 2 px).
- Mọi dialog dùng **thẻ `<dialog>` gốc** (`showModal`): giữ focus, đóng bằng Esc, trả focus về chỗ cũ.
- Tab dưới đáy theo chuẩn WAI-ARIA: có `aria-controls`, chuyển bằng phím mũi tên.
- Màu chữ đạt AA. Có `prefers-reduced-motion`: tắt kim quét, tim bay và hiệu ứng vào.
- Vùng bấm tối thiểu 44 px. Có `env(safe-area-inset-*)`.

---

## 3. Mục tiêu đo được

| Chỉ số | Hiện tại | Mục tiêu |
|---|---|---|
| JS client (gzip, toàn bộ chunk) | 363 KB | **≤ 230 KB** |
| Zod trong bundle client | Có (kèm mọi file dịch) | **Không** |
| `framer-motion` | Có | **Không** |
| Vòng `requestAnimationFrame` khi không có reaction | Luôn chạy | **0** |
| Animation vô hạn trên nền | 3 khối blur | **0** (nền tĩnh) |
| Render lại khi có tin nhắn chat | Toàn trang | **Chỉ khung chat** |
| `public/sounds` | 2,3 MB | **≤ 0,6 MB** |
| Ảnh bìa trong danh sách | 480×360, tải ngay | 320×180 (`mqdefault`), `lazy`, có kích thước |

---

## 4. Các bước triển khai

Mỗi bước kết thúc bằng `npm run lint && npm run typecheck && npm run build` và chụp màn hình. Làm trên nhánh `feat/redesign` (client) và `chore/contracts-constants` (server).

### Bước 1: Bỏ Zod khỏi client (P1)

- **Server** `src/contracts`: chuyển các hằng số (`REACTIONS`, `DJ_SOUNDS`, `VOICE_PRESETS`, `LIMITS`, `ACK_TIMEOUT_MS`…) từ `schemas.ts` sang `constants.ts` không import Zod. `schemas.ts` import lại từ đó; `index.ts` export thêm `constants`. Không đổi hành vi.
- **Client:**
  - Chạy `npm run contracts:sync`.
  - Mọi import đổi sang file cụ thể (`@/contracts/constants`, `/youtube`, `/text`, `/version`) hoặc `import type` từ `@/contracts`.
  - Thêm `src/lib/validate.ts` (`isDisplayName`, `isPin`, `isRoomCode`, `isRoomName`) dựa trên `LIMITS`, thay cho `Schema.safeParse`. Server vẫn là nơi kiểm tra cuối cùng.
  - ESLint `no-restricted-imports`: cấm import `zod` và import runtime từ barrel `@/contracts` để lỗi này không quay lại.
- **Xong khi:** chunk build không còn chuỗi "Invalid input" của Zod.

### Bước 2: Tầng state không gây render thừa (P2, P7)

- Thay `RoomContext` bằng **store ngoài React** (`src/state/room-store.ts`):
  - Giữ nguyên logic socket hiện có.
  - Hook `useRoomState(selector)` dùng `useSyncExternalStore`, nên mỗi component chỉ render khi phần dữ liệu nó chọn thay đổi.
  - `useRoomActions()` trả về object hành động ổn định (`enter`, `send`, `leave`, `onReaction`, `onDj`…).
- `useAct` và các component chuyển sang selector.
- Đồng hồ tiến trình tách thành component nhỏ (`<DialProgress>`) cập nhật bằng `requestAnimationFrame` + `transform`, chỉ khi đang phát và tab đang hiện (`visibilitychange`).
- **Xong khi:** gửi chat không làm `QueueList` hay `NowPlaying` render lại (kiểm tra bằng React DevTools Profiler hoặc bộ đếm render tạm thời).

### Bước 3: Hệ thống thiết kế (P4, P6, P11)

- **`globals.css`:** viết lại bằng `@theme` gồm màu (mục 2), font, bo góc, khoảng cách, `focus-visible` và `prefers-reduced-motion`. Bỏ `glass-effect`, `glow-card`, `text-gradient`, `noise.svg` và scrollbar tùy biến.
- **`layout.tsx`:** load Bricolage Grotesque và Be Vietnam Pro qua `next/font`; `themeColor` đổi thành `#0F2A26`; `lang="vi"`.
- **Component nền `src/components/ui/`:**
  - `Button` (primary/secondary/ghost/danger), `IconButton`, `Field`, `Dialog` (`<dialog>` gốc, kiểu sheet trên điện thoại).
  - `Tabs` (WAI-ARIA), `Avatar` (màu thành viên), `Badge`, `Thumb` (ảnh YouTube đúng cỡ, `lazy`, có `width`/`height`).
  - `Toast` (CSS `@starting-style`, không dùng framer).
- Gỡ `framer-motion`; xóa các svg mẫu của Next trong `public/`.

### Bước 4: Mặt số dò đài (điểm nhấn)

- Tạo `src/components/room/TuningDial.tsx`:
  - SVG vạch chia, mốc phút và kim amber.
  - Hai cỡ `compact` (điện thoại) và `large` (máy phát).
  - Kim quét khi đổi bài; tắt khi `prefers-reduced-motion`.
  - Hỗ trợ bài không rõ thời lượng: kim đứng yên, mặt số hiện "Không rõ thời lượng".
- Dùng ở thẻ Đang phát, màn hình máy phát và trang chủ (bản tĩnh).

### Bước 5: Trang chủ

- `app/page.tsx` thành server component (tiêu đề, giới thiệu) cộng một client island `HomeForm` (tạo phòng / vào phòng).
- Giữ nguyên luồng: mật khẩu cài đặt khi `setupRequired`, nhớ tên, chuyển tới `/r/CODE`.

### Bước 6: Trang phòng `/r/[code]`

- Bố cục: điện thoại 3 tab; máy tính 2 cột, cột phải là `Tabs`.
- **Component làm lại:**
  - `RoomHeader`: tên phòng, mã phòng bấm để copy link, nhật ký, rời phòng.
  - `NowPlaying`: phiếu bài, lời chúc, `TuningDial`, bỏ phiếu / tạm dừng / bỏ qua.
  - `ReactionBar`.
  - `QueueList`: **chia nhóm theo lượt**, ghim ở đầu, hành động gọn trong menu của dòng trên điện thoại.
  - `AddTrack`: ô tìm/dán link lớn, kết quả có ảnh `mqdefault`.
  - `People`: chấm trạng thái, huy hiệu, menu quyền dạng sheet.
  - `Chat`, `DjPads` (lưới nút như pad DJ), `Settings` (admin), `Banners`.
  - Dialog: `JoinDialog`, `ActivityLog`, `WishSheet` (phiếu lời chúc với 6 giọng đọc).
- `next/dynamic` cho các dialog, `Settings`, `DjPads` và `PlayerEngine` (chỉ tải khi cần) (P10).
- `HeartCanvas` viết lại (P5): vòng lặp chỉ chạy khi có hạt, tự dừng khi hết, xử lý DPR, giới hạn 120 hạt.

### Bước 7: Màn hình máy phát `/r/[code]/host`

- Bố cục toàn màn hình như mục 2:
  - Video YouTube luôn hiện, tối thiểu 200×200 theo chính sách YouTube.
  - Tên bài cỡ 44 px, `TuningDial` cỡ lớn, đèn ON AIR.
  - Phiếu QR kèm mã phòng; "Tiếp theo" 3 bài.
- Các trạng thái: chưa nhập PIN, chờ bấm "Bắt đầu phát", bị thay thế hoặc bị chuyển quyền, hàng chờ trống.
- **Âm thanh DJ (P9):**
  - Chuyển `applause.wav` sang `.m4a` bằng `afconvert` có sẵn trên macOS.
  - Nạp sẵn 7 file vào bộ đệm `Audio` sau khi bấm "Bắt đầu phát", dùng lại thay vì `new Audio()` mỗi lần.
- Nền: màu `dial` tĩnh cộng một vệt màu lấy từ ảnh bìa bằng CSS (không blur động) (P3).

### Bước 8: Tinh chỉnh và đo lại

- `Thumb`: tự đổi URL `hqdefault` thành `mqdefault`/`default` theo cỡ hiển thị (P8).
- Đo lại bảng ở mục 3 (script gzip trên `.next/static/chunks`).
- Chụp màn hình ở 375, 768 và 1440 px cho trang chủ, phòng (3 tab), dialog và máy phát. Tự soát lại và sửa.
- Thử tay trên LAN: tạo phòng, vào bằng điện thoại, thêm bài, tim, lời chúc, bỏ phiếu, DJ, kick, mất mạng rồi kết nối lại.
- **Chạy local** (`http://10.95.60.47:3000`) để bạn kiểm tra trước khi commit.

### Bước 9: Bàn giao

- Báo cáo trước/sau (số liệu mục 3 và ảnh chụp).
- Sau khi bạn duyệt: commit, mở PR client `feat/redesign` và PR server `chore/contracts-constants` vào `develop`.

---

## 5. Rủi ro

| Rủi ro | Cách giảm |
|---|---|
| Không còn test tự động, làm lại state có thể làm hỏng luồng realtime | Giữ nguyên logic socket trong store, chỉ đổi cách phát dữ liệu ra React. Thử tay đủ danh sách luồng ở bước 8 |
| Validator client lệch với Zod của server | Validator chỉ dùng để bật/tắt nút; server vẫn từ chối dữ liệu sai và giao diện hiện đúng thông báo lỗi |
| `<dialog>` trên Safari iOS cũ | `showModal` được hỗ trợ từ iOS 15.4; văn phòng dùng máy mới |
| Font tiếng Việt hiển thị lỗi | Cả hai font đều có subset `vietnamese`; kiểm tra bằng chuỗi có đủ dấu (ạ, ỗ, ữ, đ) |

---

## 6. Kết quả (2026-10-14)

Đo bằng `next build` (Turbopack), gzip mức 6, so với `origin/develop` tại `d85b0c0`.

| Chỉ số | Trước | Sau |
|---|---|---|
| JS client (gzip, mọi chunk) | 363 KB | **247 KB** (−32%) |
| JS tải ban đầu của trang chủ | 316 KB | **188 KB** (−40%) |
| Zod / `framer-motion` trong bundle | Có / có | **Không / không** (đã gỡ khỏi `package.json`) |
| Khung `requestAnimationFrame` khi không có reaction (2 giây) | Luôn chạy, ~60 khung/giây (theo code, không đo) | **0**. Một lần thả tim: ~90 khung rồi tự dừng |
| Render khi gửi 3 tin nhắn chat | Toàn trang, cộng `NowPlaying` 2 lần/giây (theo code) | `ChatPanel` 18 (dev StrictMode), **`QueueList` 0, `NowPlayingCard` 0** |
| `public/sounds` | 2,3 MB | **412 KB** (AAC 96 kbps; 2 file horn giữ mp3 vì đã nhỏ) |

- Mục tiêu "≤ 230 KB" cho tổng JS chưa đạt: còn 247 KB. Phần còn lại chủ yếu là React DOM và runtime của Next (~140 KB); code của app đã nhỏ.
- **Đã thử tay** trên dev LAN (Playwright Chromium, 390 / 768 / 1440 px):
  - tạo phòng, vào phòng bằng tên;
  - thêm bài bằng link;
  - hàng chờ chia theo lượt;
  - tim, menu của dòng, lời chúc;
  - chat, nhật ký, Esc đóng dialog và trả focus, phím mũi tên chuyển tab;
  - mất mạng rồi kết nối lại;
  - nhận quyền quản trị bằng PIN, mời ra khỏi phòng;
  - màn hình máy phát (PIN, QR, tiếp theo, mặt số lớn).
- **Lỗi có sẵn từ trước đã sửa:** `setVolume` gọi vào trình phát YouTube đã bị huỷ làm crash effect trên trang máy phát.
- **Video bị bỏ qua với mã 150:** các video của hãng đĩa (Vevo…) chặn nhúng. Đây là hành vi đúng có từ trước, không phải lỗi giao diện.

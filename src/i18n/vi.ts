// Every user-facing string lives here (requirements §2.6–2.7). Add `en.ts` with the
// same shape to translate later.
import type { ErrorCode, ErrorParams, VoicePreset } from '@/contracts';
import { formatDuration } from '@/lib/time';

export type ClientErrorCode = ErrorCode | 'NETWORK';

export const vi = {
  appName: 'Music Room',
  appTagline: 'Cả văn phòng cùng chọn nhạc, phát chung một loa.',

  home: {
    tabCreate: 'Tạo phòng',
    tabJoin: 'Vào phòng',
    yourName: 'Tên của bạn',
    yourNamePlaceholder: 'Ví dụ: Minh Anh',
    roomName: 'Tên phòng',
    roomNamePlaceholder: 'Ví dụ: Phòng Dev tầng 3',
    pin: 'Mã PIN quản trị',
    pinPlaceholder: '4–8 chữ số',
    setupPassword: 'Mật khẩu cài đặt',
    roomCode: 'Mã phòng',
    roomCodePlaceholder: 'VD: K7M2QX',
    create: 'Tạo phòng',
    join: 'Vào phòng',
    hintName: 'Tên dài 1–30 ký tự',
    hintRoomName: 'Tên phòng dài 1–50 ký tự',
    hintPin: 'PIN gồm 4–8 chữ số',
    hintCode: 'Mã phòng gồm 6 ký tự',
    hintSetupPassword: 'Nhập mật khẩu cài đặt do người quản lý máy chủ cung cấp',
    pinNote: 'Dùng PIN này để mở trang máy phát và nhận lại quyền quản trị.',
  },

  joinDialog: {
    title: (room: string) => `Vào phòng ${room}`,
    loading: 'Đang tìm phòng…',
    submit: 'Vào phòng',
    backHome: 'Về trang chủ',
  },

  tabs: { room: 'Phòng', add: 'Thêm bài', people: 'Mọi người' },

  header: {
    share: 'Chia sẻ',
    shared: 'Đã sao chép link phòng',
    leave: 'Rời phòng',
    log: 'Nhật ký',
    code: 'Mã phòng',
  },

  nowPlaying: {
    title: 'Đang phát',
    idle: 'Chưa có bài nào. Vào tab Thêm bài để chọn nhạc nhé!',
    addedBy: (name: string) => `${name} thêm`,
    fallback: 'Playlist dự phòng',
    unknownDuration: 'Không rõ thời lượng',
    voteSkip: (votes: number, required: number) => `Bỏ qua (${votes}/${required})`,
    voted: 'Đã bỏ phiếu',
    skipNow: 'Bỏ qua ngay',
    pause: 'Tạm dừng',
    play: 'Phát',
    paused: 'Đang tạm dừng',
  },

  queue: {
    title: 'Hàng chờ',
    empty: 'Hàng chờ trống. Vào tab Thêm bài để chọn nhạc nhé!',
    byline: (name: string, round: number) => `${name} · vòng ${round}`,
    pinnedBadge: 'Ghim',
    heart: 'Thả tim',
    unheart: 'Bỏ tim',
    pin: 'Phát tiếp theo',
    unpin: 'Bỏ ghim',
    wish: 'Gửi lời chúc',
    remove: 'Xóa bài',
    you: 'bạn',
  },

  add: {
    placeholder: 'Tìm bài hát hoặc dán link YouTube',
    search: 'Tìm',
    addLink: 'Thêm vào hàng chờ',
    addResult: 'Thêm',
    added: (title: string) => `Đã thêm "${title}" vào hàng chờ`,
    noResults: 'Không tìm thấy bài nào. Thử từ khóa khác hoặc dán link YouTube.',
    searchOff: 'Tìm kiếm đang tắt trên máy chủ này — hãy dán link YouTube.',
    tip: 'Dán link YouTube (youtube.com/watch?v=…, youtu.be/…) hoặc gõ tên bài để tìm.',
  },

  wish: {
    title: 'Gửi lời chúc',
    placeholder: 'Ví dụ: Chúc mừng sinh nhật nhé!',
    voice: 'Chọn giọng đọc',
    save: 'Lưu lời chúc',
    clear: 'Xóa lời chúc',
    cancel: 'Hủy',
    note: 'Lời chúc được đọc trên loa ngay trước khi bài của bạn phát.',
    voices: {
      radio: 'MC đài',
      drama: 'Kịch tính',
      baby: 'Em bé',
      panic: 'Hoảng hốt',
      chipmunk: 'Sóc chuột',
      sleepy: 'Buồn ngủ',
    } satisfies Record<VoicePreset, string>,
  },

  people: {
    title: 'Mọi người',
    online: 'đang online',
    you: '(bạn)',
    badges: {
      admin: 'Quản trị',
      player: 'Máy phát',
      control: 'Điều khiển',
      dj: 'DJ',
    },
    menu: 'Tùy chọn',
    grantControl: 'Cấp quyền điều khiển',
    revokeControl: 'Bỏ quyền điều khiển',
    grantDj: 'Cấp quyền DJ',
    revokeDj: 'Bỏ quyền DJ',
    makePlayer: 'Đặt làm máy phát',
    grantAdmin: 'Cấp quyền quản trị',
    revokeAdmin: 'Bỏ quyền quản trị',
    kick: 'Mời ra khỏi phòng',
    kickConfirm: (name: string) => `Mời ${name} ra khỏi phòng?`,
    kickYes: 'Mời ra',
    cancel: 'Hủy',
    claimAdmin: 'Nhận quyền quản trị',
    claimTitle: 'Nhập mã PIN quản trị',
    claimSubmit: 'Xác nhận',
  },

  settings: {
    title: 'Cài đặt phòng',
    skipThreshold: 'Tỉ lệ phiếu để bỏ qua (%)',
    maxQueued: 'Số bài tối đa mỗi người',
    maxDuration: 'Độ dài tối đa mỗi bài (phút, 0 = không giới hạn)',
    fallback: 'Playlist dự phòng (link YouTube)',
    fallbackHint: 'Phát khi hàng chờ trống. Cần máy chủ có YOUTUBE_API_KEY.',
    allowGuestDj: 'Cho thành viên mới dùng DJ',
    save: 'Lưu cài đặt',
    saved: 'Đã lưu cài đặt phòng',
    errThreshold: 'Nhập từ 10 đến 100',
    errQueued: 'Nhập số nguyên từ 1 đến 20',
    errDuration: 'Nhập 0 hoặc số phút nguyên từ 1 đến 120',
    errFallback: 'Cần link dạng youtube.com/playlist?list=…',
  },

  chat: {
    title: 'Trò chuyện',
    placeholder: 'Nhắn gì đó…',
    send: 'Gửi',
    empty: 'Chưa có tin nhắn nào.',
  },

  dj: { title: 'DJ Soundboard' },

  log: { title: 'Nhật ký hoạt động', empty: 'Chưa có hoạt động nào.', close: 'Đóng' },

  host: {
    title: 'Màn hình máy phát',
    pin: 'Mã PIN quản trị',
    open: 'Mở máy phát',
    start: '▶ Bắt đầu phát',
    startNote: 'Trình duyệt cần một lần bấm để cho phép phát nhạc.',
    scan: 'Quét để thêm bài',
    code: (code: string) => `Mã phòng: ${code}`,
    next: 'Tiếp theo',
    idle: 'Đang chờ bài… Quét mã QR để thêm bài.',
    replaced: 'Máy phát đã được mở ở thiết bị khác. Trang này đã dừng phát.',
    movedByAdmin: 'Quản trị viên đã chuyển quyền phát sang thiết bị khác. Trang này đã dừng phát.',
    takeBack: 'Phát ở máy này',
    volume: 'Âm lượng',
    thisDevicePlays: 'Máy này đang phát nhạc cho cả phòng',
  },

  banners: {
    reconnecting: 'Đang kết nối lại…',
    newVersion: 'Có phiên bản mới. Hãy tải lại trang.',
    reload: 'Tải lại',
    playerOffline: 'Máy phát đang mất kết nối. Hàng chờ vẫn nhận bài mới.',
    noPlayer: (url: string) => `Chưa có máy phát. Mở trang máy phát trên máy nối loa: ${url}`,
    kicked: 'Bạn đã được mời ra khỏi phòng.',
  },
} as const;

const ERRORS: Record<ClientErrorCode, (p: ErrorParams) => string> = {
  UNAUTHENTICATED: () => 'Phiên của bạn đã hết hạn. Hãy nhập tên để vào lại phòng.',
  FORBIDDEN: () => 'Bạn không có quyền làm việc này. Hãy nhờ quản trị viên cấp quyền.',
  VALIDATION: () => 'Dữ liệu chưa hợp lệ. Hãy kiểm tra lại rồi thử lại.',
  ROOM_NOT_FOUND: () => 'Không tìm thấy phòng. Hãy kiểm tra lại mã phòng.',
  NAME_TAKEN: () => 'Tên này đã có người dùng trong phòng. Hãy chọn tên khác.',
  PIN_INVALID: (p) => `Mã PIN không đúng. Bạn còn ${p.remaining} lần thử.`,
  PIN_LOCKED: (p) =>
    `Bạn đã nhập sai PIN quá nhiều lần. Hãy thử lại sau ${p.minutes} phút.`,
  SETUP_PASSWORD_INVALID: () =>
    'Mật khẩu cài đặt không đúng. Hãy hỏi người quản lý máy chủ.',
  QUEUE_LIMIT: (p) =>
    `Bạn đã có ${p.max} bài đang chờ. Hãy đợi bài của bạn phát rồi thêm tiếp.`,
  TRACK_TOO_LONG: (p) =>
    `Bài này dài ${formatDuration(Number(p.duration))}, vượt giới hạn ${formatDuration(
      Number(p.max),
    )} của phòng. Hãy chọn bài ngắn hơn.`,
  TRACK_NOT_EMBEDDABLE: () => 'Video này không cho phát ngoài YouTube. Hãy chọn bản khác.',
  TRACK_NOT_FOUND: () => 'Không tìm thấy video. Có thể video đã bị xóa hoặc để riêng tư.',
  TRACK_LIVE: () => 'Không thể thêm video đang phát trực tiếp. Hãy chọn video thường.',
  LINK_UNSUPPORTED: () =>
    'Không nhận ra link YouTube này. Hãy dán link dạng youtube.com/watch?v=… hoặc youtu.be/…',
  SEARCH_UNAVAILABLE: () => 'Máy chủ chưa bật tìm kiếm. Hãy dán link YouTube để thêm bài.',
  QUOTA_EXCEEDED: () => 'Hôm nay đã hết lượt tìm kiếm. Hãy dán link YouTube để thêm bài.',
  RATE_LIMITED: (p) => `Bạn thao tác hơi nhanh. Hãy thử lại sau ${p.seconds} giây.`,
  STALE_ITEM: () => 'Bài này vừa thay đổi. Danh sách đã được cập nhật.',
  INTERNAL: () => 'Máy chủ đang gặp sự cố. Hãy thử lại sau ít phút.',
  NETWORK: () => 'Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.',
};

/** Error code (+ params from the server) → exact Vietnamese message (requirements §2.6). */
export function errorMessage(code: ClientErrorCode, params: ErrorParams = {}): string {
  return (ERRORS[code] ?? ERRORS.INTERNAL)(params);
}

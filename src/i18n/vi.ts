// Every user-facing string lives here (requirements §2.6–2.7). Add `en.ts` with the
// same shape to translate later.
import type { DjSound, ErrorCode, ErrorParams, VoicePreset } from '@/contracts';
import { formatDuration } from '@/lib/time';

export type ClientErrorCode = ErrorCode | 'NETWORK';

export const vi = {
  appName: 'Music Room',
  appTagline: 'Mỗi người góp bài từ điện thoại, máy tính nối loa phát lần lượt, ai cũng có lượt của mình.',

  home: {
    headline: 'Cả phòng chọn nhạc, một loa phát.',
    tabCreate: 'Tạo phòng',
    tabJoin: 'Vào phòng',
    yourName: 'Tên của bạn',
    yourNamePlaceholder: 'Minh Anh',
    roomName: 'Tên phòng',
    roomNamePlaceholder: 'Phòng Dev tầng 3',
    roomCode: 'Mã phòng',
    roomCodePlaceholder: 'K7M2QX',
    create: 'Tạo phòng',
    join: 'Vào phòng',
    hintName: 'Tên dài 1–30 ký tự',
    hintRoomName: 'Tên phòng dài 1–50 ký tự',
    hintCode: 'Mã phòng gồm 6 ký tự',
    steps: [
      'Tạo phòng, mở trang máy phát trên máy tính nối loa',
      'Mọi người quét mã QR trên màn hình để vào phòng',
      'Ai cũng thêm bài, loa phát lần lượt từng người',
    ],
  },

  joinDialog: {
    title: (room: string) => `Vào phòng ${room}`,
    loading: 'Đang tìm phòng…',
    submit: 'Vào phòng',
    backHome: 'Về trang chủ',
  },

  tabs: { label: 'Điều hướng phòng', room: 'Phòng', add: 'Thêm bài', people: 'Mọi người' },

  header: {
    copyLink: 'Sao chép link phòng',
    copied: 'Đã sao chép link phòng',
    leave: 'Rời phòng',
    log: 'Nhật ký hoạt động',
    code: 'Mã phòng',
  },

  nowPlaying: {
    title: 'Đang phát',
    live: 'Đang phát',
    paused: 'Tạm dừng',
    idleTitle: 'Loa đang chờ bài',
    idle: 'Thêm bài đầu tiên, loa sẽ phát ngay.',
    pickedBy: (name: string) => `${name} chọn`,
    fallback: 'Playlist dự phòng',
    unknownDuration: 'Không rõ thời lượng',
    wishFrom: (name: string) => `Lời chúc từ ${name}`,
    voteSkip: (votes: number, required: number) => `Bỏ qua ${votes}/${required}`,
    voted: (votes: number, required: number) => `Đã bỏ phiếu ${votes}/${required}`,
    skipNow: 'Chuyển bài',
    pause: 'Tạm dừng',
    play: 'Phát',
  },

  queue: {
    title: 'Tiếp theo',
    empty: 'Chưa có bài nào trong hàng chờ.',
    addFirst: 'Thêm bài',
    pinnedGroup: 'Phát tiếp theo',
    round: (n: number) => `Lượt ${n}`,
    you: 'bạn',
    heart: 'Thả tim',
    unheart: 'Bỏ tim',
    hearts: (n: number) => `${n} tim`,
    hasWish: 'Có lời chúc',
    actions: (title: string) => `Tùy chọn cho ${title}`,
    pin: 'Phát tiếp theo',
    unpin: 'Bỏ ghim',
    wish: 'Gửi lời chúc',
    editWish: 'Sửa lời chúc',
    remove: 'Xóa khỏi hàng chờ',
  },

  add: {
    title: 'Thêm bài',
    label: 'Tìm bài hoặc dán link YouTube',
    placeholder: 'Tên bài, ca sĩ hoặc link YouTube',
    search: 'Tìm',
    addLink: 'Thêm',
    addResult: 'Thêm',
    adding: 'Đang thêm…',
    added: (title: string) => `Đã thêm "${title}" vào hàng chờ`,
    noResults: 'Không tìm thấy bài nào. Thử từ khóa khác hoặc dán link YouTube.',
    searchOff: 'Máy chủ chưa bật tìm kiếm, hãy dán link YouTube (youtube.com/watch?v=… hoặc youtu.be/…).',
    tip: 'Gõ tên bài để tìm, hoặc dán link YouTube để thêm ngay.',
    results: 'Kết quả tìm kiếm',
  },

  wish: {
    title: 'Gửi lời chúc',
    placeholder: 'Chúc mừng sinh nhật Lan nhé!',
    label: 'Lời chúc',
    voice: 'Giọng đọc',
    save: 'Lưu lời chúc',
    clear: 'Xóa lời chúc',
    note: 'Loa đọc lời chúc ngay trước khi bài của bạn phát.',
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
    online: (n: number) => `${n} đang online`,
    you: '(bạn)',
    badges: {
      admin: 'Quản trị',
      player: 'Máy phát',
      control: 'Điều khiển',
      dj: 'DJ',
    },
    menu: (name: string) => `Quyền của ${name}`,
    grantControl: 'Cho điều khiển phát nhạc',
    revokeControl: 'Bỏ quyền điều khiển',
    grantDj: 'Cho dùng DJ',
    revokeDj: 'Bỏ quyền DJ',
    makePlayer: 'Đặt làm máy phát',
    grantAdmin: 'Cấp quyền quản trị',
    revokeAdmin: 'Bỏ quyền quản trị',
    kick: 'Mời ra khỏi phòng',
    kickConfirm: (name: string) => `Mời ${name} ra khỏi phòng?`,
    kickNote: 'Người này có thể vào lại bằng mã phòng.',
    kickYes: 'Mời ra',
    cancel: 'Hủy',
  },

  settings: {
    title: 'Cài đặt phòng',
    skipThreshold: 'Tỉ lệ phiếu để bỏ qua (%)',
    maxQueued: 'Số bài chờ tối đa mỗi người',
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
    label: 'Tin nhắn',
    placeholder: 'Nhắn cho cả phòng…',
    send: 'Gửi',
    empty: 'Chưa có tin nhắn nào. Chào cả phòng một câu?',
    open: 'Mở trò chuyện',
    minimize: 'Thu nhỏ trò chuyện',
    unread: (n: number) => `${n} tin mới`,
    hostEmpty: 'Tin nhắn của mọi người sẽ hiện ở đây.',
    you: 'Bạn',
    reactions: 'Thả cảm xúc lên màn hình của cả phòng',
    react: (emoji: string) => `Thả ${emoji}`,
    djToggle: 'Bàn DJ',
  },

  dj: {
    title: 'Bàn DJ',
    note: 'Phát trên loa của phòng',
    sounds: {
      build: 'Dồn nhịp',
      drop: 'Drop',
      clap: 'Vỗ tay',
      horn: 'Kèn',
      airhorn: 'Còi hơi',
      laugh: 'Cười',
      applause: 'Hoan hô',
    } satisfies Record<DjSound, string>,
  },

  log: { title: 'Nhật ký hoạt động', empty: 'Chưa có hoạt động nào.', close: 'Đóng' },

  host: {
    opening: 'Đang mở máy phát…',
    retry: 'Thử lại',
    pin: 'Mã PIN quản trị',
    start: 'Bắt đầu phát',
    startNote: 'Trình duyệt cần một lần bấm để cho phép phát nhạc.',
    scan: 'Quét để chọn bài',
    onAir: 'ON AIR',
    waiting: 'Chờ bài',
    volumeValue: (v: number) => `${v}%`,
    next: 'Tiếp theo',
    nextEmpty: 'Chưa có bài tiếp theo',
    idle: 'Đang chờ bài. Quét mã QR để thêm bài.',
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

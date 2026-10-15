import type { Metadata } from 'next';
import { CONTACT_EMAIL, LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Điều khoản sử dụng | Music Room' };

export default function TermsPage() {
  return (
    <LegalPage title="Điều khoản sử dụng">
      <p>
        Music Room là công cụ miễn phí để một nhóm cùng chọn nhạc phát trên một loa chung. Khi dùng Music Room, bạn đồng ý với các
        điều khoản dưới đây.
      </p>

      <h2>YouTube</h2>
      <p>
        Nhạc được phát qua trình phát nhúng của YouTube và YouTube API Services. Khi dùng Music Room, bạn đồng ý tuân theo{' '}
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
          Điều khoản dịch vụ của YouTube
        </a>
        . Music Room không lưu trữ hay phân phối lại nội dung âm thanh, video; bản quyền nội dung thuộc về chủ sở hữu trên YouTube.
      </p>

      <h2>Sử dụng hợp lý</h2>
      <ul>
        <li>Dùng tên, lời chúc và tin nhắn phù hợp nơi làm việc. Lời chúc sẽ được đọc to qua loa; nội dung không phù hợp sẽ bị chặn.</li>
        <li>Không tìm cách phá hoạt động của phòng, dò mã PIN, hay gửi yêu cầu tự động hàng loạt.</li>
        <li>Quản trị viên của phòng có thể đổi quyền, xoá bài hoặc mời người khác ra khỏi phòng.</li>
      </ul>

      <h2>Tài khoản</h2>
      <p>
        Đăng nhập Google là không bắt buộc. Bạn chịu trách nhiệm với thiết bị và tài khoản của mình; có thể đăng xuất hoặc thu hồi
        quyền của Music Room bất cứ lúc nào. Cách chúng tôi xử lý dữ liệu được mô tả ở <a href="/privacy">Chính sách quyền riêng tư</a>.
      </p>

      <h2>Không bảo đảm</h2>
      <p>
        Music Room được cung cấp nguyên trạng, miễn phí, chạy trên các dịch vụ có gói miễn phí và có thể gián đoạn, thay đổi tính
        năng hoặc ngừng hoạt động mà không báo trước. Lời bài hát, gợi ý bài và nội dung do AI tạo có thể chưa chính xác.
      </p>

      <h2>Liên hệ</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>

      <h2>English summary</h2>
      <p>
        Music Room is a free tool for a group to pick music for one shared speaker. Music is played through YouTube’s embedded
        player and YouTube API Services; by using Music Room you agree to be bound by the{' '}
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
          YouTube Terms of Service
        </a>
        . Keep names, wishes and chat appropriate for a workplace; do not abuse rooms or automate requests. Signing in with Google
        is optional; see the <a href="/privacy">Privacy Policy</a>. The service is provided as is, without warranty, and may change
        or stop at any time. Contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}

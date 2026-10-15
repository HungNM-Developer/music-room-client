import type { Metadata } from 'next';
import { CONTACT_EMAIL, LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Chính sách quyền riêng tư | Music Room' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Chính sách quyền riêng tư">
      <p>
        Music Room là ứng dụng nghe nhạc chung cho văn phòng: mọi người thêm bài YouTube vào một hàng chờ, một máy tính nối loa
        phát lần lượt. Trang này nói rõ ứng dụng lưu gì, dùng vào việc gì và bạn có thể làm gì với dữ liệu của mình.
      </p>

      <h2>Dữ liệu chúng tôi lưu</h2>
      <ul>
        <li>
          <strong>Khi vào phòng như khách:</strong> tên hiển thị bạn nhập, các bài bạn thêm, tim, phiếu bỏ qua, lời chúc và tin
          nhắn trò chuyện trong phòng. Trình duyệt của bạn giữ một mã phiên để bạn vào lại đúng mình.
        </li>
        <li>
          <strong>Khi đăng nhập bằng Google (không bắt buộc):</strong> mã tài khoản Google, email, tên và ảnh đại diện mà Google
          cung cấp; bài yêu thích, playlist và các phòng bạn sở hữu hoặc đã tham gia. Chúng tôi không nhận và không lưu mật khẩu
          Google của bạn.
        </li>
        <li>
          <strong>Thông tin bài hát:</strong> tên, kênh, thời lượng và ảnh của video YouTube; tên nghệ sĩ và tên bài được tách ra
          từ tiêu đề.
        </li>
        <li>
          <strong>Nhật ký kỹ thuật:</strong> địa chỉ IP được dùng tạm thời để chống lạm dụng (giới hạn số lần thao tác, khoá khi
          nhập sai mã PIN) và không được lưu lâu dài.
        </li>
      </ul>

      <h2>Dữ liệu YouTube (YouTube API Services)</h2>
      <p>
        Music Room dùng YouTube API Services để tìm bài, lấy thông tin video và phát video bằng trình phát nhúng của YouTube. Khi
        dùng Music Room, bạn đồng thời chịu{' '}
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
          Điều khoản dịch vụ của YouTube
        </a>{' '}
        và{' '}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          Chính sách quyền riêng tư của Google
        </a>
        .
      </p>
      <ul>
        <li>
          <strong>Nhập từ YouTube:</strong> chỉ khi bạn bấm nút này, ứng dụng xin quyền <em>chỉ đọc</em> (youtube.readonly) để
          liệt kê playlist và video đã thích của bạn, rồi chép những bài bạn chọn thành playlist trong Music Room. Quyền truy cập
          chỉ được dùng trong lần nhập đó, không được lưu trên máy chủ và được thu hồi ngay khi bạn đóng hộp nhập.
        </li>
        <li>Ứng dụng không đăng, không sửa và không xoá bất cứ thứ gì trên tài khoản YouTube của bạn.</li>
        <li>
          Thông tin video lấy từ YouTube được làm mới hoặc xoá trong vòng 30 ngày, đúng chính sách dành cho nhà phát triển của
          YouTube.
        </li>
        <li>
          Bạn có thể thu hồi quyền của Music Room bất cứ lúc nào tại{' '}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
            trang quyền truy cập của tài khoản Google
          </a>
          .
        </li>
      </ul>

      <h2>Cam kết sử dụng giới hạn dữ liệu Google</h2>
      <p>
        Việc Music Room sử dụng và chuyển giao thông tin nhận được từ Google API tuân theo{' '}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
          Chính sách dữ liệu người dùng của Google API Services
        </a>
        , bao gồm các yêu cầu Sử dụng giới hạn (Limited Use). Dữ liệu từ tài khoản Google / YouTube của bạn chỉ dùng để cung cấp
        các tính năng bạn thấy trong ứng dụng; không dùng để quảng cáo, không bán, không cho người khác đọc và không dùng để phát
        triển, cải thiện hay huấn luyện mô hình AI. Khi chuẩn hoá tên bài, chỉ tiêu đề video công khai (không kèm thông tin nào về
        bạn) được gửi tới nhà cung cấp AI.
      </p>

      <h2>Chúng tôi dùng dữ liệu để làm gì</h2>
      <ul>
        <li>Vận hành phòng nhạc: hàng chờ công bằng, quyền quản trị, trò chuyện, máy phát.</li>
        <li>Thư viện của phòng, bài yêu thích, playlist, tổng kết và gợi ý bài theo gu của phòng hoặc của bạn.</li>
        <li>Không bán dữ liệu, không dùng để quảng cáo, không chia sẻ với bên thứ ba ngoài các dịch vụ dưới đây.</li>
      </ul>

      <h2>Dịch vụ bên ngoài nhận một phần dữ liệu</h2>
      <ul>
        <li>
          <strong>Google / YouTube:</strong> đăng nhập, tìm và phát video.
        </li>
        <li>
          <strong>Last.fm:</strong> tên nghệ sĩ và tên bài, để tìm bài và nghệ sĩ tương tự.
        </li>
        <li>
          <strong>LRCLIB:</strong> tên nghệ sĩ và tên bài, để lấy lời bài hát.
        </li>
        <li>
          <strong>Nhà cung cấp AI (Google Gemini, Groq, OpenRouter):</strong> tiêu đề bài hát, yêu cầu gửi cho “Hỏi DJ”, lời chúc
          (để kiểm tra trước khi đọc to) và số liệu tổng kết của phòng. Không gửi email, thông tin tài khoản hay tên của bất kỳ ai:
          tên người chọn bài được thay bằng ký hiệu, máy chủ tự điền lại tên sau khi AI trả lời.
        </li>
        <li>
          <strong>Hạ tầng:</strong> Vercel (giao diện web), Render (máy chủ) và Neon (cơ sở dữ liệu, đặt tại Singapore).
        </li>
      </ul>

      <h2>Lưu giữ và xoá dữ liệu</h2>
      <ul>
        <li>Mỗi phòng giữ 200 tin nhắn gần nhất; tin cũ hơn tự xoá.</li>
        <li>Bấm “Rời phòng” để ẩn tên bạn khỏi phòng và vô hiệu mã phiên của bạn.</li>
        <li>Bạn có thể xoá playlist và bỏ bài yêu thích bất cứ lúc nào trong ứng dụng.</li>
        <li>
          Muốn xoá tài khoản cùng toàn bộ dữ liệu gắn với nó, hãy gửi email tới <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{' '}
          từ email của tài khoản đó; chúng tôi xử lý trong vòng 30 ngày.
        </li>
      </ul>

      <h2>Liên hệ</h2>
      <p>
        Mọi câu hỏi về quyền riêng tư: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>English summary</h2>
      <p>
        Music Room is a shared office music app. It stores the display name you type, your room activity (songs added, hearts,
        skip votes, wishes, chat) and, if you choose to sign in with Google, your Google account id, email, name and picture plus
        your favourites and playlists. It uses YouTube API Services: by using Music Room you agree to the{' '}
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
          YouTube Terms of Service
        </a>{' '}
        and the{' '}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          Google Privacy Policy
        </a>
        . The optional “Import from YouTube” feature requests read-only access (youtube.readonly) only when you press it, uses the
        token for that import only, never stores it, and revokes it when the dialog closes; nothing is ever posted or changed on
        your YouTube account. You can revoke access at{' '}
        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
          myaccount.google.com/permissions
        </a>
        . YouTube data is refreshed or deleted within 30 days. Song titles and artist names are sent to Last.fm, LRCLIB and AI
        providers to suggest songs, fetch lyrics and moderate wishes; people’s names are never sent to AI providers (they are
        replaced by placeholders and filled back in on our server). Music Room’s use and transfer to any other app of information
        received from Google APIs will adhere to the{' '}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. Google user data is never used for advertising, never sold, never read by
        people, and never used to develop, improve or train AI or machine-learning models; only public YouTube video titles, never
        linked to you, are sent to AI providers to normalise song names. To delete your account and its data, email{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}

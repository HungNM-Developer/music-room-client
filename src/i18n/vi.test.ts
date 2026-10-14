import { describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@/contracts';
import { errorMessage } from './vi';

describe('errorMessage (requirements §2.6)', () => {
  it('has a message for every server error code', () => {
    for (const code of ERROR_CODES) expect(errorMessage(code).length).toBeGreaterThan(10);
  });
  it('fills parameters verbatim', () => {
    expect(errorMessage('PIN_INVALID', { remaining: 4 })).toBe('Mã PIN không đúng. Bạn còn 4 lần thử.');
    expect(errorMessage('QUEUE_LIMIT', { max: 4 })).toBe(
      'Bạn đã có 4 bài đang chờ. Hãy đợi bài của bạn phát rồi thêm tiếp.',
    );
    expect(errorMessage('TRACK_TOO_LONG', { duration: 601, max: 600 })).toBe(
      'Bài này dài 10:01, vượt giới hạn 10:00 của phòng. Hãy chọn bài ngắn hơn.',
    );
    expect(errorMessage('NETWORK')).toBe('Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.');
  });
});

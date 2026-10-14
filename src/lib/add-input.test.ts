import { describe, expect, it } from 'vitest';
import { classifyInput } from './add-input';

describe('classifyInput (TC-148)', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['https://youtu.be/dQw4w9WgXcQ', 'link'],
    ['youtube.com/watch?v=dQw4w9WgXcQ', 'link'],
    ['dQw4w9WgXcQ', 'link'],
    ['https://vimeo.com/1', 'link'],
    ['lac troi', 'query'],
    ['Sơn Tùng M-TP', 'query'],
    ['hello_world', 'query'],
  ])('%s → %s', (input, kind) => expect(classifyInput(input)).toBe(kind));
});

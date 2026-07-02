import { slugFromTitleNoSpaces } from './forum-slug';
import { forumEntrySlugFieldSchema } from '../schemas/forum.schema';

test('slugFromTitleNoSpaces normalizes and strips non-alphanumeric', () => {
  expect(slugFromTitleNoSpaces('  RFC: Caché  ', 40)).toBe('rfccache');
  expect(slugFromTitleNoSpaces('a', 5)).toBe('a');
});

test('forumEntrySlugFieldSchema accepts lowercase hyphenated slugs', () => {
  expect(forumEntrySlugFieldSchema.safeParse('rfc-distributed-cache').success).toBe(true);
  expect(forumEntrySlugFieldSchema.safeParse('RFC').success).toBe(false);
});

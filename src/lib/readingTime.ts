/** Words per minute for technical prose. Deliberately conservative: these
 *  posts carry code, which is read slower than the surrounding text. */
const WPM = 200;

/** Estimated reading time in whole minutes, never less than one. */
export function readingTime(markdown: string): number {
  const prose = markdown
    .replace(/^---[\s\S]*?---/, '')      // frontmatter
    .replace(/```[\s\S]*?```/g, ' ')     // fenced code
    .replace(/`[^`]*`/g, ' ')            // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'); // links keep their text

  const words = prose.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WPM));
}

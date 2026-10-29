/* Code 128 (sets B and C) as bar widths – drawn as SVG, readable by every hand scanner and by the camera scan. */

const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];
const START_B = 104;
const START_C = 105;
const STOP = 106;

/** Characters Code 128 B can hold. */
export const validCode128 = (s: string) => s.length > 0 && s.length <= 48 && /^[\x20-\x7e]+$/.test(s);

/** Symbol values incl. start, checksum and stop. Even digit strings use set C (half as wide). */
export function encode128(text: string): number[] {
  if (!validCode128(text)) throw new Error("Barcode darf nur Buchstaben, Ziffern und Satzzeichen enthalten (max. 48 Zeichen).");
  const c = /^\d+$/.test(text) && text.length % 2 === 0 && text.length >= 4;
  const values = c ? text.match(/\d\d/g)!.map(Number) : [...text].map((ch) => ch.charCodeAt(0) - 32);
  const start = c ? START_C : START_B;
  const check = values.reduce((sum, v, i) => sum + v * (i + 1), start) % 103;
  return [start, ...values, check, STOP];
}

/** Bars as [x, width] in modules, plus the total width (with 10-module quiet zones). */
export function bars128(text: string) {
  const out: [number, number][] = [];
  let x = 10;
  for (const v of encode128(text)) {
    const p = PATTERNS[v];
    for (let i = 0; i < p.length; i++) {
      const w = Number(p[i]);
      if (i % 2 === 0) out.push([x, w]);
      x += w;
    }
  }
  return { bars: out, width: x + 10 };
}

/** Complete SVG document of a label: bars and the plain text below. */
export function svg128(text: string, opts: { height?: number; module?: number; caption?: string } = {}) {
  const { bars, width } = bars128(text);
  const m = opts.module ?? 2;
  const h = opts.height ?? 60;
  const W = width * m;
  const rects = bars.map(([x, w]) => `<rect x="${x * m}" y="0" width="${w * m}" height="${h}"/>`).join("");
  const esc = (s: string) => s.replace(/[<>&"]/g, (ch) => `&#${ch.charCodeAt(0)};`);
  const caption = opts.caption ? `<text x="${W / 2}" y="${h + 30}" font-family="Arial, sans-serif" font-size="11" text-anchor="middle">${esc(opts.caption)}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h + (opts.caption ? 36 : 18)}" viewBox="0 0 ${W} ${h + (opts.caption ? 36 : 18)}"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${rects}</g><text x="${W / 2}" y="${h + 14}" font-family="Arial, sans-serif" font-size="13" text-anchor="middle" letter-spacing="1">${esc(text)}</text>${caption}</svg>`;
}

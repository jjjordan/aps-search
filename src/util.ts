// Normalizes an input string:
//  - Force all letters to upper-case
//  - Remove:
//    - Punctuation
//    - Diacritics
//    - HTML tags & entities
//    - Consecutive spaces (>1)
export function normalize(s: string): string {
    s = s.normalize("NFKD");
    let res = [];
    let last = 0, lastc = 32;

    // NOTE: For performance reasons, avoid creating temporary strings if not necessary.
    // (Compare character codes, etc instead).

    for (let i = 0; i < s.length; i++) {
        let c = s.charCodeAt(i);
        if ((c == 32 && lastc != 32) ||
                (c <= 57 && c >= 48) ||
                (c <= 90 && c >= 65) ||
                (c >= 97 && c <= 122) ||
                (c >= 0x4E00 && c <= 0x9FFF && isCJKLetter(c))) {
            // Allowed.
            lastc = c;
        } else {
            // Copy last to this point.
            if (last < i) {
                res.push(s.slice(last, i));
            }

            if (c == 60) {
                // '<': read till '>'
                for (++i; i < s.length && s.charCodeAt(i) != 62; i++) {}
            } else if (c == 38) {
                // '&': read till ';'
                for (++i; i < s.length && s.charCodeAt(i) != 59; i++) {}
            } else if (lastc != 32 && ((c >= 44 && c <= 47) || c == 58)) {
                // Insert space in place of , - . / :
                res.push(" ");
                lastc = 32;
            }

            last = i + 1;
        }
    }

    if (last == 0) {
        return s.toUpperCase();
    } else if (last < s.length) {
        res.push(s.slice(last, s.length));
    }

    return res.join("").toUpperCase();
}

// Fills in the fields of an AugmentedPeony with its normalized data.
export function populateNormalized(p: AugmentedPeony): void {
    p.description_norm = normalize(p.description).split(" ");
    p.group_norm = normalize(p.group).split(" ");
    p.originator_norm = normalize(p.originator).split(" ");
    p.country_norm = normalize(p.country).split(" ");
    p.date_norm = normalize(p.date).split(" ");
    p.date_val = getDate(p.date);

    // Handle multilingual titles
    if (p.cultivar.indexOf("/") >= 0) {
        let parts = p.cultivar.split("/", 2);
        if (hasCJK(parts[0])) {
            // Name contains CJK. Split into two.
            p.native_cultivar_norm = splitCJK(normalize(parts[0]));
            p.cultivar_norm = normalize(parts[1]).split(" ");
        } else {
            p.native_cultivar_norm = [];
            p.cultivar_norm = normalize(p.cultivar).split(" ");
        }
    } else {
        p.native_cultivar_norm = [];
        p.cultivar_norm = normalize(p.cultivar).split(" ");
    }
}

const yearRegex = /(1[5-9]|20)[0-9]{2}/;

// Returns the year specified by a date string as it appears in the APS registry.
function getDate(s: string): number {
    let m = s.match(yearRegex);
    if (m) {
        let y = parseInt(m[0]);
        if (s.startsWith("bef.")) {
            y -= 0.5;
        }

        return y;
    } else {
        return 9999;
    }
}

export function hasCJK(s: string): boolean {
    return /[\u4E00-\u9FFF]/.test(s);
}

// This may not exist in some browsers. We're also going to assume any CJK
// is actually just Chinese. May want smarter detection in the future.
const segmenter: any = (<any>Intl).Segmenter && new (<any>Intl).Segmenter("zh", { granularity: "word" });

export function splitCJK(s: string): string[] {
    let result: string[] = [];
    if (segmenter) {
        // Segment
        for (const seg of segmenter.segment(s)) {
            result.push(seg.segment);
        }
    } else {
        // If no segmenter then put in one place and rely on substring match to work.
        result.push(s);
    }

    return result;
}

// Splits both Romanized and East Asian text. Needed for potentially mixed queries.
export function splitMixedCJK(s: string): string[] {
    let parts = s.split(" ");
    let result: string[] = [];

    for (let i = 0; i < parts.length; i++) {
        if (hasCJK(parts[i])) {
            let subparts = splitCJK(parts[i]);
            for (let j = 0; j < subparts.length; j++) {
                result.push(subparts[j]);
            }
        } else {
            result.push(parts[i]);
        }
    }

    return result;
}

function isCJKLetter(c: number): boolean {
    return true;
}

// Filters peonies by first letter of cultivar (preferring normalized data).
export function prefixFilter(db: Peony[], prefix: string): Peony[] {
    return db.filter(function(peony: AugmentedPeony): boolean {
        // TODO: Maybe do something special with certain strings like '#', etc.
        if (peony.cultivar_norm) {
            return peony.cultivar_norm[0].startsWith(prefix);
        } else {
            return peony.cultivar.toUpperCase().startsWith(prefix);
        }
    });
}

export function unescapeQuery(s: string): string {
    let result: string[] = [];
    let last = 0;
    for (let i = 0; i < s.length; i++) {
        let c = s.charCodeAt(i);
        if (c == 0x5C) { // \
            result.push(s.slice(last, i));
            switch (s.charAt(++i)) {
            case "'":
                result.push("'");
                break;
            case '"':
                result.push('"');
                break;
            case "\\":
                result.push("\\");
                break;
            case "x":
                result.push(String.fromCodePoint(parseInt(s.slice(i, i + 2), 16)));
                i += 2;
                break;
            default:
                // Insert a space for any other character
                result.push(" ");
                break;
            }

            last = i + 1;
        }
    }

    result.push(s.slice(last, s.length));
    return result.join("");
}

// debug ...
// window["normalize"] = normalize;
// window["splitCJK"] = splitCJK;
// window["splitMixedCJK"] = splitMixedCJK;
// window["segmenter"] = segmenter;
// window["zhpeonies"] = [];

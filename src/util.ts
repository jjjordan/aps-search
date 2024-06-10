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
        if ((c == 32 && lastc != 32) || (c <= 57 && c >= 48) || (c <= 90 && c >= 65) || (c >= 97 && c <= 122)) {
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
            } else if (c == 46 && last == i - 1 && ((lastc <= 90 && lastc >= 65) || (lastc >= 97 && lastc <= 122))) {
                // Abbreviations, e.g. "A.B. Franklin" => "AB Franklin", "A.B.C. Nicholls" => "ABC Nicholls", etc.
                
                function isAbbreviationSegment(s: string, t: number): boolean {
                    let ch = s.charCodeAt(t);
                    if (!((ch <= 90 && ch >= 65) || (ch >= 97 && ch <= 122))) {
                        return false;
                    }

                    if (++t >= s.length) {
                        return false;
                    }

                    return s.charCodeAt(t) == 46;
                }

                let abbrev = [];
                for (var t = i + 1; t < s.length; t += 2) {
                    if (isAbbreviationSegment(s, t)) {
                        abbrev.push(s.charAt(t));
                    } else {
                        break;
                    }
                }

                if (abbrev.length == 0) {
                    // Only the first part was an abbreviation, so just do what we would
                    // normally do for a period.
                    res.push(" ");
                    lastc = 32;
                } else {
                    abbrev.forEach(c => res.push(c));
                    res.push(" ");
                    lastc = 32;
                    i += 2 * abbrev.length;
                }

                console.log("Detected possible abbreviation: " + JSON.stringify(res));
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
    p.cultivar_norm = normalize(p.cultivar).split(" ");
    p.description_norm = normalize(p.description).split(" ");
    p.group_norm = normalize(p.group).split(" ");
    p.originator_norm = normalize(p.originator).split(" ");
    p.country_norm = normalize(p.country).split(" ");
    p.date_norm = normalize(p.date).split(" ");
    p.date_val = getDate(p.date);
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

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

export function populateNormalized(p: AugmentedPeony): void {
    p.cultivar_norm = normalize(p.cultivar).split(" ");
    p.description_norm = normalize(p.description).split(" ");
    p.group_norm = normalize(p.group).split(" ");
    p.originator_norm = normalize(p.originator).split(" ");
    p.country_norm = normalize(p.country).split(" ");
    p.date_norm = normalize(p.date).split(" ");
    p.date_val = getDate(p.date);
}

const yearRegex = /[0-9]{4}/;
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

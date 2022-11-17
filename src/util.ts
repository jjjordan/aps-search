export function normalize(s: string): string {
    s = s.normalize("NFKD");
    let res = [];
    let last = 0, lastc = 32;

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

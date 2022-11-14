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
            }

            last = i + 1;
        }
    }

    if (last < s.length) {
        res.push(s.slice(last, s.length));
    }

    return res.join("").toUpperCase();
}

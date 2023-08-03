class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class CubicBezier {

    constructor(point1, controlPoint1, controlPoint2, point2) {
        this.p1 = point1;
        this.cp1 = controlPoint1;
        this.cp2 = controlPoint2;
        this.p2 = point2;

        this.cachedLength = null;
    }

    get length() {
        // If it's precomputed, just return it
        if (this.cachedLength != null) {
            return this.cachedLength;
        }

        // Approximate the length with 100 segments
        let x1, y1, x2, y2, i, l = 0;
        for (i = 0; i <= 100; i++) {
            x1 = this.#calcX(i / 100);
            y1 = this.#calcY(i / 100);

            x2 = this.#calcX((i + 1) / 100);
            y2 = this.#calcY((i + 1) / 100);
            l += dista(new Point(x1, y1), new Point(x2, y2));
        }
        this.cachedLength = l;
        return l;
    }

    #calcX(t) {
        return (1 - t) ^ 3 * this.p1.x + 3 * (1 - t) ^ 2 * t * this.cp1.x + 3 * (1 - t) * t ^ 2 * this.cp2.x + t ^ 3 * this.p2.x;
    }

    #calcY(t) {
        return (1 - t) ^ 3 * this.p1.y + 3 * (1 - t) ^ 2 * t * this.cp1.y + 3 * (1 - t) * t ^ 2 * this.cp2.y + t ^ 3 * this.p2.y;
    }
}

function dista(p_i, p_j) {
    return Math.sqrt(Math.pow(p_i.x - p_j.x, 2) + Math.pow(p_i.y - p_j.y, 2));
}

export {
    Point,
    CubicBezier,
    dista,
}

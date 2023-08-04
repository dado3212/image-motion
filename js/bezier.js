class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Path {
    _length = null;

    constructor() {}

    get length() {
        // If it's precomputed, just return it
        if (this._length != null) {
            return this._length;
        }

        // Approximate the length with 100 segments
        const SEGMENTS = 100;
        let x1, y1, x2, y2, l = 0;
        for (let i = 0; i <= SEGMENTS; i++) {
            x1 = this.#calcX(i / SEGMENTS);
            y1 = this.#calcY(i / SEGMENTS);

            x2 = this.#calcX((i + 1) / SEGMENTS);
            y2 = this.#calcY((i + 1) / SEGMENTS);
            l += dista(new Point(x1, y1), new Point(x2, y2));
        }
        this._length = l;
        return l;
    }

    frames(numFrames) {
        let f = [];
        for (let i = 0; i < numFrames; i++) {
            let x1 = this.#calcX(i / numFrames);
            let y1 = this.#calcY(i / numFrames);
            f.push([x1, y1, 180, 320]);
        }
        return f;
    }

    func(t, prop) {
        throw new TypeError("Define a function");
    }

    #calcX(t) {
        return this.func(t, a => a.x);
    }

    #calcY(t) {
        return this.func(t, a => a.y);
    }
}

class Line extends Path {
    constructor(point1, point2) {
        super();
        this.p1 = point1;
        this.p2 = point2;
    }

    func(t, prop) {
        return prop(this.p1) + (prop(this.p2) - prop(this.p1)) * t;
    }
}

class QuadraticBezier extends Path {

    constructor(point1, controlPoint1, point2) {
        super();
        this.p1 = point1;
        this.cp = controlPoint1;
        this.p2 = point2;
    }

    func(t, prop) {
        let f = (1 - t) ** 2 * prop(this.p1) + 2 * (1 - t) * t * prop(this.cp) + t ** 2 * prop(this.p2);
        return f;
    }
}

class CubicBezier extends Path {

    constructor(point1, controlPoint1, controlPoint2, point2) {
        super();
        this.p1 = point1;
        this.cp1 = controlPoint1;
        this.cp2 = controlPoint2;
        this.p2 = point2;
    }

    func(t, prop) {
        return (1 - t) ** 3 * prop(this.p1) + 3 * (1 - t) ** 2 * t * prop(this.cp1) + 3 * (1 - t) * t ** 2 * prop(this.cp2) + t ** 3 * prop(this.p2);
    }
}

function dista(p_i, p_j) {
    return Math.sqrt(Math.pow(p_i.x - p_j.x, 2) + Math.pow(p_i.y - p_j.y, 2));
}

export {
    Point,
    Line,
    QuadraticBezier,
    CubicBezier,
    dista,
}

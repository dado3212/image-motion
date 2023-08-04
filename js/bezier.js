class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Frame {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
}

class Path {
    _length = null;
    _pieces = [];

    constructor(point1, point2) {
        this.p1 = point1;
        this.p2 = point2;
    }

    get length() {
        // If it's precomputed, just return it
        if (this._length != null) {
            return this._length;
        }

        // Approximate the length with 100 segments
        const SEGMENTS = 100;
        let x1, y1, x2, y2, l = 0;
        for (let i = 0; i < SEGMENTS; i++) {
            this._pieces.push([l, i / SEGMENTS]);

            x1 = this.#calcX(i / SEGMENTS);
            y1 = this.#calcY(i / SEGMENTS);

            x2 = this.#calcX((i + 1) / SEGMENTS);
            y2 = this.#calcY((i + 1) / SEGMENTS);
            l += Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
        }
        this._pieces.push([l, 1.0]);
        this._length = l;
        return l;
    }

    frames(numFrames) {
        const avgDistance = this._length / numFrames;
        let f = [];
        for (let i = 0; i <= numFrames; i++) {
            const targetDistance = avgDistance * i;
            let targetFloat = this._pieces[this._pieces.length - 1][1];
            for (let j = 0; j < this._pieces.length; j++) {
                if (this._pieces[j][0] == targetDistance) {
                    targetFloat = this._pieces[j][1];
                    break;
                } else if (this._pieces[j][0] > targetDistance) {
                    // interpolate
                    const perc = (targetDistance - this._pieces[j-1][0]) / (this._pieces[j][0] - this._pieces[j-1][0]);
                    targetFloat = (1 - perc) * this._pieces[j-1][1] + perc * this._pieces[j][1];
                    break;
                }
            }
            let x1 = this.#calcX(targetFloat);
            let y1 = this.#calcY(targetFloat);
            let width = this.p1.width + (this.p2.width - this.p1.width) * i / numFrames;
            let height = this.p1.height + (this.p2.height - this.p1.height) * i / numFrames;
            f.push([x1, y1, width, height]);
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
        super(point1, point2);
    }

    func(t, prop) {
        return prop(this.p1) + (prop(this.p2) - prop(this.p1)) * t;
    }
}

class QuadraticBezier extends Path {

    constructor(point1, controlPoint1, point2) {
        super(point1, point2);
        this.cp = controlPoint1;
    }

    func(t, prop) {
        return (1 - t) ** 2 * prop(this.p1) + 2 * (1 - t) * t * prop(this.cp) + t ** 2 * prop(this.p2);
    }
}

class CubicBezier extends Path {

    constructor(point1, controlPoint1, controlPoint2, point2) {
        super(point1, point2);
        this.cp1 = controlPoint1;
        this.cp2 = controlPoint2;
    }

    func(t, prop) {
        return (1 - t) ** 3 * prop(this.p1) + 3 * (1 - t) ** 2 * t * prop(this.cp1) + 3 * (1 - t) * t ** 2 * prop(this.cp2) + t ** 3 * prop(this.p2);
    }
}

export {
    Point,
    Frame,
    Line,
    QuadraticBezier,
    CubicBezier,
}

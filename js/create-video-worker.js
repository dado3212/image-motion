import {
    Point,
    Frame,
    Line,
    QuadraticBezier,
    CubicBezier,
    Hold,
} from './bezier.js'

import {
    convertDataURIToBinary
} from './util.js'

self.onmessage = async function(event) {
    const offscreenCanvas = event.data.canvas;
    const paths = deserialize(event.data.paths);
    const offscreenContext = offscreenCanvas.getContext('2d');
    offscreenContext.fillStyle = 'white';

    const blob = convertDataURIToBinary(event.data.imageSrc);
    const rawImg = await createImageBitmap(new Blob([blob], { type: 'image/jpeg' }));

    let totalLength = 0;
    let parsePercentage = event.data.duration * event.data.fps;
    for (var j = 0; j < paths.length; j++) {
        totalLength += paths[j].length;
        if (paths[j].constructor.name == 'Hold') {
            parsePercentage += paths[j].duration * event.data.fps;
        }
    }

    let images = [];
    for (var i = 0; i < paths.length; i++) {
        let numFrames = (event.data.duration * event.data.fps) * paths[i].length / totalLength;
        // Have to special case hold
        if (paths[i].constructor.name == 'Hold') {
            numFrames = paths[i].duration * event.data.fps;
        }
        let frames = paths[i].frames(numFrames, i === paths.length - 1);
        console.log(numFrames);

        for (var j = 0; j < frames.length; j++) {
            let imgString = await screenshot(rawImg, offscreenCanvas, offscreenContext, frames[j][0], frames[j][1], frames[j][2], frames[j][3]);
            const data = convertDataURIToBinary(imgString);

            images.push({
                name: `img${padWithZeros(images.length, 4)}.jpeg`,
                data: data,
            });

            self.postMessage({
                stage: 1,
                status: 'wip',
                message: null,
                percentage: images.length / (parsePercentage) * 100,
            });
        }
    }
    console.log(images.length);
    console.log(parsePercentage);

    self.postMessage({
        stage: 1,
        status: 'done',
        message: '2. Interpolated frames.',
    });
    self.postMessage({
        stage: 2,
        status: 'wip',
        percentage: 0,
    });
    const worker = new Worker('./ffmpeg-worker-mp4.js');

    worker.onmessage = function (e) {
        var msg = e.data;
        if (msg.type == 'stderr' || msg.type == 'stdout') {
            const regex = /frame=\s*(\d+)/;
            const match = msg.data.match(regex);

            let perc = 0;
            if (match && match[1]) {
                perc = parseInt(match[1]) / (parsePercentage) * 100;
            }

            self.postMessage({
                stage: 2,
                status: 'wip',
                percentage: perc,
            });
        } else if (msg.type == 'done') {
            const blob = new Blob([msg.data.MEMFS[0].data], {
                type: "video/mp4"
            });

            self.postMessage({
                videoBlob: blob,
            });
        } else if (msg.type == 'exit') {
            if (msg.data != 0) {
                self.postMessage({
                    error: true,
                    message: 'Process exited with code ' + msg.data,
                });
                worker.terminate();
            }
        }
    };

    worker.onerror = function(_) {
        self.postMessage({
            error: true,
            message: 'Worker failed.',
        });
    };

    // https://trac.ffmpeg.org/wiki/Slideshow
    // https://semisignal.com/tag/ffmpeg-js/
    worker.postMessage({
        type: 'run',
        TOTAL_MEMORY: 1073741824, // no idea why this was this specific value
        //arguments: 'ffmpeg -framerate 24 -i img%03d.jpeg output.mp4'.split(' '),
        arguments: [
            "-r", '' + event.data.fps, // frame rate
            "-i", "img%04d.jpeg", // input files
            "-c:v", "libx264", // video codec?
            "-preset", "ultrafast", // not exactly sure?
            "-crf", "22", // video quality (0 to 51, 0 is lossless)
            "-vf", "scale=1080:1920", // output scale
            "-pix_fmt", "yuv420p", // pixel format
            "-vb", "20M", // 20MB/s bitrate
            "out.mp4"
        ],
        MEMFS: images
    });
};

async function screenshot(image, offscreenCanvas, ctx, x, y, width, height) {
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.drawImage(
        image,
        // Source
        x,
        y,
        width,
        height,
        // Destination
        0,
        0,
        1080,
        1920,
    );

    const blob = await offscreenCanvas.convertToBlob({type: 'image/jpeg', quality: 0.9 /* max quality */});

    const dataURL = new FileReaderSync().readAsDataURL(blob);
    return dataURL; // string
}

function deserialize(arrayPaths) {
    const paths = [];
    for (var i = 0; i < arrayPaths.length; i++) {
        const info = JSON.parse(arrayPaths[i]);
        const f1 = new Frame(info.f1.x, info.f1.y, info.f1.width, info.f1.height);
        const f2 = new Frame(info.f2.x, info.f2.y, info.f2.width, info.f2.height);
        switch (info.name) {
            case 'Line':
                paths.push(new Line(f1, f2));
                break;
            case 'QuadraticBezier':
                paths.push(new QuadraticBezier(f1, new Point(info.cp.x, info.cp.y), f2));
                break;
            case 'CubicBezier':
                paths.push(new CubicBezier(f1, new Point(info.cp1.x, info.cp1.y), new Point(info.cp2.x, info.cp2.y), f2));
                break;
            case 'Hold':
                paths.push(new Hold(f1, info.duration));
                break;
            default:
                console.log('Unknown deserialization');
                break;

        }
    }
    return paths;
}

function padWithZeros(number, length) {
    let str = number.toString();
    while (str.length < length) {
        str = '0' + str;
    }
    return str;
}

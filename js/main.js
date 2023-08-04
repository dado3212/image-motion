import {
    isNaturalScrolling,
    convertDataURIToBinary,
    screenshot
} from './util.js'

import {
    Point,
    Line,
    QuadraticBezier,
    CubicBezier,
    dista,
} from './bezier.js'

// Global context
var shots = [];
var images = [];

var gestureStartScale = 0;
var scale = 1;
var posX = 0;
var posY = 0;

var startX;
var startY;
var minScale; // The size of the image
var maxScale; // zoompan by default only supports a scale of 10

/* 9:16 aspect ratio, adjust width and height as needed */
const rectangleWidth = 180;
const rectangleHeight = 320;

let originalWidth = 0;
let originalHeight = 0;

let file_name = '';

var canvas, ctx;

// For output
let DURATION_SECONDS = 10;
const FPS = 30;

document.addEventListener('DOMContentLoaded', () => {
    var body = document.body;

    // Prevent default behavior for the dragover and drop events to allow dropping content
    body.addEventListener('dragover', function (evt) {
        evt.preventDefault();
    });

    body.addEventListener('drop', function (evt) {
        // Prevent default
        evt.stopPropagation();
        evt.preventDefault();

        // If I ever want to use an upload from somewhere else?
        // var imageUrl = evt.dataTransfer.getData('URL');

        // Get the dropped file from the event data
        const file = evt.dataTransfer.files[0];
        file_name = file.name;

        if (file.type === 'image/tiff') {
            // Yell about this one :D
            alert('This currently doesn\'t accept TIFFs.');
            // brew install imagemagick
            // convert -flatten -density 72 -depth 16 -quality 75 -units PixelsPerInch -interlace JPEG -define jpeg:dct-method=float "$file" ./converted/"$base".jpg
            return;
        }

        // Load the image
        uploadImage(file);
    });

    document.getElementById('reset').addEventListener('click', clearFrames);
    document.getElementById('create').addEventListener('click', createClick);
});

function uploadImage(file) {

    const rawImage = document.getElementById('rawImage');

    // Check if the dropped file is an image
    if (!file || !file.type.startsWith('image/')) {
        alert('What the heck did you drag?');

        return;
    }
    // Create a FileReader object to read the file
    const reader = new FileReader();

    // Set up the FileReader event when the image is loaded
    reader.onload = (e) => {
        rawImage.onload = (e) => {
            // Scale the image and set the URL
            originalWidth = rawImage.width;
            originalHeight = rawImage.height;
            const tabHeight = window.innerHeight - 15;
            const tabWidth = window.innerWidth;

            rawImage.width = tabHeight * originalWidth / originalHeight;
            rawImage.height = tabHeight;

            minScale = Math.min(rectangleHeight / rawImage.height, rectangleWidth / rawImage.width);
            maxScale = 10 * Math.min(rectangleHeight / rawImage.height, rectangleWidth / rawImage.width);

            // Set up the canvas
            canvas = document.getElementById('canvas');
            ctx = canvas.getContext("2d");
            canvas.width = rawImage.width;
            canvas.height = rawImage.height;

            let offsetX = (tabWidth - 350 - rawImage.width) / 2;
            document.getElementById('image').style.transform = `translate(${offsetX}px, 0px)`;

            // Set up the rectangle
            document.getElementById('rectangle').style.display = "initial";
            document.getElementById('rectangle').style.width = rectangleWidth + 'px';
            document.getElementById('rectangle').style.height = rectangleHeight + 'px';

            // Set up all the additional listeners
            setupImageListeners();
        };
        rawImage.src = e.target.result;
    };

    // Read the file as a data URL
    reader.readAsDataURL(file);
}

//
function setupImageListeners() {
    const naturalScroll = isNaturalScrolling();

    document.getElementById('container').addEventListener('mousemove', function (event) {
        var rectangle = document.getElementById('rectangle');

        // Calculate the new position of the rectangle based on the cursor position
        var x = event.clientX - (rectangleWidth / 2);
        var y = event.clientY - (rectangleHeight / 2);

        // Set the new position for the rectangle
        rectangle.style.left = x + 'px';
        rectangle.style.top = y + 'px';

        // TODO: Set the scale point for the image
    });

    // Detect the wheel event (including the trackpad pinch gesture)
    document.getElementById('container').addEventListener('wheel', function (e) {
        e.preventDefault();

        // Zoom mode
        if (e.ctrlKey) {
            var newScale = scale - e.deltaY * 0.01;

            // Limit the scaling from fully zoomed out to 10x
            newScale = Math.max(minScale, Math.min(newScale, maxScale));

            // Update the current scale for the next wheel event
            scale = newScale;
        } else {
            // Pan mode
            if (naturalScroll) {
                posX += (e.deltaX) * 2;
                posY += (e.deltaY) * 2;
            } else {
                posX -= (e.deltaX) * 2;
                posY -= (e.deltaY) * 2;
            }
        }
        document.getElementById('image').style.transform = `translate3D(${posX}px, ${posY}px, 0px) scale(${scale})`;
        // Keep the rectangles in the same place
    }, { passive: false });

    document.getElementById('container').addEventListener("gesturestart", function (e) {
        e.preventDefault();
        startX = e.pageX - posX;
        startY = e.pageY - posY;
        gestureStartScale = scale;
    });

    document.getElementById('container').addEventListener("gesturechange", function (e) {
        e.preventDefault();

        scale = gestureStartScale * e.scale;

        posX = e.pageX - startX;
        posY = e.pageY - startY;

        document.getElementById('image').style.transform = `translate3D(${posX}px, ${posY}px, 0px) scale(${scale})`;
    });

    document.getElementById('container').addEventListener("gestureend", function (e) {
        e.preventDefault();
    });


    document.getElementById('container').addEventListener('click', function (event) {
        // Add a little indicator of where you are
        addRectangle(event);

        // And take a screenshot of that section of the canvas
        addScreenshot(event);

        drawSplines();
    });
}

function addRectangle(event) {
    const originalElement = document.getElementById('rectangle');
    const newRectangle = originalElement.cloneNode(true);

    // Optionally, you can modify the cloned element's attributes or content
    newRectangle.id = 'rectangle_' + shots.length;

    // Insert the cloned element into the document (e.g., append it to a container)
    document.getElementById('image').appendChild(newRectangle);

    const originalBounding = originalElement.getBoundingClientRect();
    const imageBounding = document.getElementById('image').getBoundingClientRect();

    const x = (originalBounding.left - imageBounding.left) / scale;
    const y = (originalBounding.top - imageBounding.top) / scale;

    newRectangle.style.left = x + 'px';
    newRectangle.style.top = y + 'px';
    newRectangle.style.transform = `scale(${1 / scale})`;

    const span = document.createElement('span');
    span.innerHTML = (shots.length + 1)
    newRectangle.appendChild(span);

    shots.push(newRectangle);
}

function addScreenshot(event) {
    // Get the last element that was added, and the x, y
    const newestRectangle = shots[shots.length - 1].getBoundingClientRect();
    const rawImage = document.getElementById('rawImage');
    const imageBounding = rawImage.getBoundingClientRect();

    const x = parseInt(shots[shots.length - 1].style.left.slice(0, -2)) / imageBounding.width * scale * originalWidth;
    const y = parseInt(shots[shots.length - 1].style.top.slice(0, -2)) / imageBounding.height * scale * originalHeight;
    const width = newestRectangle.width / imageBounding.width * originalWidth;
    const height = newestRectangle.height / imageBounding.height * originalHeight;

    const imgString = screenshot(rawImage, x, y, width, height);

    // Convert the canvas to an image
    const image = new Image();
    image.src = imgString;

    const newDiv = document.createElement('div');
    newDiv.classList.add('snapshot');

    const newSpan = document.createElement('span');
    newSpan.innerHTML = shots.length;

    newDiv.appendChild(newSpan);
    newDiv.appendChild(image);
    document.getElementById('frames').appendChild(newDiv);
}

function createClick(event) {
    event.stopPropagation();

    DURATION_SECONDS = parseInt(document.getElementById('duration').value);
    const rawImage = document.getElementById('rawImage');
    const offsetScale = originalWidth / rawImage.width;

    pts = [];

    for (var i = 0; i < shots.length; i++) {
        const x1 = parseInt(shots[i].style.left.slice(0, -2)) * offsetScale; //  + ffmpegOffsetX;
        const y1 = parseInt(shots[i].style.top.slice(0, -2)) * offsetScale; //  + ffmpegOffsetY;
        pts.push(new Point(x1, y1));
    }

    var cps = []; // There will be two control points for each "middle" point, 1 ... len-2e
    for (var i = 0; i < pts.length - 2; i += 1) {
        cps = cps.concat(
            ctlpts(
                pts[i],
                pts[i + 1],
                pts[i + 2],
            )
        );
    }

    // Create all of the paths
    let paths = [];
    if (shots.length == 2) {
        paths.push(new Line(pts[0], pts[1]));
    } else {
        // From point 0 to point 1 is a quadratic bezier
        paths.push(new QuadraticBezier(pts[0], cps[0], pts[1]));
        // For all middle points, it's cubic beziers
        for (var i = 2; i < shots.length - 1; i += 1) {
            paths.push(new CubicBezier(pts[i-1], cps[(2 * (i - 1) - 1)], cps[(2 * (i - 1))], pts[i]));
        }
        // And the final one is a quadratic bezier (unless you're looping, TODO)
        i = shots.length - 1;
        paths.push(new QuadraticBezier(pts[i-1], cps[(2 * (i - 1) - 1)], pts[i]));
    }

    // Figure out the overall lengths (and percentage)
    let totalLength = 0;
    for (var j = 0; j < paths.length; j++) {
        totalLength += paths[j].length;
    }

    // And then get all of the images for each path
    images = [];
    for (var j = 0; j < paths.length; j++) {
        let numFrames = DURATION_SECONDS * FPS * paths[j].length / totalLength;
        let frames = paths[j].frames(numFrames);

        for (var k = 0; k < frames.length; k++) {
            let imgString = screenshot(rawImage, frames[k][0], frames[k][1], frames[k][2], frames[k][3]);
            const data = convertDataURIToBinary(imgString);

            images.push({
                name: `img${images.length}.jpeg`,
                data: data,
            });
        }
    }
    // ... they get TOTAL_FRAMES * perc
    // ... and we pace across to get the x/y
    // ... ignoring zoom for now (TODO)
    // ... and for each point we snap the picture
    // ... and add it to the list

    const worker = new Worker('./js/ffmpeg-worker-mp4.js');

    worker.onmessage = function (e) {
        var msg = e.data;
        console.log(msg);
        if (msg.type == 'done') {
            const blob = new Blob([msg.data.MEMFS[0].data], {
                type: "video/mp4"
            });

            const url = webkitURL.createObjectURL(blob);

            document.getElementById('awesome').src = url; //toString converts it to a URL via Object URLs, falling back to DataURL
            // $('download').style.display = '';
            // $('download').href = url;
        }
        // switch (msg.type) {
        //     // case "stdout":
        //     // case "stderr":
        //     //     messages += msg.data + "\n";
        //     //     break;
        //     // case "exit":
        //     //     console.log("Process exited with code " + msg.data);
        //     //     //worker.terminate();
        //     //     break;

        //     case 'done':


        //     break;
        // }
        // msgs.innerHTML = messages
    };

    // https://trac.ffmpeg.org/wiki/Slideshow
    // https://semisignal.com/tag/ffmpeg-js/
    worker.postMessage({
        type: 'run',
        TOTAL_MEMORY: 268435456, // no idea why this was this specific value
        //arguments: 'ffmpeg -framerate 24 -i img%03d.jpeg output.mp4'.split(' '),
        arguments: [
            "-r", '' + FPS, // frame rate
            "-i", "img%*.jpeg",
            // "-c:v", "libx264",
            // "-crf", "1", "-vf",
            // "scale=1080x1920",
            //"-pix_fmt", "yuv420p", "-vb", "20M",
            "out.mp4"],
        //arguments: '-r 60 -i img%03d.jpeg -c:v libx264 -crf 1 -vf -pix_fmt yuv420p -vb 20M out.mp4'.split(' '),
        MEMFS: images
    });
}

function clearFrames() {
    for (var i = 0; i < shots.length; i++) {
        shots[i].remove();
    }
    shots = [];
    var toRemove = document.querySelectorAll('.snapshot');
    for (var i = 0; i < toRemove.length; i++) {
        toRemove[i].remove();
    }

    images = [];

    // Clear the splines
    clear();
}

/**
 * Copied directly from https://stackoverflow.com/a/20309900/3951475
 */
function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function ctlpts(one, two, three) {
    var t = 0.5; // tension
    var v = new Point(three.x - one.x, three.y - one.y);
    var d01 = dista(one, two);
    var d12 = dista(two, three);
    var d012 = d01 + d12;
    return [
        new Point(two.x - v.x * t * d01 / d012, two.y - v.y * t * d01 / d012),
        new Point(two.x + v.x * t * d12 / d012, two.y + v.y * t * d12 / d012)
    ];
}

let pts = [];

function addPts(pts, i) {
    // Adjust the points to the center
    const x = parseInt(shots[i].style.left.slice(0, -2)) + rectangleWidth * parseFloat(shots[i].style.transform.slice(6, -1)) / 2;
    const y = parseInt(shots[i].style.top.slice(0, -2)) + rectangleHeight * parseFloat(shots[i].style.transform.slice(6, -1)) / 2;
    pts.push(new Point(x, y));
    return pts;
}

function drawSplines() {
    clear();
    pts = [];

    for (var i = 0; i < shots.length; i++) {
        pts = addPts(pts, i);
    }

    if (document.getElementById('loop').checked && shots.length > 2) {
        pts = addPts(pts, 0);
        // pts = addPts(pts, 1);
    }

    var cps = []; // There will be two control points for each "middle" point, 1 ... len-2e
    for (var i = 0; i < pts.length - 2; i += 1) {
        cps = cps.concat(
            ctlpts(
                pts[i],
                pts[i + 1],
                pts[i + 2],
            )
        );
    }

    drawCurvedPath(cps, pts);
}

function drawCurvedPath(cps, pts) {
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#029bd2';

    if (pts.length < 2) return;
    if (pts.length == 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();
    }
    else {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        // from point 0 to point 1 is a quadratic
        ctx.quadraticCurveTo(cps[0].x, cps[0].y, pts[1].x, pts[1].y);
        // for all middle points, connect with bezier
        for (var i = 2; i < pts.length - 1; i += 1) {
            ctx.bezierCurveTo(
                cps[(2 * (i - 1) - 1)].x, cps[(2 * (i - 1) - 1)].y,
                cps[2 * (i - 1)].x, cps[2 * (i - 1)].y,
                pts[i].x, pts[i].y);
        }
        ctx.quadraticCurveTo(
            cps[(2 * (i - 1) - 1)].x, cps[(2 * (i - 1) - 1)].y,
            pts[i].x, pts[i].y);
        ctx.stroke();
    }
}

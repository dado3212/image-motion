
// Global context
var shots = [];

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

class Point {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
}

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

            offsetX = (tabWidth - 350 - rawImage.width) / 2;
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

    // Create a canvas dynamically
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set the canvas dimensions
    canvas.width = rectangleWidth;
    canvas.height = rectangleHeight;

    ctx.drawImage(
        rawImage,
        // Source
        parseInt(shots[shots.length - 1].style.left.slice(0, -2)) / imageBounding.width * scale * originalWidth,
        parseInt(shots[shots.length - 1].style.top.slice(0, -2)) / imageBounding.height * scale * originalHeight,
        newestRectangle.width / imageBounding.width * originalWidth,
        newestRectangle.height / imageBounding.height * originalHeight,
        // Destination
        0,
        0,
        rectangleWidth,
        rectangleHeight
    );

    // Convert the canvas to an image
    const image = new Image();
    image.src = canvas.toDataURL();

    const newDiv = document.createElement('div');
    newDiv.classList.add('snapshot');

    const newSpan = document.createElement('span');
    newSpan.innerHTML = shots.length;

    newDiv.appendChild(newSpan);
    newDiv.appendChild(image);
    document.getElementById('frames').appendChild(newDiv);
}

function isNaturalScrolling() {
    // Create a dummy element
    var dummyElement = document.createElement('div');
    // Apply the webkitOverflowScrolling property to the dummy element
    dummyElement.style.webkitOverflowScrolling = 'touch';

    // Get the computed style of the dummy element
    var style = window.getComputedStyle(dummyElement);

    // Check if the value of webkitOverflowScrolling is 'touch' (natural scrolling)
    const answer = style.webkitOverflowScrolling === 'touch';

    dummyElement.remove();
    return answer;
}

function createClick(event) {
    event.stopPropagation();
    const command = createCommand();
    console.log(command);
    alert(command);
}

function createCommand() {
    // Can't animate a single keyframe, just crop the image dumbass.
    if (shots.length <= 1) {
        return '';
    }

    DURATION_SECONDS = parseInt(document.getElementById('duration').value);

    const rawImage = document.getElementById('rawImage');
    const offsetScale = originalWidth / rawImage.width;

    // This value is currently the adjustment that we use to scale the rectangle
    // But we need to convert it into the scale of the IMAGE
    var zoomScalar = 1;
    var ffmpegOffsetX = 0;
    var ffmpegOffsetY = 0;

    let command = 'ffmpeg';
    // command += ' -loop 1'; // not sure if this does anything
    command += ' -i ' + file_name; // input file from the upload (run in directory)
    command += ' -loglevel error'; // suppress everything but errors for now
    command += ' -filter_complex "'; // We are going to create a complex filter using zoompan

    // If an image is not 9:16 as input, then zoompan will reshape it, leading to it not keeping
    // the right aspect ratio. To resolve this, we pad the image with white bars to get it to 9:16.
    // If it's not tall enough, we'll pad y
    if (originalWidth * 16 / 9 > originalHeight) {
        command += "pad=w=iw:h=iw*16/9:x='0':y='(oh-ih)/2':color=white,";
        // Take the scalar from the height comparison
        zoomScalar = rawImage.width / rectangleWidth;
        ffmpegOffsetY = (originalWidth * 16 / 9 - originalHeight) / 2;
    } else {
        // ...it's not wide enough, so we'll pad x.
        command += "pad=w=ih*9/16:h=ih:x='(ow-iw)/2':y='0':color=white,";
        // Take the scalar from the width comparison
        zoomScalar = rawImage.height / rectangleHeight;
        ffmpegOffsetX = (originalHeight * 9 / 16 - originalWidth) / 2;
    }

    command += 'zoompan='; // start the zoompan
    command += "d=" + (DURATION_SECONDS * FPS); // number of frames for total run
    command += ":fps=" + FPS;
    command += ":s=1080x1920"; // // 9:16 output image size

    /**
     * Sample tweening function for four shots:
     *
     * if (
     *  lte(on, ftl),
     *  x1 + (x2-x1) * on / ftl,
     *  if (
     *    lte(on, ftl * 2),
     *    x2 + (x3 - x2) * (on - ftl) / (ftl * 2),
     *    x3 + (x4 - x3) * (on - ftl * 2) / (ftl * 3)
     *  )
     * )
     */
    let zoomExpression = ":z='";
    let xExpression = ":x='";
    let yExpression = ":y='";

    // Extract positions
    pts = [];

    for (var i = 0; i < shots.length; i++) {
        const x1 = parseInt(shots[i].style.left.slice(0, -2)) * offsetScale + ffmpegOffsetX;
        const y1 = parseInt(shots[i].style.top.slice(0, -2)) * offsetScale + ffmpegOffsetY;
        pts.push(new Point(x1, y1));
    }

    cps = []; // There will be two control points for each "middle" point, 1 ... len-2e
    for (var i = 0; i < pts.length - 2; i += 1) {
        cps = cps.concat(
            ctlpts(
                pts[i],
                pts[i + 1],
                pts[i + 2],
            )
        );
    }

    if (shots.length == 2) {
        xExpression = linear(xExpression, 0, pts[0].x, pts[1].x);
        yExpression = linear(yExpression, 0, pts[1].x, pts[1].y);
    } else {
        // From point 0 to point 1 is a quadratic bezier
        xExpression = quadraticBezier(xExpression, 0, pts[0].x, cps[0].x, pts[1].x);
        yExpression = quadraticBezier(yExpression, 0, pts[0].y, cps[0].y, pts[1].y);
        // For all middle points, it's cubic beziers
        for (var i = 2; i < shots.length - 1; i += 1) {
            xExpression = cubicBezier(
                xExpression,
                i - 1,
                pts[i-1].x,
                cps[(2 * (i - 1) - 1)].x,
                cps[(2 * (i - 1))].x,
                pts[i].x,
            );
            yExpression = cubicBezier(
                yExpression,
                i - 1,
                pts[i-1].y,
                cps[2 * (i - 1) - 1].y,
                cps[2 * (i - 1)].y,
                pts[i].y,
            );
        }
        // And the final one is a quadratic bezier (unless you're looping, TODO)
        i = shots.length - 1;
        xExpression = quadraticBezier(xExpression, i - 1, pts[i-1].x, cps[(2 * (i - 1) - 1)].x, pts[i].x);
        yExpression = quadraticBezier(yExpression, i - 1, pts[i-1].y, cps[(2 * (i - 1) - 1)].y, pts[i].y);

        for (var i = 0; i < shots.length - 2; i++) {
            xExpression += ')';
            yExpression += ')';
        }
    }

    // Handle the zoom linearly
    for (var i = 0; i < shots.length - 1; i++) {
        const zoom1 = zoomScalar / parseFloat(shots[i].style.transform.slice(6, -1));
        const zoom2 = zoomScalar / parseFloat(shots[i + 1].style.transform.slice(6, -1));

        zoomExpression = linear(zoomExpression, i, zoom1, zoom2);
    }
    for (var i = 0; i < shots.length - 2; i++) {
        zoomExpression += ')';
    }

    command += xExpression + "'";
    command += yExpression + "'";
    command += zoomExpression + "'";

    command += '" -t ' + DURATION_SECONDS + ' -pix_fmt yuv420p -y output_video.mp4'; // suffix

    return command;
}

function linear(expression, i, p1, p2) {
    const len = (DURATION_SECONDS * FPS) / (shots.length - 1);

    const t = `(on - ${len * i}) / ${len}`;

    const linearFunction = `${p1} + ${p2 - p1} * ${t}`;

    if (i == shots.length - 2) {
        expression += linearFunction;
    } else {
        expression += 'if('
            + 'lte(on, ' + len * (i + 1) + '),'
            + linearFunction + ',';
    }
    return expression;
}

function quadraticBezier(expression, i, p1, c1, p2) {
    const len = (DURATION_SECONDS * FPS) / (shots.length - 1);

    const t = `((on - ${len * i}) / ${len})`;

    const quadraticBezierFunction = `(1 - ${t})^2 * ${p1} + 2 * (1 - ${t}) * ${t} * ${c1} + ${t}^2 * ${p2}`;

    if (i == shots.length - 2) {
        expression += quadraticBezierFunction;
    } else {
        expression += 'if('
            + 'lte(on, ' + len * (i + 1) + '),'
            + quadraticBezierFunction + ',';
    }
    return expression;
}

function cubicBezier(expression, i, p1, c1, c2, p2) {
    const len = (DURATION_SECONDS * FPS) / (shots.length - 1);

    const t = `((on - ${len * i}) / ${len})`;

    const cubicBezierFunction = `(1 - ${t})^3 * ${p1} + 3 * (1 - ${t})^2 * ${t} * ${c1} + 3 * (1 - ${t}) * ${t}^2 * ${c2} + ${t}^3 * ${p2}`;

    if (i == shots.length - 2) {
        expression += cubicBezierFunction;
    } else {
        expression += 'if('
            + 'lte(on, ' + len * (i + 1) + '),'
            + cubicBezierFunction + ',';
    }
    return expression;
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

    // Clear the splines
    clear();
}

/**
 * Copied directly from https://stackoverflow.com/a/20309900/3951475
 */
function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function dista(p_i, p_j) {
    return Math.sqrt(Math.pow(p_i.x - p_j.x, 2) + Math.pow(p_i.y - p_j.y, 2));
}

function ctlpts(one, two, three) {
    console.log(one, two, three);
    var t = 0.5; // tension
    var v = new Point(three.x - one.x, three.y - one.y);
    var d01 = dista(one, two);
    var d12 = dista(two, three);
    var d012 = d01 + d12;
    return [
        new Point(two.x - v.x * t * d01 / d012, two.y- v.y * t * d01 / d012),
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

    cps = []; // There will be two control points for each "middle" point, 1 ... len-2e
    for (var i = 0; i < pts.length - 2; i += 1) {
        cps = cps.concat(
            ctlpts(
                pts[i],
                pts[i+1],
                pts[i+2],
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

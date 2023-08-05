import {
    isNaturalScrolling,
    screenshot
} from './util.js'

import {
    Point,
    Frame,
    Line,
    QuadraticBezier,
    CubicBezier,
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
let worker;

const Tools = {
    ADD: 'Add',
    MOVE: 'Move',
};
let currentTool = Tools.ADD;

// For output
let DURATION_SECONDS = 10;
const FPS = 60;

document.addEventListener('DOMContentLoaded', () => {
    var body = document.body;

    document.getElementById('rectangle').style.width = rectangleWidth + 'px';
    document.getElementById('rectangle').style.height = rectangleHeight + 'px';

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

    document.getElementById('container').addEventListener('mousemove', function (event) {
        if (currentTool !== Tools.ADD) {
            return;
        }
        var rectangle = document.getElementById('rectangle');

        // Calculate the new position of the rectangle based on the cursor position
        var x = event.clientX - (rectangleWidth / 2);
        var y = event.clientY - (rectangleHeight / 2);

        // Set the new position for the rectangle
        rectangle.style.left = x + 'px';
        rectangle.style.top = y + 'px';
    });

    document.getElementById('reset').addEventListener('click', clearFrames);
    document.getElementById('create').addEventListener('click', createClick);

    // Modal
    document.getElementById('closeModal').addEventListener('click', (_) => {
        document.getElementById('modal').style.display = "none";

        if (worker != null) {
            worker.terminate();
        }
    });

    document.getElementById('addFrame').addEventListener('click', (_) => {
        // Mark everything as unselected
        const toolboxOptions = document.querySelectorAll('#toolbox span');
        for (var i = 0; i < toolboxOptions.length; i++) {
            toolboxOptions[i].classList.remove('selected');
        }
        // Select addFrame
        document.getElementById('addFrame').classList.add('selected');
        currentTool = Tools.ADD;

        // Make the rectangle visible
        document.getElementById('rectangle').style.display = "initial";
        // Mark all frames as non-moveable
        const rectangleFrames = document.querySelectorAll('.rectangle.frame');
        for (var i = 0; i < rectangleFrames.length; i++) {
            rectangleFrames[i].classList.remove('moveable');
        }
    });

    document.getElementById('moveFrame').addEventListener('click', (_) => {
        // Mark everything as unselected
        const toolboxOptions = document.querySelectorAll('#toolbox span');
        for (var i = 0; i < toolboxOptions.length; i++) {
            toolboxOptions[i].classList.remove('selected');
        }
        // Select moveFrame
        document.getElementById('moveFrame').classList.add('selected');
        currentTool = Tools.MOVE;
        // Hide the rectangle that follows the mouse
        document.getElementById('rectangle').style.display = "none";
        // Mark all frames as moveable
        const rectangleFrames = document.querySelectorAll('.rectangle.frame');
        for (var i = 0; i < rectangleFrames.length; i++) {
            rectangleFrames[i].classList.add('moveable');
        }
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
            const tabHeight = window.innerHeight;
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

            const offsetX = (tabWidth - 350 - rawImage.width) / 2;
            document.getElementById('image').style.transform = `translate(${offsetX}px, 0px)`;
            posX = offsetX;

            // Set up the rectangle
            document.getElementById('rectangle').style.display = "initial";

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

    document.getElementById('container').addEventListener('mouseleave', (_) => {
        if (currentTool !== Tools.ADD) {
            return;
        }
        document.getElementById('rectangle').style.display = "none";
    });
    document.getElementById('container').addEventListener('mouseenter', (_) => {
        if (currentTool !== Tools.ADD) {
            return;
        }
        document.getElementById('rectangle').style.display = "initial";
    });

    // Detect the wheel event (including the trackpad pinch gesture)
    document.getElementById('container').addEventListener('wheel', function (e) {
        e.preventDefault();

        // Zoom mode
        if (e.ctrlKey) {
            var newScale = scale - e.deltaY * 0.01;

            // Limit the scaling from fully zoomed out to 10x
            newScale = Math.max(minScale, Math.min(newScale, maxScale));

            const container = document.getElementById('container').getBoundingClientRect();

            // This is where the mouse currently is (relative to the container)
            const targetX = e.clientX - container.left;
            const targetY = e.clientY - container.top;

            const currGapX = targetX - posX;
            const currGapY = targetY - posY;

            // This only works if the transform origin is in the top left
            posX = posX + currGapX - currGapX * (newScale / scale);
            posY = posY + currGapY - currGapY * (newScale / scale);

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
        if (currentTool !== Tools.ADD) {
            return;
        }
        // Add a little indicator of where you are
        addRectangle(event);

        // And take a screenshot of that section of the canvas
        addScreenshot(event);

        drawSplines();
    });
}

// Drag and drop code
let clickStartX, clickStartY;
let rectangleStartX, rectangleStartY;
let movingRectangle;

function move(e) {
    movingRectangle.style.left = rectangleStartX + (e.clientX - clickStartX) + 'px';
    movingRectangle.style.top = rectangleStartY + (e.clientY - clickStartY) + 'px';

    drawSplines();
}

function end() {
    container.removeEventListener('pointermove', move);
    container.removeEventListener('pointerup', end);
    container.removeEventListener('pointerleave', end);
}

function activate(event) {
    if (currentTool !== Tools.MOVE) {
        return;
    }
    if (event.target.classList.contains('rectangle') && event.target.classList.contains('frame')) {
        movingRectangle = event.target;
    } else {
        movingRectangle = event.target.parentNode;
    }

    clickStartX = event.clientX;
    clickStartY = event.clientY;

    rectangleStartX = parseInt(movingRectangle.style.left.slice(0, -2));
    rectangleStartY = parseInt(movingRectangle.style.top.slice(0, -2));

    container.addEventListener('pointermove', move, false);
    container.addEventListener('pointerup', end, false);
    container.addEventListener('pointerleave', end, false);
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
    newRectangle.classList.add('frame');

    // newRectangle.draggable = true;
    newRectangle.addEventListener('pointerdown', activate, false);

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

    // Create the new element
    const newDiv = document.createElement('div');
    newDiv.classList.add('snapshot');

    // Convert the canvas to an image and add it
    const image = new Image();
    image.src = imgString;
    newDiv.appendChild(image);

    // A title for the frame
    const newSpan = document.createElement('span');
    newSpan.innerHTML = 'Frame ' + shots.length;
    newDiv.appendChild(newSpan);

    // And a removal button
    const removeButton = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    removeButton.classList.add('feather', 'clickable');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', 'assets/feather-sprite.svg#x');
    removeButton.appendChild(use);
    removeButton.addEventListener('click', removeFrameClick);
    newDiv.appendChild(removeButton);

    document.getElementById('frames').appendChild(newDiv);
}

function removeFrameClick(evt) {
    // Get the frame you clicked on
    console.log(evt.target.parentNode.parentNode);
    // Get the index
    // Remove it from shots
    // Remove it from the rectangles
    // Reflow everything
}

function progressUpdate(perc, message) {
    document.getElementById("progressBar").style.width = perc + "%";
    document.getElementById("progressMessage").innerHTML = message;
}

function createClick(event) {
    event.stopPropagation();

    // Trigger the modal, clear the old video output
    document.getElementById('outputVideo').innerHTML = '<svg class="feather"><use href="assets/feather-sprite.svg#video" /></svg>';
    document.getElementById('outputVideo').classList.add('loading');
    document.getElementById('modal').style.display = "initial";
    progressUpdate(0, 'Starting...');

    DURATION_SECONDS = parseInt(document.getElementById('duration').value);
    const rawImage = document.getElementById('rawImage');
    const offsetScale = originalWidth / rawImage.width;

    let dimensionScaling;
    if (originalWidth * 16 / 9 > originalHeight) {
        dimensionScaling = (scalar) => {
            const widthScalar = rectangleWidth / rawImage.width;
            const width = widthScalar * scalar * originalWidth;
            return [width, width * 16 / 9];
        }
    } else {
        dimensionScaling = (scalar) => {
            const heightScalar = rectangleHeight / rawImage.height;
            const height = heightScalar * scalar * originalHeight;
            return [width * 9 / 16, height];
        }
    }

    pts = [];
    progressUpdate(1, 'Creating frames...');

    for (var i = 0; i < shots.length; i++) {
        const x1 = parseInt(shots[i].style.left.slice(0, -2)) * offsetScale;
        const y1 = parseInt(shots[i].style.top.slice(0, -2)) * offsetScale;
        const scalar = parseFloat(shots[i].style.transform.slice(6, -1));
        const dims = dimensionScaling(scalar);
        pts.push(new Frame(x1, y1, dims[0], dims[1]));
    }
    progressUpdate(2, 'Interpolating...');

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
    progressUpdate(3, 'Populating full paths...');

    // Create all of the paths
    let paths = [];
    if (shots.length == 2) {
        paths.push(new Line(pts[0], pts[1]));
    } else {
        // From point 0 to point 1 is a quadratic bezier
        paths.push(new QuadraticBezier(pts[0], cps[0], pts[1]));
        // For all middle points, it's cubic beziers
        for (var i = 2; i < shots.length - 1; i += 1) {
            paths.push(new CubicBezier(pts[i - 1], cps[(2 * (i - 1) - 1)], cps[(2 * (i - 1))], pts[i]));
        }
        // And the final one is a quadratic bezier (unless you're looping, TODO)
        i = shots.length - 1;
        paths.push(new QuadraticBezier(pts[i - 1], cps[(2 * (i - 1) - 1)], pts[i]));
    }

    // Figure out the overall lengths (and percentage)
    progressUpdate(4, 'Calculating all images...');

    let offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 1080;
    offscreenCanvas.height = 1920;

    if (offscreenCanvas.transferControlToOffscreen) {
        offscreenCanvas = offscreenCanvas.transferControlToOffscreen();
        worker = new Worker('./js/create-video-worker.js', { type: "module" });
        worker.onmessage = function (event) {
            progressUpdate(event.data.progress, event.data.message);
            if (event.data.videoBlob) {
                const url = webkitURL.createObjectURL(event.data.videoBlob);

                const video = document.createElement('video');
                video.controls = true;
                video.autoplay = true;
                video.loop = true;
                video.src = url;

                document.getElementById('outputVideo').classList.remove('loading');
                document.getElementById('outputVideo').innerHTML = '';
                document.getElementById('outputVideo').appendChild(video);
            }
        };

        const serializedPaths = [];
        for (var i = 0; i < paths.length; i++) {
            serializedPaths.push(paths[i].serialize());
        }

        worker.postMessage({
            canvas: offscreenCanvas,
            imageSrc: rawImage.src,
            paths: serializedPaths,
            duration: DURATION_SECONDS,
            fps: FPS,
        }, [offscreenCanvas]);
    } else {
        progressUpdate(100, 'Offscreen canvas is not supported in this browser.');
    }
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
    if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function dista(p_i, p_j) {
    return Math.sqrt(Math.pow(p_i.x - p_j.x, 2) + Math.pow(p_i.y - p_j.y, 2));
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

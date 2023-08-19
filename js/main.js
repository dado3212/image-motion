import {
    isNaturalScrolling
} from './util.js'

import {
    Point,
    Frame,
    Line,
    QuadraticBezier,
    CubicBezier,
} from './bezier.js'

// Global context
var shots = [
    /**
     * {
     *  rectangle: div,
     *  snapshot: div,
     * }
     */
];

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

    const fileSelector = document.getElementById('fileSelector');

    // Prevent default behavior for the dragover and drop events to allow dropping content
    body.addEventListener('dragover', function (evt) {
        evt.preventDefault();

        const upload = document.getElementById('upload');
        if (upload) {
            upload.classList.add('hover');
        }
    });
    body.addEventListener('dragleave', function (evt) {
        evt.preventDefault();

        const upload = document.getElementById('upload');
        if (upload) {
            upload.classList.remove('hover');
        }
    });

    // Set up the button for file selection
    fileSelector.addEventListener('change', function (event) {
        // Clear the upload element, and remove the predrop flex styling
        const upload = document.getElementById('upload');
        if (upload) {
            upload.remove();
        }
        document.getElementById('container').classList.remove('predrop');

        // Load the image
        uploadImage(event.target.files[0]);
    });

    body.addEventListener('drop', function (evt) {
        // Prevent default
        evt.stopPropagation();
        evt.preventDefault();

        // Get the dropped file from the event data
        const file = evt.dataTransfer.files[0];

        if (!file.type.startsWith('image/')) {
            const upload = document.getElementById('upload');
            if (upload) {
                upload.classList.remove('hover');
            }

            alert('This only accepts images, the file is "' + file.type + '".');
            return;
        }

        // Clear the upload element, and remove the predrop flex styling
        const upload = document.getElementById('upload');
        if (upload) {
            upload.remove();
        }
        document.getElementById('container').classList.remove('predrop');

        // Load the image
        uploadImage(file);
    });

    document.getElementById('container').addEventListener('mousemove', function (event) {
        if (currentTool !== Tools.ADD) {
            return;
        }
        // If there's no image, we don't need to track because we don't SHOW
        // the rectangle
        if (!canvas && !ctx) {
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
    document.getElementById('loop').addEventListener('click', (_) => {
        if (canvas && ctx) {
            drawSplines();
        }
    });

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

        // Make the rectangle visible (if an image exists)
        if (canvas && ctx) {
            document.getElementById('rectangle').style.display = "initial";
        }
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

    if (!document.getElementById('canvas').transferControlToOffscreen) {
        if (/iP(hone|od|ad)/.test(navigator.platform)) {
            alert(`Your iOS version is not supported. Please use iOS 16.4+, or swap to a desktop computer.`);
        } else {
            alert('This browser does not support offscreen canvases. Try an updated desktop browser: https://caniuse.com/mdn-api_htmlcanvaselement_transfercontroltooffscreen');
        }
    }
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
            maxScale = 10 * Math.max(rectangleHeight / rawImage.height, rectangleWidth / rawImage.width);

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

        const container = document.getElementById('container').getBoundingClientRect();

        // Zoom mode
        if (e.ctrlKey) {
            if (e.deltaY > 80 || e.deltaY < -80) {
                var newScale = scale - e.deltaY * 0.001;
            } else {
                var newScale = scale - e.deltaY * 0.01;
            }

            // Limit the scaling from fully zoomed out to 10x
            newScale = Math.max(minScale, Math.min(newScale, maxScale));

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
            const rawImage = document.getElementById('rawImage').getBoundingClientRect();

            // Make sure that the image doesn't go out of bounds
            posX = Math.min(Math.max(posX, -1 * rawImage.width + 5), container.width - 5);
            posY = Math.min(Math.max(posY, -1 * rawImage.height + 5), container.height - 5);
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
        const newRectangle = addRectangle();

        // And take a screenshot of that section of the canvas
        const newSnapshot = addScreenshot(newRectangle, shots.length);

        shots.push({
            rectangle: newRectangle,
            snapshot: newSnapshot,
        })

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

    // When you've finished adjusting, update the image
    for (var i = 0; i < shots.length; i++) {
        if (shots[i].rectangle == movingRectangle) {
            shots[i].snapshot.replaceChild(
                getScreenshotImageForRectangle(movingRectangle),
                shots[i].snapshot.children[0]
            );
            break;
        }
    }
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

function addRectangle() {
    const originalElement = document.getElementById('rectangle');
    const newRectangle = originalElement.cloneNode(true);

    // Clear the unique ID
    newRectangle.id = '';

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

    return newRectangle;
}

function getScreenshotImageForRectangle(rectangle) {
    // Get the last element that was added, and the x, y
    const rectangleBounds = rectangle.getBoundingClientRect();
    const rawImage = document.getElementById('rawImage');
    const imageBounding = rawImage.getBoundingClientRect();

    const x = parseInt(rectangle.style.left.slice(0, -2)) / imageBounding.width * scale * originalWidth;
    const y = parseInt(rectangle.style.top.slice(0, -2)) / imageBounding.height * scale * originalHeight;
    const width = rectangleBounds.width / imageBounding.width * originalWidth;
    const height = rectangleBounds.height / imageBounding.height * originalHeight;

    // Convert the canvas to an image and add it
    const image = new Image();

    let offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 1080;
    offscreenCanvas.height = 1920;
    offscreenCanvas = offscreenCanvas.transferControlToOffscreen();

    const scWorker = new Worker('./js/screenshot.js', { type: "module" });
    scWorker.onmessage = function (event) {
        image.src = event.data.src;
    };
    scWorker.postMessage({
        canvas: offscreenCanvas,
        imageSrc: rawImage.src,
        frame: [x, y, width, height],
    }, [offscreenCanvas]);

    return image;
}

function addScreenshot(rectangle) {
    // Create the new element
    const newDiv = document.createElement('div');
    newDiv.classList.add('snapshot');

    const image = getScreenshotImageForRectangle(rectangle);

    // image.src = imgString;
    newDiv.appendChild(image);

    // A title for the frame
    const newSpan = document.createElement('span');
    newSpan.innerHTML = 'Frame ' + (shots.length + 1);
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

    return newDiv;
}

function removeFrameClick(evt) {
    // Get the frame you clicked on
    let selectedSnapshot;
    if (evt.target.nodeName == 'use') {
        selectedSnapshot = evt.target.parentNode.parentNode;
    } else {
        selectedSnapshot = evt.target.parentNode;
    }

    // Get the index
    let allSnapshots = document.querySelectorAll('.snapshot');
    for (var i = 0; i < allSnapshots.length; i++) {
        if (allSnapshots[i] == selectedSnapshot) {
            break;
        }
    }

    // Remove the rectangle
    shots[i].rectangle.remove();

    // Remove the frame
    shots[i].snapshot.remove();

    // Remove it from shots
    const newShots = [].concat(shots.slice(0, i), shots.slice(i + 1));
    shots = newShots;

    // Adjust the names of the remaining rectangles
    for (var i = 0; i < shots.length; i++) {
        shots[i].rectangle.firstChild.innerHTML = '' + (i + 1);
        shots[i].snapshot.children[1].innerHTML = 'Frame ' + (i + 1);
    }

    // Adjust the names of the remaining frames
    drawSplines();
}

function progressUpdate(category, newClass, message, percentage) {
    const categoryElement = document.getElementById(`status_${category}`);
    if (newClass == null) {
        categoryElement.classList.remove('wip', 'done');
    } else {
        if (!categoryElement.classList.contains(newClass)) {
            categoryElement.classList.remove('wip', 'done');
            categoryElement.classList.add(newClass);
        }
    }
    // Clear the progress bar if it exists
    if (newClass != 'wip' && categoryElement.children.length === 1) {
        categoryElement.children[0].remove();
    }
    if (message != null) {
        categoryElement.innerHTML = message;
    }
    if (percentage != null) {
        // If it doesn't have a progress bar, add it
        if (categoryElement.children.length === 0) {
            categoryElement.innerHTML += '<div class="progress-container"><div class="progress-bar" id="progressBar"></div></div>';
        }
        // Otherwise, shift the width
        if (categoryElement.children.length === 1) {
            categoryElement.children[0].children[0].style.width = `${percentage}%`;
        }
    }
}

function createClick(event) {
    event.stopPropagation();

    // Trigger the modal, clear the old video output
    document.getElementById('outputVideo').innerHTML = '<svg class="feather"><use href="assets/feather-sprite.svg#video" /></svg>';
    document.getElementById('outputVideo').classList.add('loading');
    document.getElementById('modal').style.display = "initial";

    // Set the defaults
    progressUpdate(0, 'wip', '1. Creating paths...');
    progressUpdate(1, null, '2. Interpolating frames...');
    progressUpdate(2, null, '3. Stitching frames...');
    progressUpdate(3, null, '4. Downloading...');

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

    const loop = document.getElementById('loop').checked && shots.length > 2;

    pts = [];

    for (var i = 0; i < shots.length; i++) {
        const x1 = parseInt(shots[i].rectangle.style.left.slice(0, -2)) * offsetScale;
        const y1 = parseInt(shots[i].rectangle.style.top.slice(0, -2)) * offsetScale;
        const scalar = parseFloat(shots[i].rectangle.style.transform.slice(6, -1));
        const dims = dimensionScaling(scalar);
        pts.push(new Frame(x1, y1, dims[0], dims[1]));
    }
    if (loop) {
        pts.push(pts[0].clone());
        pts.push(pts[1].clone());
        pts.push(pts[2].clone());
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
    if (loop) {
        pts = pts.slice(0, -2);
        cps = [].concat(cps.slice(-3, -2), cps.slice(0, -3));
    }

    // Create all of the paths
    let paths = [];
    if (shots.length == 2) {
        paths.push(new Line(pts[0], pts[1]));
    } else if (loop) {
        for (var i = 0; i < shots.length; i++) {
            paths.push(new CubicBezier(pts[i], cps[2 * i], cps[2 * i + 1], pts[i + 1]));
        }

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
    progressUpdate(0, 'done', '1. Created paths.');
    progressUpdate(1, 'wip');

    // Download the video
    worker = new Worker('./js/create-video-worker.js', { type: "module" });
    worker.onmessage = function (event) {
        if (event.data.error) {
            // TODO: Handle this...somehow.
        }
        if (event.data.stage) {
            progressUpdate(event.data.stage, event.data.status, event.data.message, event.data.percentage);
        }
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

            progressUpdate(2, 'done', '3. Stitched frames.');
            progressUpdate(3, 'wip');
        }
    };

    const serializedPaths = [];
    for (var i = 0; i < paths.length; i++) {
        serializedPaths.push(paths[i].serialize());
    }

    let offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 1080;
    offscreenCanvas.height = 1920;
    offscreenCanvas = offscreenCanvas.transferControlToOffscreen();

    worker.postMessage({
        canvas: offscreenCanvas,
        imageSrc: rawImage.src,
        paths: serializedPaths,
        duration: DURATION_SECONDS,
        fps: FPS,
    }, [offscreenCanvas]);
}

function clearFrames() {
    for (var i = 0; i < shots.length; i++) {
        shots[i].rectangle.remove();
        shots[i].snapshot.remove();
    }
    shots = [];

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
    const x = parseInt(shots[i].rectangle.style.left.slice(0, -2)) + rectangleWidth * parseFloat(shots[i].rectangle.style.transform.slice(6, -1)) / 2;
    const y = parseInt(shots[i].rectangle.style.top.slice(0, -2)) + rectangleHeight * parseFloat(shots[i].rectangle.style.transform.slice(6, -1)) / 2;
    pts.push(new Point(x, y));
    return pts;
}

function drawSplines() {
    clear();
    pts = [];

    for (var i = 0; i < shots.length; i++) {
        pts = addPts(pts, i);
    }

    const loop = document.getElementById('loop').checked && shots.length > 2;

    if (loop) {
        // To get every segment to be a cubic bezier we
        // 1) add the first point again (so that it loops)
        // 2) add the second point again (so that the loop path is cubic)
        // 3) add the third point again (so that we have a version of the
        //    first path that's cubic instead of quadratic)

        // When it comes time to actually build the paths we'll remove these
        pts = addPts(pts, 0);
        pts = addPts(pts, 1);
        pts = addPts(pts, 2);
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

    if (loop) {
        // Remove the 2 duplicate points (still need 1 to make it loop :D)
        pts = pts.slice(0, -2);
        // Rearrange this so that it starts with the second control point of p1
        // goes through every other cp just once, and ends on the first control
        // point of p1
        cps = [].concat(cps.slice(-3, -2), cps.slice(0, -3));
    }

    drawCurvedPath(cps, pts, loop);
}

function drawCurvedPath(cps, pts, loop) {
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#029bd2';

    if (pts.length < 2) return;
    if (pts.length == 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();
    } else if (loop) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (var i = 1; i < pts.length; i++) {
            ctx.bezierCurveTo(
                cps[2 * (i - 1)].x, cps[2 * (i - 1)].y,
                cps[2 * (i - 1) + 1].x, cps[2 * (i - 1) + 1].y,
                pts[i].x, pts[i].y);
        }
        ctx.stroke();
    } else {
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


// Global context
var shots = [];

var currentScale = 1;
var scaleFactor = 0.001; // Adjust this value to control the zoom speed

var offsetX = 0;
var offsetY = 0;

/* 9:16 aspect ratio, adjust width and height as needed */
const rectangleWidth = 180;
const rectangleHeight = 320;

let originalWidth = 0;
let originalHeight = 0;

let file_name = '';

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
            offsetX = (tabWidth - rawImage.width) / 2;
            document.getElementById('image').style.transform = `translate(${offsetX}px, 0px)`;

            // Make the container visible
            document.getElementById('container').style.display = "initial";

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

    document.addEventListener('mousemove', function (event) {
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
    window.addEventListener('wheel', function (event) {
        // event.preventDefault();

        // Zoom mode
        if (event.ctrlKey) {
            var newScale = currentScale + (event.deltaY * scaleFactor);

            // Limit the scale to a reasonable range (e.g., between 0.5 and 2)
            newScale = Math.max(0.1, Math.min(newScale, 3));

            // Update the current scale for the next wheel event
            currentScale = newScale;
        } else {
            // Pan mode
            if (naturalScroll) {
                offsetX += (event.deltaX);
                offsetY += (event.deltaY);
            } else {
                offsetX -= (event.deltaX);
                offsetY -= (event.deltaY);
            }
        }
        document.getElementById('image').style.transform = `scale(${currentScale}) translate(${offsetX}px, ${offsetY}px)`;
        // Keep the rectangles in the same place
    });

    document.addEventListener('click', function (event) {
        // Add a little indicator of where you are
        addRectangle(event);

        // And take a screenshot of that section of the canvas
        // And add it to a floating UI of all of the shots
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

    const x = (originalBounding.left - imageBounding.left) / currentScale;
    const y = (originalBounding.top - imageBounding.top) / currentScale;

    newRectangle.style.left = x + 'px';
    newRectangle.style.top = y + 'px';
    newRectangle.style.transform = `scale(${1 / currentScale})`;

    const span = document.createElement('span');
    span.innerHTML = (shots.length + 1)
    newRectangle.appendChild(span);

    shots.push(newRectangle);

    console.log(createCommand());
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

function createCommand() {
    // Can't animate a single keyframe, just crop the image dumbass.
    if (shots.length <= 1) {
        return '';
    }

    const durationSeconds = 10; // number of seconds
    const fps = 30; // fps

    const duration = durationSeconds * fps;

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
    command += "d=" + duration; // number of frames for total run
    command += ":fps=" + fps;
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

    const len = duration / (shots.length - 1);

    // For each shot, we need to get its x/y.
    for (var i = 0; i < shots.length - 1; i++) {
        const x1 = parseInt(shots[i].style.left.slice(0, -2)) * offsetScale + ffmpegOffsetX;
        const y1 = parseInt(shots[i].style.top.slice(0, -2)) * offsetScale + ffmpegOffsetY;
        const zoom1 = zoomScalar / parseFloat(shots[i].style.transform.slice(6, -1));

        const x2 = parseInt(shots[i + 1].style.left.slice(0, -2)) * offsetScale + ffmpegOffsetX;
        const y2 = parseInt(shots[i + 1].style.top.slice(0, -2)) * offsetScale + ffmpegOffsetY;
        const zoom2 = zoomScalar / parseFloat(shots[i + 1].style.transform.slice(6, -1));

        if (i == shots.length - 2) {
            xExpression += x1 + ' + ' + (x2 - x1) + ' * (on - ' + len * i + ') / ' + len;
        } else {
            xExpression += 'if('
            + 'lte(on, ' + len * (i + 1) + '),'
            + x1 + ' + ' + (x2 - x1) + ' * (on - ' + len * i + ') / ' + len + ',';
        }

        if (i == shots.length - 2) {
            yExpression += y1 + ' + ' + (y2 - y1) + ' * (on - ' + len * i + ') /' + len;
        } else {
            yExpression += 'if('
            + 'lte(on, ' + len * (i + 1) + '),'
            + y1 + ' + ' + (y2 - y1) + ' * (on - ' + len * i + ') / ' + len + ',';
        }

        if (i == shots.length - 2) {
            zoomExpression += zoom1 + ' + ' + (zoom2 - zoom1) + ' * (on - ' + len * i + ') / ' + len;
        } else {
            zoomExpression += 'if('
            + 'lte(on, ' + len * (i + 1) + '),'
            + zoom1 + ' + ' + (zoom2 - zoom1) + ' * (on - ' + len * i + ') / ' + len + ',';
        }
    }
    for (var i = 0; i < shots.length - 2; i++) {
        xExpression += ')';
        yExpression += ')';
        zoomExpression += ')';
    }
    // command = command.substring(0, command.length - 1);
    command += xExpression + "'";
    command += yExpression + "'";
    command += zoomExpression + "'";


    command += '" -t ' + durationSeconds + ' -pix_fmt yuv420p -y output_video.mp4'; // suffix

    return command;
    //     ffmpeg -loop 1 -i /Users/abeals/Downloads/Spencer_16.jpg \
    // -filter_complex "\
    //    [0:v]zoompan=z='min(zoom+0.0015,1.5)':d=125:x='if(lte(on,1),iw/2,iw/2-160)':y='if(lte(on,1),ih/2,ih/2-90)':s=1920x1080, \
    //    zoompan=z='1.5':d=375:x='iw/2-160':y='ih/2-90+0.0005*on*ih':s=1920x1080:fps=25, \
    //    zoompan=z='min(zoom+0.0005,1.5)':d=125:x='iw/2-160':y='ih/2-90+0.001*on*ih':s=1920x1080:fps=25, \
    //    zoompan=z='min(max(zoom,1.5),1.5+0.0001*(on-625))':d=500:x='iw/2-160':y='ih/2-90+0.0005*on*ih':s=1920x1080:fps=25" \
    //    -t 10 -pix_fmt yuv420p -y output_video.mp4
}

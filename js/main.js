
// Global context
var shots = [];

var currentScale = 1;
var scaleFactor = 0.001; // Adjust this value to control the zoom speed

var offsetX = 0;
var offsetY = 0;

/* 9:16 aspect ratio, adjust width and height as needed */
const rectangleWidth = 180;
const rectangleHeight = 320;

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
            const width = rawImage.width;
            const height = rawImage.height;
            const tabHeight = window.innerHeight - 15;
            const tabWidth = window.innerWidth;

            rawImage.width = tabHeight * width / height;
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
    newRectangle.style.transform = `scale(${1/currentScale})`;

    const span = document.createElement('span');
    span.innerHTML = (shots.length + 1)
    newRectangle.appendChild(span);

    shots.push(newRectangle);
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

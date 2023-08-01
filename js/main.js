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

    const imageDisplay = document.getElementById('imageDisplay');

    // Check if the dropped file is an image
    if (!file || !file.type.startsWith('image/')) {
        alert('What the heck did you drag?');

        return;
    }
    // Create a FileReader object to read the file
    const reader = new FileReader();

    // Set up the FileReader event when the image is loaded
    reader.onload = (e) => {
        imageDisplay.onload = (e) => {
            // Scale the image and set the URL
            const width = imageDisplay.width;
            const height = imageDisplay.height;
            const tabHeight = window.innerHeight - 30;
            console.log(width, height, tabHeight);

            imageDisplay.style.display = "initial";

            imageDisplay.width = tabHeight * width / height;
            imageDisplay.height = tabHeight;

            document.getElementById('rectangle').style.display = "initial";

            setupImageListeners();
        };
        imageDisplay.src = e.target.result;
    };

    // Read the file as a data URL
    reader.readAsDataURL(file);
}

//
function setupImageListeners() {
    const naturalScroll = isNaturalScrolling();

    var currentScale = 1;
    var scaleFactor = 0.001; // Adjust this value to control the zoom speed

    var offsetX = 0;
    var offsetY = 0;

    document.addEventListener('mousemove', function (event) {
        var rectangle = document.getElementById('rectangle');
        var offsetX = 90; // Half of the rectangle width
        var offsetY = 160; // Half of the rectangle height

        // Calculate the new position of the rectangle based on the cursor position
        var x = event.clientX - offsetX;
        var y = event.clientY - offsetY;

        // Set the new position for the rectangle
        rectangle.style.left = x + 'px';
        rectangle.style.top = y + 'px';
    });

    // Detect the wheel event (including the trackpad pinch gesture)
    window.addEventListener('wheel', function (event) {
        // event.preventDefault();

        // Zoom mode
        if (event.ctrlKey) {
            var newScale = currentScale + (event.deltaY * scaleFactor);

            // Limit the scale to a reasonable range (e.g., between 0.5 and 2)
            newScale = Math.max(0.1, Math.min(newScale, 3));

            console.log(newScale);

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
            console.log(offsetX, offsetY);
        }
        imageDisplay.style.transform = `scale(${currentScale}) translate(${offsetX}px, ${offsetY}px)`;
    });
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

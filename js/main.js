function drop(evt) {
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

    const imageDisplay = document.getElementById('imageDisplay');

    // Check if the dropped file is an image
    if (file && file.type.startsWith('image/')) {
        // Create a FileReader object to read the file
        const reader = new FileReader();

        // Set up the FileReader event when the image is loaded
        reader.onload = (e) => {
            imageDisplay.onload = (e) => {
                const width = imageDisplay.width;
                const height = imageDisplay.height;
                const tabHeight = window.innerHeight - 30;
                console.log(width, height, tabHeight);

                imageDisplay.style.display = "initial";

                imageDisplay.width = tabHeight * width / height;
                imageDisplay.height = tabHeight;

                document.getElementById('image').remove();

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

                var currentScale = 1;
                var scaleFactor = 0.001; // Adjust this value to control the zoom speed

                // Detect the wheel event (including the trackpad pinch gesture)
                window.addEventListener('wheel', function(event) {
                    // event.preventDefault();

                    // Calculate the new scale based on the wheel event
                    var wheelDelta = event.deltaY;

                    // Zoom mode
                    if (event.ctrlKey) {
                        var newScale = currentScale + (wheelDelta * scaleFactor);

                        // Limit the scale to a reasonable range (e.g., between 0.5 and 2)
                        newScale = Math.max(0.1, Math.min(newScale, 3));

                        console.log(newScale);

                        // Apply the new scale transformation to the image
                        imageDisplay.style.transform = `scale(${newScale})`;

                        // Update the current scale for the next wheel event
                        currentScale = newScale;
                    } else {
                        // Pan mode

                    }

                });
            };
            imageDisplay.src = e.target.result;
        };

        reader.onprogress = (event) => {
            if (event.lengthComputable) {
                const progress = (event.loaded / event.total) * 100;
                console.log(progress);
                //   progressBar.value = progress;
            }
        };

        // Read the file as a data URL
        reader.readAsDataURL(file);
    } else {
        // TODO: Handle the error case
    }
}

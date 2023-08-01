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
        reader.onload = async (e) => {

            const tempImage = new Image();

            tempImage.onload = () => {
                // Get the dimensions of the dropped image
                const width = tempImage.width;
                const height = tempImage.height;

                // Set the JPG data URL as the source of the image
                imageDisplay.src = jpgDataURL;
            };

            tempImage.src = e.target.result;
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

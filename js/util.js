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

// Courtesy of https://gist.github.com/ilblog/5fa2914e0ad666bbb85745dbf4b3f106#file-clock-html-L8
function convertDataURIToBinary(dataURI) {
    var base64 = dataURI.replace(/^data[^,]+,/, '');
    var raw = window.atob(base64);
    var rawLength = raw.length;

    var array = new Uint8Array(new ArrayBuffer(rawLength));
    for (var i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }
    return array;
}

function screenshot(image, x, y, width, height) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const newWidth = Math.min(width, 1080);
    const newHeight = Math.min(height, 1920);

    // Set the canvas dimensions
    canvas.width = newWidth;
    canvas.height = newHeight;

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
        newWidth,
        newHeight,
    );

    return canvas.toDataURL('image/jpeg', 1 /* max quality */);
}

export {
    isNaturalScrolling,
    convertDataURIToBinary,
    screenshot
}

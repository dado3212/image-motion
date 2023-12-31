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
    var raw = atob(base64);
    var rawLength = raw.length;

    var array = new Uint8Array(new ArrayBuffer(rawLength));
    for (var i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }
    return array;
}

export {
    isNaturalScrolling,
    convertDataURIToBinary
}

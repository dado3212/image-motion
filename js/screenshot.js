import {
    convertDataURIToBinary
} from './util.js'

self.onmessage = async function(event) {
    const offscreenCanvas = event.data.canvas;
    const offscreenContext = offscreenCanvas.getContext('2d');
    offscreenContext.fillStyle = 'white';

    const rawImg = await createImageBitmap(new Blob([convertDataURIToBinary(event.data.imageSrc)], { type: 'image/jpeg' }));

    let imgString = await screenshot(rawImg, offscreenCanvas, offscreenContext, event.data.frame[0], event.data.frame[1], event.data.frame[2], event.data.frame[3]);
    self.postMessage({
        src: imgString,
    });
};

async function screenshot(image, offscreenCanvas, ctx, x, y, width, height) {
    ctx.fillRect(0, 0, 1080, 1920);

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
        1080,
        1920,
    );

    const blob = await offscreenCanvas.convertToBlob({type: 'image/jpeg', quality: 0.9 /* max quality */});

    return new FileReaderSync().readAsDataURL(blob);
}

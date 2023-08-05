# image-panner
We're panning (they're images).

curl https://unpkg.com/ffmpeg.js@3.1.9001/ffmpeg-worker-mp4.js -o ffmpeg-worker-mp4.js
https://github.com/Kagami/ffmpeg.js/

/Applications/Google Chrome.app/Contents/MacOS/Google\ Chrome --allow-file-access-from-files

python -m SimpleHTTPServer 8000

https://fjorge.com/insights/blog/can-bezier-curves-be-quickly-parameterized-by-arc-length/

https://gist.github.com/ilblog/5fa2914e0ad666bbb85745dbf4b3f106#file-clock-html-L8

https://github.com/feathericons/feather#license

## Things to do
* UI pass.
* Hover/highlight/help text on where to drop.
* Proper image handling of different filetypes.
* Proper error message handling in the modal.
* Improve text of the modal
* Fix the loop button.
* Make it so that you can't select white.
* Make it so that you can see the full path that it will follow?
* Adjust the min zoom?
* Make it so that you can delete a frame?
* Make it so that you can linger in some places for longer.

## Known bugs
1. When you move a frame, the layer preview doesn't update

## Author's Note
If you're interested in programatically following bezier curves with ffmpeg's `zoompan`, I used to have this functionality until I ran into an inability to reparametize the curves by arc-length for smooth camera moves, and swapped to a fully in-browser solution. The relevant code is working around `62379f45044fd8b7254680064ad89b1367d3c420` or `9cdc77ba912cbb9914bdb120afd2f9cbf168a77e`.

# image-panner
We're panning (they're images).

curl https://unpkg.com/ffmpeg.js@3.1.9001/ffmpeg-worker-mp4.js -o ffmpeg-worker-mp4.js
https://github.com/Kagami/ffmpeg.js/

/Applications/Google Chrome.app/Contents/MacOS/Google\ Chrome --allow-file-access-from-files

python -m SimpleHTTPServer 8000

## Author's Note
If you're interested in programatically following bezier curves with ffmpeg's `zoompan`, I used to have this functionality until I ran into an inability to reparametize the curves by arc-length for smooth camera moves, and swapped to a fully in-browser solution. The relevant code is working around `62379f45044fd8b7254680064ad89b1367d3c420` or `9cdc77ba912cbb9914bdb120afd2f9cbf168a77e`.

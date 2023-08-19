# <img src="/assets/favicon/android-chrome-192x192.png?raw=true" width="30" alt="Logo"/> Image Motion

## The Problem
My brother had some art pieces that he had created that he wanted to talk about on his Instagram. This involved moving a camera over the image. Unfortunately there was no good way to get this to be smooth manually.

## The Solution
I created Image Motion as a tool to turn static images into videos. With a normal Ken Burns effect you can define two frames and it will tween between them. This is a superpowered version of that, allowing you to define multiple frames (at differing zooms and locations) and seamlessly pan over them, for however long a video you want to make.

## Details
My first use of Web Workers and WebASM through the fmpeg port. If you want to check it out, it's live at https://alexbeals.com/projects/image-motion.  Read more about the project [on my blog](http://blog.alexbeals.com/posts/image-motion).

## Credits

Thanks to a variety of resources.

### ffmpeg.js

- Repository: [ffmpeg.js](https://github.com/Kagami/ffmpeg.js/)
- License: [LPGL 2.1 License](https://github.com/Kagami/ffmpeg.js/blob/master/LICENSE.MP4)
- Author: Kagami

### feather (icons)

- Repository: [feather](https://github.com/feathericons/feather)
- License: [MIT License](https://github.com/feathericons/feather/blob/master/LICENSE)
- Author: feather

### Misc
- This [blog post](https://fjorge.com/insights/blog/can-bezier-curves-be-quickly-parameterized-by-arc-length/) around reparameterized bezier curves by arc length (and how there's not a closed form solution).
- This [Gist](https://gist.github.com/ilblog/5fa2914e0ad666bbb85745dbf4b3f106#file-clock-html-L8) with some practical examples of ffmpeg web workers
-

---

## Debugging
You can locally create an instance by running `python3 -m http.server 8000` in the repo checked out. This is necessary because Chrome by default doesn't allow web workers with `file://`.

## TODO

No project is ever truly done. These are the things that I *could* work on, were I to spend more time on it. Until someone asks though, these will remain here.
* Show errors properly in modal
* Make it so that you can't select out of bounds.
* Make it so that you can see the full path that it will follow?
* Make it so that you can linger in some places for longer.
* Fix the overlapped frames
* Should mostly linear frames use a different tension?
* Customize aspect ratio
* Preview?

## Author's Note
If you're interested in programatically following bezier curves with ffmpeg's `zoompan`, I used to have this functionality until I ran into an inability to reparametize the curves by arc-length for smooth camera moves, and swapped to a fully in-browser solution. The relevant code is working around `62379f45044fd8b7254680064ad89b1367d3c420` or `9cdc77ba912cbb9914bdb120afd2f9cbf168a77e`.

**Created by Alex Beals © 2023**

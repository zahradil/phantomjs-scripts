phantomjs-scripts
=================

Some note very useful scripts to be used with [PhantomJS](http://phantomjs.org/).

image-scraper.js
----------------

Usage:

`<scriptname> <url> <destination directory> <jquery selector for a element>`

This script load the page, apply the selector and collects all links in href attribute of a element.
Then all links are downloaded to destionation directory. If any file already exists in dest dir,
link is not downloaded, so script can be run the second time without re-downloading the files.

Notes:

* Destination directory must end with path delimiter (`\` or `/`)

* This need be run with `--web-security` off:

    `phantomjs.exe --web-security=false image-scraper.js "http://example.com" .\dest-dir\ a.photoThumb`


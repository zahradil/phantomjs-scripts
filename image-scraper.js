/*

===================================
  image-scraper.js
===================================

a phantom-js script

Author: Jiri Zahradil, 2014

<scriptname> <url> <destination directory> <jquery selector for a element>

This script load the page, apply the selector and collects all links in href attribute of a element.
Then all links are downloaded to destionation directory. If any file already exists in dest dir,
link is not downloaded, so script can be run the second time without re-downloading the files.

Destination directory must end with path delimiter (\ or /)

Note: this should be run with --web-security=false:

    phantomjs.exe --web-security=false image-scraper.js "http://example.com" .\dest-dir\ a.photoThumb


*/

var fs = require('fs');
var webpage = require('webpage');

var BASE64_DECODE_CHARS = new Array(
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63,
    52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
    -1,  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14,
    15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1,
    -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1
);

// helper function for serialize/deserialize of data from webpage
// environment
function decode(str) {
    /*jshint maxstatements:30, maxcomplexity:30 */
    var c1, c2, c3, c4, i = 0, len = str.length, out = "";
    while (i < len) {
        do {
            c1 = BASE64_DECODE_CHARS[str.charCodeAt(i++) & 0xff];
        } while (i < len && c1 === -1);
        if (c1 === -1) {
            break;
        }
        do {
            c2 = BASE64_DECODE_CHARS[str.charCodeAt(i++) & 0xff];
        } while (i < len && c2 === -1);
        if (c2 === -1) {
            break;
        }
        out += String.fromCharCode((c1 << 2) | ((c2 & 0x30) >> 4));
        do {
            c3 = str.charCodeAt(i++) & 0xff;
            if (c3 === 61)
            return out;
            c3 = BASE64_DECODE_CHARS[c3];
        } while (i < len && c3 === -1);
        if (c3 === -1) {
            break;
        }
        out += String.fromCharCode(((c2 & 0XF) << 4) | ((c3 & 0x3C) >> 2));
        do {
            c4 = str.charCodeAt(i++) & 0xff;
            if (c4 === 61) {
                return out;
            }
            c4 = BASE64_DECODE_CHARS[c4];
        } while (i < len && c4 === -1);
        if (c4 === -1) {
            break;
        }
        out += String.fromCharCode(((c3 & 0x03) << 6) | c4);
    }
    return out;
};

function _internal_download_file_in_page(url) {
    
    // helper function encode for serialize/deserialize 
    // of data from webpage environment
    var BASE64_ENCODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
     /**
     * Base64 encodes a string, even binary ones. Succeeds where
     * window.btoa() fails.
     *
     * @param  String  str  The string content to encode
     * @return string
     */
    function encode(str) {
        /*jshint maxstatements:30 */
        var out = "", i = 0, len = str.length, c1, c2, c3;
        while (i < len) {
            c1 = str.charCodeAt(i++) & 0xff;
            if (i === len) {
                out += BASE64_ENCODE_CHARS.charAt(c1 >> 2);
                out += BASE64_ENCODE_CHARS.charAt((c1 & 0x3) << 4);
                out += "==";
                break;
            }
            c2 = str.charCodeAt(i++);
            if (i === len) {
                out += BASE64_ENCODE_CHARS.charAt(c1 >> 2);
                out += BASE64_ENCODE_CHARS.charAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4));
                out += BASE64_ENCODE_CHARS.charAt((c2 & 0xF) << 2);
                out += "=";
                break;
            }
            c3 = str.charCodeAt(i++);
            out += BASE64_ENCODE_CHARS.charAt(c1 >> 2);
            out += BASE64_ENCODE_CHARS.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
            out += BASE64_ENCODE_CHARS.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6));
            out += BASE64_ENCODE_CHARS.charAt(c3 & 0x3F);
        }
        return out;
    };
    /**
     * Performs an AJAX request.
     *
     * @param   String   url      Url.
     * @param   String   method   HTTP method (default: GET).
     * @param   Object   data     Request parameters.
     * @param   Boolean  async    Asynchroneous request? (default: false)
     * @param   Object   settings Other settings when perform the ajax request
     * @return  String            Response text.
     */
    function sendAJAX(url, method, data, async, settings) {
        var xhr = new XMLHttpRequest(),
            dataString = "",
            dataList = [];
        method = method && method.toUpperCase() || "GET";
        var contentType = settings && settings.contentType || "application/x-www-form-urlencoded";
        xhr.open(method, url, !!async);
        xhr.overrideMimeType("text/plain; charset=x-user-defined");
        if (method === "POST") {
            if (typeof data === "object") {
                for (var k in data) {
                    dataList.push(encodeURIComponent(k) + "=" + encodeURIComponent(data[k].toString()));
                }
                dataString = dataList.join('&');
            } else if (typeof data === "string") {
                dataString = data;
            }
            xhr.setRequestHeader("Content-Type", contentType);
        }
        xhr.send(method === "POST" ? dataString : null);
        return xhr.responseText;
    };

    // main code that is executed within webpage 
    // this fragment downloads the file and serializes it back to phantomjs
    try {
        data = sendAJAX(url, false, null, false);
    } catch (e) {
        if (e.name === "NETWORK_ERR" && e.code === 101) {
            console.log("getBinary(): Unfortunately, you cannot make cross domain ajax requests");
        }else{
            console.log("getBinary(): Error while fetching " + url);
        }
        throw e;
    };

    return encode(data);
};

/* function to be called for downloading file
   first parameter has to be a live webpage
   with correct setup (webSecurityEnabled etc.)
   please note, that main phantomjs environment cannot be used.
  
      pg - webpage object to be used for environment
      url - url to download
      fn - local filename where to save downloaded file data
*/
function page_download_file(pg, url, fn) {
    var output = pg.evaluate(_internal_download_file_in_page, url);
    fs.write(fn, decode(output), 'wb');
}


// main entrypoint - parsing script parameters

var system = require('system'), URL, SAVE_DIR, JQUERY_SELECTOR;
if (system.args.length < 4) {
    console.log('Usage: <scriptname> URL directory jquery');
    phantom.exit(1);
}
URL = system.args[1];
SAVE_DIR = system.args[2];
JQUERY_SELECTOR = system.args.slice(3, system.args.length).join(" ");

// ----------------------------------------------------------------------------

console.log("scraping images, saving to ["+SAVE_DIR+"]");

// few helper funtions
function getval(arr, name) {
    var i, iLen;
    for (i=0, iLen = arr.length; i<iLen; ++i) {
        if (arr[i]["name"] == name) {
            return arr[i]["value"];
        }
    }
    return null;
}
function right(x, len) {
    return x.substr(x.length - len);
}
function left(x, len) {
    return x.substr(0, len);
}
function base_name(str)
{
   var base = new String(str).substring(str.lastIndexOf('/') + 1);
   return base;
}

// setup environment and load the main page

var page = webpage.create();
page.settings.loadImages = false;
page.settings.webSecurityEnabled = false;

// page.onConsoleMessage = function (msg){
//     // for debugging
//     console.log(msg);
// };

// helper - this is not required, but it abort few
//          unescessary requests - it speeds up processing
page.onResourceRequested = function(requestData, networkRequest) {
        if (requestData.id == 1) { return; }
        accept = getval(requestData.headers, "Accept");
        // ignore stylesheet and images to speed things up
        if ((accept.indexOf("css") != -1)
            ||(requestData.url.indexOf("jpg") != -1)
            ||(requestData.url.indexOf("gif") != -1)
            ||(requestData.url.indexOf("png") != -1)
            ||(requestData.url.indexOf("ga.js") != -1)
            ) {
            console.log("  > abort "+right(requestData.url, 60));
            networkRequest.abort();
            return;
        }
        // console.log("  > loading: "+left(requestData.url, 60)+" ["+accept+"]");
        return;
    };

page.open(URL, function(status) {
    if (status !== 'success') {
        console.log('Unable to load the address!');
        phantom.exit();
    } else {
      
        // collect the links
        var out = page.evaluate(function(sel) {
            var arr = new Array();
            jQuery(sel).each(function(index, el) {
                arr.push(jQuery(el).attr("href"))
            });
            return arr;
        }, JQUERY_SELECTOR);

        // reconfigure page for download
        page.settings.loadImages = true;
        page.onResourceRequested = null;
        
        // download files sequentially
        var i, name, pocet;
        pocet = 0;
        for(i=0; i<out.length; i++) {
            name = base_name(out[i]);
            if (!fs.exists(SAVE_DIR+name)) {
                console.log("download: "+out[i]);
                page_download_file(page, out[i], SAVE_DIR+name);
                pocet += 1;
            }else{
                console.log("skipped: "+name);
            }
        }
        console.log("Download count="+pocet);
        phantom.exit();
    }
    console.log("done with page open");
});



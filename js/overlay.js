var imageDataCache = new Map();
var overlayIdCounter = 0;

function getOrCacheImageData(img, callback) {
    if (!img.dataset.overlayId) img.dataset.overlayId = ++overlayIdCounter;
    var key = img.dataset.overlayId;
    if (imageDataCache.has(key)) { callback(imageDataCache.get(key)); return; }
    var c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    var ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    try {
        var data = ctx.getImageData(0, 0, c.width, c.height);
        imageDataCache.set(key, data);
        callback(data);
    } catch (e) {}
}

function pixelitDrawOverlay(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    var tolerance = 20;

    document.querySelectorAll(".img-overlay").forEach(function(canvas) {
        var img = canvas.previousElementSibling;
        if (!img || img.tagName !== "IMG" || !img.complete || !img.naturalWidth) return;
        var dw = img.offsetWidth, dh = img.offsetHeight;
        if (!dw || !dh) return;
        canvas.width = dw;
        canvas.height = dh;
        var ctx = canvas.getContext("2d");

        getOrCacheImageData(img, function(srcData) {
            var sw = srcData.width, sh = srcData.height;
            var src = srcData.data;
            var out = ctx.createImageData(dw, dh);
            var dst = out.data;

            for (var y = 0; y < dh; y++) {
                for (var x = 0; x < dw; x++) {
                    var sx = Math.round(x * sw / dw);
                    var sy = Math.round(y * sh / dh);
                    var si = (sy * sw + sx) * 4;
                    var di = (y * dw + x) * 4;
                    if (Math.abs(src[si]   - r) <= tolerance &&
                        Math.abs(src[si+1] - g) <= tolerance &&
                        Math.abs(src[si+2] - b) <= tolerance) {
                        // matching pixel — transparent (show original beneath)
                        dst[di+3] = 0;
                    } else {
                        // non-matching — dim with semi-transparent black
                        dst[di+3] = 160;
                    }
                }
            }
            ctx.putImageData(out, 0, 0);
        });
    });
}

function pixelitClearOverlay() {
    document.querySelectorAll(".img-overlay").forEach(function(canvas) {
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    });
}

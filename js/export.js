function pixelitExportPNG() {
    var sorted = Array.from(pickedColors.values()).sort(function(a, b) {
        return hexToHsl(a.hex) - hexToHsl(b.hex);
    });

    var canvas = document.createElement("canvas");
    canvas.width = Math.max(sorted.length, 1);
    canvas.height = 1;
    var ctx = canvas.getContext("2d");

    for (var i = 0; i < sorted.length; i++) {
        ctx.fillStyle = sorted[i].hex;
        ctx.fillRect(i, 0, 1, 1);
    }

    canvas.toBlob(function(blob) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "palette.png";
        a.click();
        URL.revokeObjectURL(a.href);
    });
}

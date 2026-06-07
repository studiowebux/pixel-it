var variationSteps = 4;
var variationDegrees = 5;

function hexToHslParts(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var b = parseInt(hex.slice(5, 7), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }
    return { h: h * 360, s: s, l: l };
}

function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 60)       { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else              { r = c; b = x; }
    var toHex = function(v) { return ("0" + Math.round((v + m) * 255).toString(16)).slice(-2); };
    return "#" + toHex(r) + toHex(g) + toHex(b);
}

function isDarkHex(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 120;
}

function pixelitShowVariations(hex, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var hsl = hexToHslParts(hex);
    var html = "<div class='variation-swatches'>"
        + "<button class='pick-all-btn' onclick='pixelitPickAll(this,\"variation-swatches\")'>Pick all</button>";
    for (var i = -variationSteps; i <= variationSteps; i++) {
        if (i === 0) continue;
        var varHex = hslToHex(hsl.h + i * variationDegrees, hsl.s, hsl.l);
        var dark = isDarkHex(varHex);
        var label = (i > 0 ? "+" : "") + i;
        html += "<label class='variation-swatch " + (dark ? "text-white" : "text-black") + "' style='background:" + varHex + "' title='" + varHex + "'>"
            + "<input type='checkbox' value='" + varHex + "' onchange='pixelitColorToggle(this)' hidden />"
            + "<span class='variation-label'>" + label + "</span>"
            + "<span class='variation-hex'>" + varHex + "</span>"
            + "</label>";
    }
    html += "</div>";
    container.innerHTML = html;
}

function pixelitUpdateVariationSettings() {
    var steps = parseInt(document.getElementById("var-steps").value) || 4;
    var deg = parseInt(document.getElementById("var-degrees").value) || 5;
    variationSteps = Math.max(1, steps);
    variationDegrees = Math.max(1, deg);
}

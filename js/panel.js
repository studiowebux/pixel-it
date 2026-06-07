var pickedColors = new Map();
var STORAGE_KEY = "pixelit-palette";

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(pickedColors.values())));
    } catch (e) {}
}

function loadFromStorage() {
    try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        var items = JSON.parse(raw);
        for (var i = 0; i < items.length; i++) {
            pickedColors.set(items[i].hex, items[i]);
        }
    } catch (e) {}
}

function hexToHsl(hex) {
    var r = parseInt(hex.slice(1,3), 16) / 255;
    var g = parseInt(hex.slice(3,5), 16) / 255;
    var b = parseInt(hex.slice(5,7), 16) / 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h = 0;
    if (max !== min) {
        var d = max - min;
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }
    return h * 360;
}

var openVariations = new Set();

function renderPanel() {
    var sorted = Array.from(pickedColors.values()).sort(function(a, b) {
        return hexToHsl(a.hex) - hexToHsl(b.hex);
    });

    var empty = document.getElementById("palette-empty");
    if (empty) empty.style.display = sorted.length === 0 ? "block" : "none";

    var list = document.getElementById("palette-list");
    var html = "";
    for (var i = 0; i < sorted.length; i++) {
        var item = sorted[i];
        var varId = "var-" + item.hex.replace("#", "");
        html += "<div class='panel-swatch'>"
            + "<div class='swatch-dot' style='background:" + item.hex + "'></div>"
            + "<span class='swatch-hex'>" + item.hex + "</span>"
            + "<button class='swatch-var' onclick='pixelitToggleVariations(\"" + item.hex + "\",\"" + varId + "\")' title='HUE variations'>~</button>"
            + "<button class='swatch-remove' onclick='pixelitRemove(\"" + item.hex + "\",\"" + item.checkboxId + "\")'>x</button>"
            + "</div>"
            + "<div id='" + varId + "' class='variation-container'></div>";
    }
    list.innerHTML = html;

    // Re-open any variation panels that were open before rebuild
    openVariations.forEach(function(varId) {
        var hex = "#" + varId.replace("var-", "");
        if (pickedColors.has(hex)) {
            pixelitShowVariations(hex, varId);
        }
    });

    var count = document.getElementById("palette-count");
    if (count) count.textContent = "(" + sorted.length + ")";
    saveToStorage();
}

function pixelitToggleVariations(hex, varId) {
    if (openVariations.has(varId)) {
        openVariations.delete(varId);
        var container = document.getElementById(varId);
        if (container) container.innerHTML = "";
    } else {
        openVariations.add(varId);
        pixelitShowVariations(hex, varId);
    }
}

function pixelitRemove(hex, checkboxId) {
    pickedColors.delete(hex);
    var cb = document.getElementById(checkboxId);
    if (cb) {
        cb.checked = false;
        cb.parentElement.classList.remove("selected");
    }
    renderPanel();
}

function pixelitClearAll() {
    document.getElementById("images").innerHTML = "";
    pickedColors.clear();
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    renderPanel();
    document.dispatchEvent(new CustomEvent("pixelit:clearall"));
}

document.addEventListener("DOMContentLoaded", function() {
    loadFromStorage();
    renderPanel();
});

document.addEventListener("pixelit:pick", function(e) {
    pickedColors.set(e.detail.hex, { hex: e.detail.hex, checkboxId: e.detail.checkboxId });
    renderPanel();
});

document.addEventListener("pixelit:unpick", function(e) {
    pickedColors.delete(e.detail.hex);
    renderPanel();
});

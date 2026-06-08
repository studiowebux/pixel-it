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

    var list = document.getElementById("palette-list");
    var hasGroups = typeof groups !== "undefined" && groups.length > 0;
    if (sorted.length === 0 && !hasGroups) {
        list.innerHTML = "<p class='panel-empty'>Upload an image and click colors to add them here.</p>";
    } else {
        list.innerHTML = renderGroupedPanel(sorted);
    }

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

function pixelitHighlightColor(hex) {
    var labels = document.querySelectorAll("input[type='checkbox'][value='" + hex + "']");
    for (var i = 0; i < labels.length; i++) {
        labels[i].parentElement.classList.add("palette-highlight");
    }
    if (typeof pixelitDrawOverlay === "function") pixelitDrawOverlay(hex);
}

function pixelitUnhighlightColor() {
    var labels = document.querySelectorAll(".palette-highlight");
    for (var i = 0; i < labels.length; i++) {
        labels[i].classList.remove("palette-highlight");
    }
    if (typeof pixelitClearOverlay === "function") pixelitClearOverlay();
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
    if (typeof groups !== "undefined") { groups = []; colorGroups = new Map(); }
    try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(GROUPS_KEY);
        localStorage.removeItem(COLOR_GROUPS_KEY);
    } catch (e) {}
    renderPanel();
    document.dispatchEvent(new CustomEvent("pixelit:clearall"));
}

document.addEventListener("DOMContentLoaded", function() {
    loadFromStorage();
    if (typeof loadGroups === "function") loadGroups();
    renderPanel();
});

document.addEventListener("pixelit:pick", function(e) {
    pickedColors.set(e.detail.hex, { hex: e.detail.hex, checkboxId: e.detail.checkboxId });
    if (typeof activeGroupId !== "undefined" && activeGroupId) {
        colorGroups.set(e.detail.hex, activeGroupId);
        saveGroups();
    }
    renderPanel();
});

document.addEventListener("pixelit:unpick", function(e) {
    pickedColors.delete(e.detail.hex);
    renderPanel();
});

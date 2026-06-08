var groups = []; // [{id, name}] in display order
var colorGroups = new Map(); // hex -> groupId | null
var activeGroupId = null;
var collapsedGroups = new Set();

var GROUPS_KEY = "pixelit-groups";
var COLOR_GROUPS_KEY = "pixelit-color-groups";

// ── Persistence ──────────────────────────────────────────────────────────────

function saveGroups() {
    try {
        localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
        localStorage.setItem(COLOR_GROUPS_KEY, JSON.stringify(Array.from(colorGroups.entries())));
    } catch (e) {}
}

function loadGroups() {
    try {
        var g = localStorage.getItem(GROUPS_KEY);
        if (g) groups = JSON.parse(g);
        var cg = localStorage.getItem(COLOR_GROUPS_KEY);
        if (cg) colorGroups = new Map(JSON.parse(cg));
    } catch (e) {}
}

// ── Group CRUD ───────────────────────────────────────────────────────────────

function pixelitToggleCollapse(id) {
    if (collapsedGroups.has(id)) collapsedGroups.delete(id);
    else collapsedGroups.add(id);
    renderPanel();
}

function pixelitSetActiveGroup(id) {
    activeGroupId = (activeGroupId === id) ? null : id;
    var banner = document.getElementById("active-group-banner");
    if (banner) {
        if (activeGroupId) {
            var g = groups.find(function(g) { return g.id === activeGroupId; });
            banner.textContent = "Picking into: " + (g ? g.name : "");
            banner.style.display = "block";
        } else {
            banner.style.display = "none";
        }
    }
    renderPanel();
}

function pixelitCreateGroup() {
    var input = document.getElementById("new-group-input");
    var name = input ? input.value.trim() : "";
    if (!name) return;
    var exists = groups.some(function(g) { return g.name.toLowerCase() === name.toLowerCase(); });
    if (exists) { input.setCustomValidity("Group name already exists"); input.reportValidity(); return; }
    input.setCustomValidity("");
    groups.push({ id: "grp-" + Date.now(), name: name });
    if (input) input.value = "";
    saveGroups();
    renderPanel();
}

function pixelitRenameGroup(id, newName) {
    var g = groups.find(function(g) { return g.id === id; });
    if (g && newName.trim()) { g.name = newName.trim(); saveGroups(); }
}

function pixelitDeleteGroup(id) {
    groups = groups.filter(function(g) { return g.id !== id; });
    colorGroups.forEach(function(gid, hex) {
        if (gid === id) colorGroups.delete(hex);
    });
    saveGroups();
    renderPanel();
}

function pixelitMoveGroupUp(id) {
    var idx = groups.findIndex(function(g) { return g.id === id; });
    if (idx > 0) {
        var tmp = groups[idx - 1];
        groups[idx - 1] = groups[idx];
        groups[idx] = tmp;
        saveGroups();
        renderPanel();
    }
}

function pixelitMoveGroupDown(id) {
    var idx = groups.findIndex(function(g) { return g.id === id; });
    if (idx < groups.length - 1) {
        var tmp = groups[idx + 1];
        groups[idx + 1] = groups[idx];
        groups[idx] = tmp;
        saveGroups();
        renderPanel();
    }
}

// ── Color assignment ─────────────────────────────────────────────────────────

function pixelitAssignColor(hex, groupId) {
    if (groupId === "") colorGroups.delete(hex);
    else colorGroups.set(hex, groupId);
    saveGroups();
    renderPanel();
}

// ── Export ───────────────────────────────────────────────────────────────────

function pixelitExportAllGroupsPNG() {
    if (pickedColors.size === 0) return;
    var all = [];
    groups.forEach(function(g) {
        var colors = Array.from(pickedColors.values()).filter(function(item) {
            return colorGroups.get(item.hex) === g.id;
        }).sort(function(a, b) { return hexToHsl(a.hex) - hexToHsl(b.hex); });
        all = all.concat(colors);
    });
    var ungrouped = Array.from(pickedColors.values()).filter(function(item) {
        return !colorGroups.has(item.hex);
    }).sort(function(a, b) { return hexToHsl(a.hex) - hexToHsl(b.hex); });
    all = all.concat(ungrouped);
    downloadPalettePNG(all, "palette_full.png");
}

function pixelitExportGroupPNG(groupId) {
    var name = "";
    var g = groups.find(function(g) { return g.id === groupId; });
    if (g) name = g.name.toLowerCase().replace(/\s+/g, "_");

    var colors = Array.from(pickedColors.values()).filter(function(item) {
        return colorGroups.get(item.hex) === groupId;
    }).sort(function(a, b) { return hexToHsl(a.hex) - hexToHsl(b.hex); });

    downloadPalettePNG(colors, "palette_" + name + ".png");
}


function downloadPalettePNG(colors, filename) {
    var canvas = document.createElement("canvas");
    canvas.width = Math.max(colors.length, 1);
    canvas.height = 1;
    var ctx = canvas.getContext("2d");
    for (var i = 0; i < colors.length; i++) {
        ctx.fillStyle = colors[i].hex;
        ctx.fillRect(i, 0, 1, 1);
    }
    canvas.toBlob(function(blob) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    });
}

// ── Render ───────────────────────────────────────────────────────────────────

function buildMoveSelect(hex) {
    var current = colorGroups.get(hex) || "";
    var opts = "<option value=''" + (current === "" ? " selected" : "") + ">Ungrouped</option>";
    groups.forEach(function(g) {
        opts += "<option value='" + g.id + "'" + (current === g.id ? " selected" : "") + ">" + g.name + "</option>";
    });
    return "<select class='group-select' onchange='pixelitAssignColor(\"" + hex + "\",this.value)'>" + opts + "</select>";
}

function renderGroupSection(title, colors, groupId) {
    var sorted = colors.slice().sort(function(a, b) { return hexToHsl(a.hex) - hexToHsl(b.hex); });
    var header = "<div class='group-header'>";
    var isCollapsed = groupId !== null && collapsedGroups.has(groupId);
    if (groupId !== null) {
        var isActive = activeGroupId === groupId;
        header += "<button class='group-collapse-btn' onclick='pixelitToggleCollapse(\"" + groupId + "\")' title='" + (isCollapsed ? "Expand" : "Collapse") + "'>" + (isCollapsed ? "▶" : "▼") + "</button>"
            + "<button class='group-activate-btn" + (isActive ? " active" : "") + "' onclick='pixelitSetActiveGroup(\"" + groupId + "\")' title='" + (isActive ? "Deactivate group" : "Activate group — new picks go here") + "'>●</button>"
            + "<span class='group-name' contenteditable='true' onblur='pixelitRenameGroup(\"" + groupId + "\",this.textContent)'>" + title + "</span>"
            + "<div class='group-actions'>"
            + "<button onclick='pixelitExportGroupPNG(\"" + groupId + "\")' title='Export group PNG' class='group-btn'>PNG</button>"
            + "<button onclick='pixelitMoveGroupUp(\"" + groupId + "\")' class='group-btn'>↑</button>"
            + "<button onclick='pixelitMoveGroupDown(\"" + groupId + "\")' class='group-btn'>↓</button>"
            + "<button onclick='pixelitDeleteGroup(\"" + groupId + "\")' class='group-btn danger'>✕</button>"
            + "</div>";
    } else {
        var isCollapsedUngrouped = collapsedGroups.has("ungrouped");
        header += "<button class='group-collapse-btn' onclick='pixelitToggleCollapse(\"ungrouped\")' title='" + (isCollapsedUngrouped ? "Expand" : "Collapse") + "'>" + (isCollapsedUngrouped ? "▶" : "▼") + "</button>"
            + "<span class='group-name'>" + title + "</span>";
        isCollapsed = isCollapsedUngrouped;
    }
    header += "</div>";

    var rows = isCollapsed ? "" : sorted.length === 0
        ? "<div class='group-section-empty'>No colors yet.</div>"
        : sorted.map(function(item) {
            var varId = "var-" + item.hex.replace("#", "");
            return "<div class='panel-swatch'>"
                + "<div class='swatch-dot' style='background:" + item.hex + "'></div>"
                + "<span class='swatch-hex'>" + item.hex + "</span>"
                + buildMoveSelect(item.hex)
                + "<button class='swatch-var' onclick='pixelitToggleVariations(\"" + item.hex + "\",\"" + varId + "\")' title='HUE variations'>~</button>"
                + "<button class='swatch-remove' onclick='pixelitRemove(\"" + item.hex + "\",\"" + item.checkboxId + "\")'>x</button>"
                + "</div>"
                + "<div id='" + varId + "' class='variation-container'></div>";
        }).join("");

    var activeClass = (groupId && activeGroupId === groupId) ? " active-group-section" : "";
    return "<div class='group-section" + activeClass + "'>" + header + rows + "</div>";
}

function renderGroupedPanel(sorted) {
    var html = "";

    groups.forEach(function(g) {
        var colors = sorted.filter(function(item) { return colorGroups.get(item.hex) === g.id; });
        html += renderGroupSection(g.name, colors, g.id);
    });

    var ungrouped = sorted.filter(function(item) { return !colorGroups.has(item.hex); });
    html += renderGroupSection("Ungrouped", ungrouped, null);

    return html;
}


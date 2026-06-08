function pixelitExportPNG() {
    if (pickedColors.size === 0) return;
    var sorted = Array.from(pickedColors.values()).sort(function(a, b) {
        return hexToHsl(a.hex) - hexToHsl(b.hex);
    });
    downloadPalettePNG(sorted, "palette.png");
}

function getColorData() {
    return Array.from(pickedColors.values()).map(function(item) {
        var groupId = (typeof colorGroups !== "undefined") ? colorGroups.get(item.hex) || null : null;
        var group = (typeof groups !== "undefined" && groupId) ? groups.find(function(g) { return g.id === groupId; }) : null;
        return { hex: item.hex, group: group ? group.name : "" };
    });
}

function downloadBlob(blob, filename) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

function pixelitExportJSON() {
    if (pickedColors.size === 0) return;
    var blob = new Blob([JSON.stringify(getColorData(), null, 2)], { type: "application/json" });
    downloadBlob(blob, "palette.json");
}

function pixelitExportCSV() {
    if (pickedColors.size === 0) return;
    var lines = ["hex,group"];
    getColorData().forEach(function(item) {
        lines.push('"' + item.hex + '","' + item.group.replace(/"/g, '""') + '"');
    });
    var blob = new Blob([lines.join("\n")], { type: "text/csv" });
    downloadBlob(blob, "palette.csv");
}

function pixelitExportText() {
    if (pickedColors.size === 0) return;
    var lines = getColorData().map(function(item) {
        var parts = [item.hex];
        if (item.group) parts.push("(" + item.group + ")");
        return parts.join(" ");
    });
    var blob = new Blob([lines.join("\n")], { type: "text/plain" });
    downloadBlob(blob, "palette.txt");
}

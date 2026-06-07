var lastClickedCheckbox = null;

function pixelitPickAll(btn, selector) {
    // btn is inside .palette-section or .variation-container — find the closest palette
    var section = btn.closest(".palette-section, .variation-container");
    var container = section ? section.querySelector("." + selector) : null;
    if (!container) return;
    var boxes = Array.from(container.querySelectorAll("input[type='checkbox']"));
    var allChecked = boxes.every(function(cb) { return cb.checked; });
    boxes.forEach(function(cb) {
        if (cb.checked === allChecked) pixelitApplyToggle(cb, !allChecked);
    });
    btn.textContent = allChecked ? "Pick all" : "Clear all";
}

function pixelitApplyToggle(checkbox, checked) {
    var hex = checkbox.value;
    var all = document.querySelectorAll("input[type='checkbox'][value='" + hex + "']");
    for (var i = 0; i < all.length; i++) {
        all[i].checked = checked;
        all[i].parentElement.classList.toggle("selected", checked);
    }
    document.dispatchEvent(new CustomEvent(
        checked ? "pixelit:pick" : "pixelit:unpick",
        { detail: { hex: hex, checkboxId: checkbox.id } }
    ));
}

function pixelitColorToggle(checkbox, event) {
    var checked = checkbox.checked;

    if (event && event.shiftKey && lastClickedCheckbox && lastClickedCheckbox !== checkbox) {
        // Find the containing palette wrapper for the current checkbox
        var container = checkbox.closest(".color-palette, .original-color-palette");
        var lastContainer = lastClickedCheckbox.closest(".color-palette, .original-color-palette");

        if (container && container === lastContainer) {
            var boxes = Array.from(container.querySelectorAll("input[type='checkbox']"));
            var a = boxes.indexOf(checkbox);
            var b = boxes.indexOf(lastClickedCheckbox);
            var lo = Math.min(a, b), hi = Math.max(a, b);
            for (var i = lo; i <= hi; i++) {
                pixelitApplyToggle(boxes[i], checked);
            }
            lastClickedCheckbox = checkbox;
            return;
        }
    }

    pixelitApplyToggle(checkbox, checked);
    lastClickedCheckbox = checkbox;
}

function pixelitColorToggle(checkbox) {
    var hex = checkbox.value;
    var checked = checkbox.checked;

    // Sync all swatches with the same hex value across the page
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

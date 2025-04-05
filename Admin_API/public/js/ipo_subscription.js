// Function to filter IPOs based on search input
function filterIPO() {
    let input = document.getElementById("searchIPO").value.toLowerCase();
    let rows = document.querySelectorAll("#ipoTable tr");

    rows.forEach(row => {
        let companyName = row.cells[0].innerText.toLowerCase();
        if (companyName.includes(input)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

// Click event for Apply button
document.querySelectorAll('.apply-btn').forEach(button => {
    button.addEventListener('click', function() {
        alert("Your IPO application has been submitted!");
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('.content-section');
    // Changed from getElementById('hamburger-button') to querySelector('.hamburger-menu')
    const hamburgerButton = document.querySelector('.hamburger-menu');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    // Handle navigation link clicks
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            navLinks.forEach(link => link.classList.remove('active'));
            this.classList.add('active');

            const target = this.getAttribute('data-target');
            sections.forEach(section => {
                if (section.id === target) {
                    section.classList.add('active');
                } else {
                    section.classList.remove('active');
                }
            });
        });
    });

    // Handle hamburger button click to toggle the sidebar
    hamburgerButton.addEventListener('click', function () {
        sidebar.classList.toggle('active');  // Toggles the sidebar visibility
        mainContent.classList.toggle('shift'); // Shifts the main content accordingly
    });
});

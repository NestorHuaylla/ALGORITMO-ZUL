document.addEventListener('DOMContentLoaded', () => {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.module-section');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all tabs
            tabBtns.forEach(b => b.classList.remove('active'));
            // Add active to clicked tab
            btn.classList.add('active');

            // Hide all sections
            sections.forEach(sec => sec.classList.remove('active'));
            
            // Show target section
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });
});

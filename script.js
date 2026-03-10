// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    window.location.href = 'login.html';
}

// Sidebar persistence logic
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // Check if sidebar should be expanded on load (persistence from previous page)
    if (sessionStorage.getItem('sidebar_persistent_hover') === 'true') {
        sidebar.classList.add('persistent-hover');
    }

    // Set persistence when a link is clicked while sidebar is expanded
    sidebar.addEventListener('click', function(e) {
        if (e.target.closest('.nav-item')) {
            // Only set persistence if the sidebar is currently expanded (hovered)
            if (sidebar.matches(':hover')) {
                sessionStorage.setItem('sidebar_persistent_hover', 'true');
            }
        }
    });

    // Remove persistence as soon as mouse moves within the page but outside the sidebar
    document.addEventListener('mousemove', function(e) {
        if (sidebar.classList.contains('persistent-hover')) {
            const sidebarRect = sidebar.getBoundingClientRect();
            // Expanded width is 260px
            const expandedWidth = 260;
            
            if (e.clientX > expandedWidth) {
                sidebar.classList.remove('persistent-hover');
                sessionStorage.removeItem('sidebar_persistent_hover');
            }
        }
    });
});

// Main dashboard and other functionalities
document.addEventListener('DOMContentLoaded', function() {
    // Populate user Employee ID
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.employeeID) {
        const userEmployeeIDElement = document.getElementById('userEmployeeID');
        if (userEmployeeIDElement) {
            userEmployeeIDElement.textContent = 'ID: ' + user.employeeID;
        }
    }

    // Toggle Grid/List on Running Line Changeover page
    const gridBtn = document.getElementById('gridBtn');
    const listBtn = document.getElementById('listBtn');
    const gridView = document.getElementById('gridView');
    const listView = document.getElementById('listView');

    if (gridBtn && listBtn && gridView && listView) {
        gridBtn.addEventListener('click', () => {
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
            gridView.style.display = 'grid';
            listView.style.display = 'none';
        });

        listBtn.addEventListener('click', () => {
            listBtn.classList.add('active');
            gridBtn.classList.remove('active');
            gridView.style.display = 'none';
            listView.style.display = 'block';
        });
    }

    // Colors
    const colors = {
        green: '#2ecc71',
        yellow: '#f1c40f',
        orange: '#e67e22',
        red: '#e74c3c',
        blue: '#3498db'
    };

    // On-Time Production Chart
    const onTimeCanvas = document.getElementById('onTimeChart');
    if (onTimeCanvas) {
        const onTimeCtx = onTimeCanvas.getContext('2d');
        new Chart(onTimeCtx, {
            type: 'doughnut',
            data: {
                labels: ['Factory 1', 'Factory 3', 'Factory 5'],
                datasets: [{
                    data: [40, 35, 25],
                    backgroundColor: ['#3498db', '#9b59b6', '#00bcd4'],
                    borderWidth: 0
                }]
            },
            options: {
                cutout: '60%',
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    // Late Production Chart
    const lateCanvas = document.getElementById('lateChart');
    if (lateCanvas) {
        const lateCtx = lateCanvas.getContext('2d');
        new Chart(lateCtx, {
            type: 'doughnut',
            data: {
                labels: ['Factory 2', 'Factory 4'],
                datasets: [{
                    data: [60, 40],
                    backgroundColor: ['#e67e22', '#8e44ad'],
                    borderWidth: 0
                }]
            },
            options: {
                cutout: '60%',
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    // Create custom legends
    const createLegend = (id, data, legendColors) => {
        const legend = document.getElementById(id);
        if (!legend) return;
        legend.innerHTML = '';
        data.forEach((label, i) => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <span class="legend-color" style="background: ${legendColors[i]}"></span>
                <span>${label}</span>
            `;
            legend.appendChild(item);
        });
    };

    createLegend('onTimeLegend', ['Factory 1', 'Factory 3', 'Factory 5'], ['#3498db', '#9b59b6', '#00bcd4']);
    createLegend('lateLegend', ['Factory 2', 'Factory 4'], ['#e67e22', '#8e44ad']);

    // Total Defects Chart (Main)
    const defectsCanvas = document.getElementById('defectsChart');
    if (defectsCanvas) {
        const defectsCtx = defectsCanvas.getContext('2d');
        new Chart(defectsCtx, {
            type: 'bar',
            data: {
                labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
                datasets: [{
                    label: 'Defects',
                    data: [60, 65, 85, 75, 95, 62, 88, 60, 75, 82, 65],
                    backgroundColor: colors.blue,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 120,
                        grid: { display: true, color: '#f0f0f0' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // Side Defects Chart (Reasons for changeover delays)
    const sideDefectsCanvas = document.getElementById('sideDefectsChart');
    if (sideDefectsCanvas) {
        const sideDefectsCtx = sideDefectsCanvas.getContext('2d');
        new Chart(sideDefectsCtx, {
            type: 'pie',
            data: {
                labels: ['Machine Failure', 'Material Shortage', 'Operator Delay', 'Quality Check', 'Tool Missing', 'Power Outage', 'Schedule Change', 'Maintenance', 'Supervisor Sync', 'Other'],
                datasets: [{
                    data: [15, 20, 10, 12, 8, 5, 10, 7, 8, 5],
                    backgroundColor: [
                        '#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', 
                        '#1abc9c', '#e67e22', '#34495e', '#95a5a6', '#d35400'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            font: { size: 10 }
                        }
                    }
                }
            }
        });
    }
});

// Logout functionality
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', function() {
    // Populate user email
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.email) {
        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement) {
            userEmailElement.textContent = user.email;
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

    // Colors from screenshot
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
                labels: ['Factory 1', 'Factory 2', '2arx:', 'Factory 4', 'Other'],
                datasets: [{
                    data: [30, 20, 15, 10, 25],
                    backgroundColor: [colors.blue, colors.green, colors.yellow, colors.red, '#eee'],
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
                labels: ['Factory 1', 'Factory 3', 'Factory 4', 'Factory 5', 'Other'],
                datasets: [{
                    data: [20, 25, 25, 15, 15],
                    backgroundColor: [colors.blue, colors.green, colors.yellow, colors.red, '#eee'],
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
    const createLegend = (id, data, colors) => {
        const legend = document.getElementById(id);
        if (!legend) return;
        legend.innerHTML = '';
        data.forEach((label, i) => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <span class="legend-color" style="background: ${colors[i]}"></span>
                <span>${label}</span>
            `;
            legend.appendChild(item);
        });
    };

    createLegend('onTimeLegend', ['Factory 1', 'Factory 2', '2arx:', 'Factory 4'], [colors.blue, colors.green, colors.yellow, colors.red]);
    createLegend('lateLegend', ['Factory 1', 'Factory 3', 'Factory 4', 'Factory 5'], [colors.blue, colors.green, colors.yellow, colors.red]);

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

    // Side Defects Chart
    const sideDefectsCanvas = document.getElementById('sideDefectsChart');
    if (sideDefectsCanvas) {
        const sideDefectsCtx = sideDefectsCanvas.getContext('2d');
        new Chart(sideDefectsCtx, {
            type: 'bar',
            data: {
                labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11'],
                datasets: [{
                    label: 'Defect (%)',
                    data: [70, 75, 88, 72, 65, 85, 70, 82, 95, 110],
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
});

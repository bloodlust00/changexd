// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    window.location.href = 'login.html';
}

// Dark mode toggle — triggered by clicking the logo
(function initDarkMode() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

    document.addEventListener('DOMContentLoaded', function () {
        const logoEl = document.querySelector('.logo-container, .logo-section');
        if (!logoEl) return;

        logoEl.addEventListener('click', function () {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            }
        });
    });
})();

// Sidebar persistence logic
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // Check if sidebar should be expanded on load (persistence from previous page)
    if (sessionStorage.getItem('sidebar_persistent_hover') === 'true') {
        sidebar.classList.add('persistent-hover');
        
        // Remove the temporary class from html element now that sidebar has its class
        document.documentElement.classList.remove('sidebar-pushed');
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

    // Date Picker Logic (Flatpickr)
    const selectedDateText = document.getElementById('selectedDateText');
    const datePickerInput = document.getElementById('datePicker');
    
    if (datePickerInput && selectedDateText) {
        flatpickr(datePickerInput, {
            dateFormat: "Y-m-d",
            maxDate: "today",
            defaultDate: "today",
            disableMobile: true, // Force custom calendar even on mobile
            onReady: function(selectedDates, dateStr) {
                if (selectedDateText) {
                    selectedDateText.textContent = dateStr;
                }
            },
            onChange: function(selectedDates, dateStr) {
                if (selectedDateText) {
                    selectedDateText.textContent = dateStr;
                    console.log('Date selected:', dateStr);
                    
                    // Simulate data refresh for all charts
                    refreshDashboardData();
                }
            }
        });
    }

    function refreshDashboardData() {
        // 1. Refresh Production Status Chart
        const prodChart = Chart.getChart('productionStatusChart');
        if (prodChart) {
            // Randomize target for all lines (between 800 and 1400)
            prodChart.data.datasets[0].data = prodChart.data.datasets[0].data.map(() => {
                return Math.floor(800 + Math.random() * 600);
            });

            // Set production as a random percentage (e.g., 60% to 95%) of the new target
            prodChart.data.datasets[1].data = prodChart.data.datasets[0].data.map(target => {
                const efficiency = 0.6 + (Math.random() * 0.35); // 60% to 95% efficiency
                return Math.floor(target * efficiency);
            });
            
            prodChart.update();
        }

        // 2. Refresh Total Defects Chart
        const defChart = Chart.getChart('defectsChart');
        if (defChart) {
            defChart.data.datasets[0].data = defChart.data.datasets[0].data.map(v => Math.floor(v * (0.8 + Math.random() * 0.4)));
            defChart.update();
        }

        // 3. Refresh 3D Pie Chart (Highcharts)
        const highChart = Highcharts.charts.find(c => c && c.renderTo.id === 'sideDefectsChart');
        if (highChart) {
            const newData = highChart.series[0].data.map(p => ({
                name: p.name,
                y: Math.floor(p.y * (0.8 + Math.random() * 0.4)),
                color: p.color
            }));
            highChart.series[0].setData(newData);
        }

        // 4. Randomize Gauge values
        const reasons = ["Machine breakdown", "Absenteeism", "Mechanic delay", "Needle breakdown", "Material shortage", "Power outage"];
        
        document.querySelectorAll('.gauge-wrapper').forEach(gauge => {
            const newVal = Math.floor(60 + Math.random() * 35);
            const color = newVal < 80 ? '#e74c3c' : '#2ecc71';
            
            gauge.style.setProperty('--gauge-percent', newVal);
            gauge.style.setProperty('--gauge-color', color);
            
            const valueSpan = gauge.querySelector('.gauge-value');
            if (valueSpan) valueSpan.textContent = newVal + '%';
            
            const path = gauge.querySelector('path:last-child');
            if (path) {
                const dashArray = 125.66;
                const dashOffset = dashArray * (1 - newVal / 100);
                path.style.strokeDashoffset = dashOffset;
                path.style.stroke = color;
            }

            // Handle Efficiency Reasons
            let tooltip = gauge.querySelector('.gauge-tooltip');
            if (newVal < 80) {
                const randomReason = reasons[Math.floor(Math.random() * reasons.length)];
                if (!tooltip) {
                    tooltip = document.createElement('div');
                    tooltip.className = 'gauge-tooltip';
                    gauge.appendChild(tooltip);
                }
                tooltip.textContent = "Reason: " + randomReason;
            } else if (tooltip) {
                tooltip.remove();
            }
        });

        // 5. Refresh Average Changeover Time Chart
        const avgChart = Chart.getChart('averageChangeoverChart');
        if (avgChart) {
            const numLines = 11;
            const actionNeededIndices = new Set();
            while(actionNeededIndices.size < 4) {
                actionNeededIndices.add(Math.floor(Math.random() * numLines));
            }

            const onTimeData = [];
            const actionNeededData = [];

            for (let i = 0; i < numLines; i++) {
                if (actionNeededIndices.has(i)) {
                    actionNeededData.push({ x: i + 1, y: 125 + Math.floor(Math.random() * 115) }); // 125 to 240
                    onTimeData.push({ x: i + 1, y: null });
                } else {
                    onTimeData.push({ x: i + 1, y: Math.floor(Math.random() * 120) }); // 0 to 120
                    actionNeededData.push({ x: i + 1, y: null });
                }
            }
            avgChart.data.datasets[0].data = onTimeData;
            avgChart.data.datasets[1].data = actionNeededData;
            avgChart.update();
        }
    }

    // Colors
    const colors = {
        green: '#2ecc71',
        yellow: '#f1c40f',
        orange: '#e67e22',
        red: '#e74c3c',
        blue: '#3498db'
    };

    // Initialize Average Changeover Time Chart
    const avgCtx = document.getElementById('averageChangeoverChart');
    if (avgCtx) {
        new Chart(avgCtx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'On Time',
                        data: [], 
                        backgroundColor: '#2ecc71',
                        borderColor: '#2ecc71',
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        showLine: true,
                        spanGaps: true,
                        borderWidth: 2,
                        tension: 0.3
                    },
                    {
                        label: 'Action Needed',
                        data: [], 
                        backgroundColor: '#e74c3c',
                        borderColor: '#e74c3c',
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        showLine: true,
                        spanGaps: true,
                        borderWidth: 2,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: { display: true, text: 'Line Number', font: { weight: 'bold' } },
                        min: 1,
                        max: 11,
                        ticks: { stepSize: 1, precision: 0 }
                    },
                    y: {
                        title: { display: true, text: 'Minutes', font: { weight: 'bold' } },
                        min: 0,
                        max: 240,
                        ticks: { stepSize: 30 }
                    }
                },
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true } }
                }
            }
        });
        
        // Initial data setup for the scatter chart
        const avgChart = Chart.getChart('averageChangeoverChart');
        if (avgChart) {
            const actionNeededIndices = [2, 5, 8]; // Example initial ones
            const onTimeData = [];
            const actionNeededData = [];
            for (let i = 0; i < 11; i++) {
                if (actionNeededIndices.includes(i)) {
                    actionNeededData.push({ x: i + 1, y: 130 + Math.random() * 50 });
                    onTimeData.push({ x: i + 1, y: null });
                } else {
                    onTimeData.push({ x: i + 1, y: 30 + Math.random() * 60 });
                    actionNeededData.push({ x: i + 1, y: null });
                }
            }
            avgChart.data.datasets[0].data = onTimeData;
            avgChart.data.datasets[1].data = actionNeededData;
            avgChart.update();
        }
    }

    // Production Status Combined Chart
    const prodStatusCanvas = document.getElementById('productionStatusChart');
    if (prodStatusCanvas) {
        const prodStatusCtx = prodStatusCanvas.getContext('2d');
        new Chart(prodStatusCtx, {
            type: 'bar',
            data: {
                labels: ['Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5', 'Line 6', 'Line 7', 'Line 8', 'Line 9', 'Line 10', 'Line 11'],
                datasets: [
                    {
                        type: 'line',
                        label: 'Production Target',
                        data: [1100, 1200, 1150, 1050, 1150, 950, 0, 1300, 1000, 600, 200],
                        borderColor: '#ff6b81',
                        backgroundColor: '#ffffff',
                        borderWidth: 2,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: '#ff6b81',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: false,
                        tension: 0
                    },
                    {
                        type: 'bar',
                        label: 'Production',
                        data: [755, 805, 443, 490, 500, 300, 0, 341, 681, 184, 3],
                        backgroundColor: '#48b3e8',
                        borderRadius: 2,
                        barPercentage: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            padding: 20,
                            font: {
                                family: 'Inter, sans-serif',
                                size: 12
                            },
                            color: '#666'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        display: false // Hide Y axis like in the screenshot
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                family: 'Inter, sans-serif',
                                size: 11
                            },
                            color: '#888'
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 20
                    }
                }
            },
            plugins: [{
                id: 'customDataLabels',
                afterDatasetsDraw: function(chart, args, options) {
                    const ctx = chart.ctx;
                    chart.data.datasets.forEach((dataset, i) => {
                        if (dataset.type === 'bar') {
                            const meta = chart.getDatasetMeta(i);
                            if (!meta.hidden) {
                                meta.data.forEach((element, index) => {
                                    const dataString = dataset.data[index].toString();
                                    if (dataString !== '0') {
                                        ctx.fillStyle = '#48b3e8';
                                        ctx.font = '11px Inter, sans-serif';
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'bottom';
                                        const padding = 5;
                                        const position = element.tooltipPosition();
                                        ctx.fillText(dataString, position.x, position.y - padding);
                                    }
                                });
                            }
                        }
                    });
                }
            }]
        });
    }

    // Machine Utilization Factory Switching
    const factorySelect = document.getElementById('factorySelect');
    const selectedFactoryName = document.getElementById('selectedFactoryName');
    const totalUtilVal = document.getElementById('totalUtilVal');
    const machineList = document.getElementById('machineList');

    const factoryData = {
        '1': { name: 'Line 1', total: '75%', machines: [{ name: 'Cutting', val: 80 }, { name: 'Sewing', val: 70 }, { name: 'Embroidery', val: 75 }, { name: 'Finishing', val: 60 }] },
        '2': { name: 'Line 2', total: '82%', machines: [{ name: 'Cutting', val: 85 }, { name: 'Sewing', val: 78 }, { name: 'Embroidery', val: 80 }, { name: 'Finishing', val: 85 }] },
        '3': { name: 'Line 3', total: '68%', machines: [{ name: 'Cutting', val: 60 }, { name: 'Sewing', val: 65 }, { name: 'Embroidery', val: 70 }, { name: 'Finishing', val: 75 }] },
        '4': { name: 'Line 4', total: '85%', machines: [{ name: 'Cutting', val: 80 }, { name: 'Sewing', val: 70 }, { name: 'Embroidery', val: 65 }, { name: 'Finishing', val: 80 }] },
        '5': { name: 'Line 5', total: '90%', machines: [{ name: 'Cutting', val: 95 }, { name: 'Sewing', val: 88 }, { name: 'Embroidery', val: 85 }, { name: 'Finishing', val: 92 }] },
        '6': { name: 'Line 6', total: '72%', machines: [{ name: 'Cutting', val: 70 }, { name: 'Sewing', val: 75 }, { name: 'Embroidery', val: 68 }, { name: 'Finishing', val: 74 }] },
        '7': { name: 'Line 7', total: '80%', machines: [{ name: 'Cutting', val: 82 }, { name: 'Sewing', val: 80 }, { name: 'Embroidery', val: 78 }, { name: 'Finishing', val: 80 }] },
        '8': { name: 'Line 8', total: '65%', machines: [{ name: 'Cutting', val: 62 }, { name: 'Sewing', val: 68 }, { name: 'Embroidery', val: 65 }, { name: 'Finishing', val: 64 }] },
        '9': { name: 'Line 9', total: '88%', machines: [{ name: 'Cutting', val: 90 }, { name: 'Sewing', val: 88 }, { name: 'Embroidery', val: 86 }, { name: 'Finishing', val: 88 }] },
        '10': { name: 'Line 10', total: '78%', machines: [{ name: 'Cutting', val: 75 }, { name: 'Sewing', val: 80 }, { name: 'Embroidery', val: 76 }, { name: 'Finishing', val: 80 }] },
        '11': { name: 'Line 11', total: '83%', machines: [{ name: 'Cutting', val: 85 }, { name: 'Sewing', val: 82 }, { name: 'Embroidery', val: 84 }, { name: 'Finishing', val: 81 }] }
    };

    if (factorySelect) {
        // Set initial name
        if (selectedFactoryName) selectedFactoryName.textContent = 'Line 1';
        
        factorySelect.addEventListener('change', function() {
            const data = factoryData[this.value];
            if (data) {
                selectedFactoryName.textContent = data.name;
                totalUtilVal.textContent = data.total + ' ⌵';
                
                machineList.innerHTML = data.machines.map(m => `
                    <div class="machine-item">
                        <span class="check-icon">✓</span>
                        <span class="machine-name">${m.name}</span>
                        <div class="progress-wrap">
                            <div class="progress-bg"><div class="progress-fill" style="width: ${m.val}%;"></div></div>
                            <span class="progress-percent">${m.val}%</span>
                        </div>
                    </div>
                `).join('');
            }
        });
    }

    // Machine Availability Chart (Main)
    const defectsCanvas = document.getElementById('defectsChart');
    if (defectsCanvas) {
        const defectsCtx = defectsCanvas.getContext('2d');
        new Chart(defectsCtx, {
            type: 'bar',
            data: {
                labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
                datasets: [{
                    label: 'Availability (%)',
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

    // Side Defects Chart (Reasons for changeover delays) - 3D Pie Chart
    const sideDefectsContainer = document.getElementById('sideDefectsChart');
    if (sideDefectsContainer) {
        if (typeof Highcharts === 'undefined') {
            console.error('Highcharts is not loaded!');
            sideDefectsContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;">Chart library loading...</div>';
        } else {
            try {
                const chart = Highcharts.chart('sideDefectsChart', {
                    chart: {
                        type: 'pie',
                        options3d: {
                            enabled: true,
                            alpha: 45,
                            beta: 0
                        },
                        backgroundColor: 'transparent',
                        style: {
                            fontFamily: 'Inter, sans-serif'
                        },
                        marginTop: 40,
                        marginBottom: 100,
                        marginLeft: 40,
                        marginRight: 40,
                        events: {
                            load: function() {
                                const self = this;
                                setTimeout(() => {
                                    self.reflow();
                                }, 100);
                            }
                        }
                    },
                    title: { text: '' },
                    accessibility: {
                        point: { valueSuffix: '%' }
                    },
                    tooltip: {
                        pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
                    },
                    legend: {
                        enabled: true,
                        verticalAlign: 'bottom',
                        layout: 'horizontal',
                        align: 'center',
                        itemWidth: 150, // Force 2 columns if width is ~300px
                        itemStyle: {
                            fontSize: '10px',
                            fontWeight: '600',
                            color: '#666'
                        },
                        padding: 10
                    },
                    plotOptions: {
                        pie: {
                            allowPointSelect: true,
                            cursor: 'pointer',
                            depth: 55,
                            size: '85%', // Reduced slightly to prevent bubbles from hitting card edges
                            center: ['50%', '35%'], // Shifted up more to accommodate 2-column legend
                            showInLegend: true,
                            dataLabels: {
                                enabled: true,
                                useHTML: true,
                                connectorColor: '#eee',
                                distance: 25,
                                padding: 0, // Prevent internal Highcharts clipping
                                overflow: 'allow', // Allow labels to go outside plot area
                                crop: false, // Prevent cutting labels at chart edges
                                formatter: function() {
                                    const color = this.point.color;
                                    return `
                                        <div style="width: 38px; height: 38px; border-radius: 50%; border: 4px solid ${color}; display: flex; align-items: center; justify-content: center; background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); font-weight: 800; font-size: 12px; color: #333; position: relative; z-index: 10;">
                                            ${Math.round(this.point.percentage)}%
                                        </div>
                                    `;
                                }
                            },
                            states: {
                                hover: {
                                    brightness: 0.1,
                                    halo: {
                                        size: 0
                                    }
                                }
                            },
                            slicedOffset: 25
                        }
                    },
                    series: [{
                        name: 'Delays',
                        data: [
                            { name: 'machine breakdown', y: 15, color: '#2b81d6' },
                            { name: 'Material Shortage', y: 20, color: '#48b3e8', sliced: true, selected: true },
                            { name: 'Operator Delay', y: 10, color: '#8ec641' },
                            { name: 'Quality Check', y: 12, color: '#f7941d' },
                            { name: 'Tool Missing', y: 8, color: '#e6e7e8' },
                            { name: 'Power Outage', y: 5, color: '#3498db' },
                            { name: 'Schedule Change', y: 10, color: '#2ecc71' },
                            { name: 'pressure foot setting', y: 7, color: '#e74c3c' },
                            { name: 'operator learning curve', y: 8, color: '#f1c40f' },
                            { name: 'Other', y: 5, color: '#9b59b6' }
                        ]
                    }],                    credits: { enabled: false },
                    exporting: { enabled: false }
                });
            } catch (err) {
                console.error('Error initializing Highcharts:', err);
            }
        }
    }
});

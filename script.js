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

// Seeded random function for deterministic data based on date
function seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

window.getProductionDataForLine = function(lineNumber, dateStr) {
    const seedBase = dateStr ? parseInt(dateStr.replace(/-/g, '')) : parseInt(new Date().toISOString().split('T')[0].replace(/-/g, ''));
    let seed = seedBase;

    const getNextRandom = () => {
        const r = seededRandom(seed);
        seed += 1;
        return r;
    };

    const targets = [];
    for(let i=0; i<11; i++) {
        targets.push(Math.floor(1500 + getNextRandom() * 300));
    }

    const productions = [];
    for(let i=0; i<11; i++) {
        const efficiency = 0.8 + (getNextRandom() * 0.2);
        productions.push(Math.max(1200, Math.floor(targets[i] * efficiency)));
    }

    const idx = lineNumber - 1;
    if (idx >= 0 && idx < 11) {
        return { target: targets[idx], production: productions[idx] };
    }
    return { target: 1800, production: 1500 };
};

function refreshDashboardData(dateStr) {
    // Create a numeric seed from the date string (YYYY-MM-DD)
    const seedBase = dateStr ? parseInt(dateStr.replace(/-/g, '')) : parseInt(new Date().toISOString().split('T')[0].replace(/-/g, ''));
    let seed = seedBase;

    const getNextRandom = () => {
        const r = seededRandom(seed);
        seed += 1;
        return r;
    };

    // 1. Refresh Production Status Chart
    const prodChart = Chart.getChart('productionStatusChart');
    if (prodChart) {
        // Target up to 1800
        prodChart.data.datasets[0].data = prodChart.data.datasets[0].data.map(() => {
            return Math.floor(1500 + getNextRandom() * 300);
        });

        // Production between 1200 and target
        prodChart.data.datasets[1].data = prodChart.data.datasets[0].data.map(target => {
            const efficiency = 0.8 + (getNextRandom() * 0.2);
            return Math.max(1200, Math.floor(target * efficiency)); // Min 1200
        });
        
        prodChart.update();
    }

    // 2. Refresh Total Defects Chart
    const defChart = Chart.getChart('defectsChart');
    if (defChart) {
        defChart.data.datasets[0].data = defChart.data.datasets[0].data.map(() => Math.floor(40 + getNextRandom() * 60));
        defChart.update();
    }

    // 3. Refresh 3D Pie Chart (Highcharts)
    const highChart = Highcharts.charts.find(c => c && c.renderTo.id === 'sideDefectsChart');
    if (highChart) {
        const newData = highChart.series[0].data.map(p => {
            return {
                name: p.name,
                y: Math.floor(5 + getNextRandom() * 20),
                color: p.color
            };
        });
        highChart.series[0].setData(newData);
    }

    // 4. Update Gauge values
    const reasons = ["Machine Breakdown", "Absenteeism", "Mechanic Delay", "Needle Breakdown", "Material Shortage", "Power Outage"];
    
    document.querySelectorAll('.gauge-wrapper').forEach(gauge => {
        const newVal = Math.floor(65 + getNextRandom() * 30); // 65% to 95%
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

        let tooltip = gauge.querySelector('.gauge-tooltip');
        if (newVal < 80) {
            const randomReason = reasons[Math.floor(getNextRandom() * reasons.length)];
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
        const chartData = [];
        for (let i = 0; i < 11; i++) {
            chartData.push({ x: i + 1, y: Math.floor(30 + getNextRandom() * 100) });
        }
        avgChart.data.datasets[0].data = chartData;
        avgChart.update();
    }
}

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

    // --- CHART INITIALIZATIONS MUST HAPPEN BEFORE DATE PICKER onReady ---

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
                        label: 'Average Changeover Time',
                        data: [], 
                        backgroundColor: '#2ecc71',
                        borderColor: '#2ecc71',
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
                        data: [1600, 1750, 1800, 1500, 1700, 1400, 1650, 1800, 1550, 1300, 1700],
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
                        data: [1400, 1600, 1700, 1250, 1500, 1200, 1450, 1750, 1350, 1200, 1550],
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
                        min: 1200,
                        max: 1800,
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

    // Machine Required Chart (Main)
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
                            { name: 'Machine Breakdown', y: 15, color: '#0000ff' },     // Blue
                            { name: 'Material Shortage', y: 20, color: '#00a6a6', sliced: true, selected: true }, // Teal
                            { name: 'Operator Delay', y: 10, color: '#228b22' },        // Green
                            { name: 'Quality Check', y: 12, color: '#9acd32' },        // Yellow-Green
                            { name: 'Tool Missing', y: 8, color: '#cca300' },         // Golden
                            { name: 'Power Outage', y: 5, color: '#e65c00' },         // Orange-Red
                            { name: 'Schedule Change', y: 10, color: '#a00000' },       // Darker Red
                            { name: 'Pressure Foot Setting', y: 7, color: '#e6008e' },   // Lighter Magenta
                            { name: 'Operator Learning Curve', y: 8, color: '#800080' }, // Purple
                            { name: 'Other', y: 5, color: '#00008b' }                 // Dark Blue
                        ]
                    }],                    credits: { enabled: false },
                    exporting: { enabled: false }
                });
            } catch (err) {
                console.error('Error initializing Highcharts:', err);
            }
        }
    }

    // Date Picker Logic (Flatpickr)
    const selectedDateText = document.getElementById('selectedDateText');
    const datePickerInput = document.getElementById('datePicker');
    
    if (datePickerInput && selectedDateText) {
        const today = new Date().toISOString().split('T')[0];
        flatpickr(datePickerInput, {
            dateFormat: "Y-m-d",
            maxDate: "today",
            defaultDate: today,
            disableMobile: true, // Force custom calendar even on mobile
            onReady: function(selectedDates, dateStr) {
                if (selectedDateText) {
                    selectedDateText.textContent = dateStr;
                    // Ensure initial data matches the default date (Charts exist now)
                    refreshDashboardData(dateStr);
                }
            },
            onChange: function(selectedDates, dateStr) {
                if (selectedDateText) {
                    selectedDateText.textContent = dateStr;
                    console.log('Date selected:', dateStr);
                    
                    // Simulate data refresh for all charts
                    refreshDashboardData(dateStr);
                }
            }
        });
    }

    // Machine Details Card — load from Excel via API
    const factorySelect = document.getElementById('factorySelect');
    const selectedFactoryName = document.getElementById('selectedFactoryName');
    const totalUtilVal = document.getElementById('totalUtilVal');
    const machineList = document.getElementById('machineList');

    let machineData = {};

    function renderMachineList(lineNum) {
        const sections = machineData[lineNum];
        if (!sections || sections.length === 0) {
            machineList.innerHTML = '<p style="color:#aaa;font-size:13px;">No data available</p>';
            totalUtilVal.textContent = '';
            return;
        }
        const total = sections.reduce((s, x) => s + x.total, 0);
        selectedFactoryName.textContent = 'Line ' + lineNum;
        totalUtilVal.textContent = 'Total: ' + total + ' machines';

        // Find max for bar scaling
        const max = Math.max(...sections.map(s => s.total));

        machineList.innerHTML = sections.map(s => {
            const pct = Math.round((s.total / max) * 100);
            // Colour by count: green ≥15, yellow ≥8, red <8
            const color = s.total >= 15 ? '#2ecc71' : s.total >= 8 ? '#f1c40f' : '#e74c3c';
            return `
                <div class="machine-item" style="margin-bottom: 10px;">
                    <span class="machine-name" style="min-width: 110px; font-size: 11px; text-transform: capitalize;">${s.section.charAt(0) + s.section.slice(1).toLowerCase()}</span>
                    <div class="progress-wrap" style="flex:1;">
                        <div class="progress-bg">
                            <div class="progress-fill" style="width:${pct}%; background-color:${color};"></div>
                        </div>
                    </div>
                    <span style="min-width:28px; text-align:right; font-size:12px; font-weight:700; color:${color}; margin-left:8px;">${s.total}</span>
                </div>`;
        }).join('');
    }

    if (factorySelect && machineList) {
        fetch('/api/machine-details')
            .then(r => r.json())
            .then(data => {
                machineData = data;
                renderMachineList(1);
            })
            .catch(() => {
                machineList.innerHTML = '<p style="color:#e74c3c;font-size:13px;">Failed to load data</p>';
            });

        factorySelect.addEventListener('change', function () {
            renderMachineList(parseInt(this.value));
        });
    }
});

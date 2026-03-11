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
            disableMobile: true, // Force custom calendar even on mobile
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
            prodChart.data.datasets[0].data = prodChart.data.datasets[0].data.map(v => Math.floor(v * (0.8 + Math.random() * 0.4)));
            prodChart.data.datasets[1].data = prodChart.data.datasets[1].data.map(v => Math.floor(v * (0.8 + Math.random() * 0.4)));
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
        document.querySelectorAll('.gauge-wrapper').forEach(gauge => {
            const newVal = Math.floor(60 + Math.random() * 35);
            gauge.style.setProperty('--gauge-percent', newVal);
            const valueSpan = gauge.querySelector('.gauge-value');
            if (valueSpan) valueSpan.textContent = newVal + '%';
            
            const path = gauge.querySelector('path:last-child');
            if (path) {
                const dashArray = 125.66;
                const dashOffset = dashArray * (1 - newVal / 100);
                path.style.strokeDashoffset = dashOffset;
            }
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
        '1': {
            name: 'Factory 1',
            total: '75%',
            machines: [
                { name: 'Cutting Machines', val: 80 },
                { name: 'Sewing Machines', val: 70 },
                { name: 'Embroidery Machines', val: 75 },
                { name: 'Finishing Machines', val: 60 }
            ]
        },
        '2': {
            name: 'Factory 2',
            total: '82%',
            machines: [
                { name: 'Cutting Machines', val: 85 },
                { name: 'Sewing Machines', val: 78 },
                { name: 'Embroidery Machines', val: 80 },
                { name: 'Finishing Machines', val: 85 }
            ]
        },
        '3': {
            name: 'Factory 3',
            total: '68%',
            machines: [
                { name: 'Cutting Machines', val: 60 },
                { name: 'Sewing Machines', val: 65 },
                { name: 'Embroidery Machines', val: 70 },
                { name: 'Finishing Machines', val: 75 }
            ]
        },
        '4': {
            name: 'Factory 4',
            total: '85%',
            machines: [
                { name: 'Cutting Machines', val: 80 },
                { name: 'Sewing Machines', val: 70 },
                { name: 'Embroidery Machines', val: 65 },
                { name: 'Finishing Machines', val: 80 }
            ]
        },
        '5': {
            name: 'Factory 5',
            total: '90%',
            machines: [
                { name: 'Cutting Machines', val: 95 },
                { name: 'Sewing Machines', val: 88 },
                { name: 'Embroidery Machines', val: 85 },
                { name: 'Finishing Machines', val: 92 }
            ]
        }
    };

    if (factorySelect) {
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
                            center: ['50%', '40%'],
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
                            { name: 'Machine Failure', y: 15, color: '#2b81d6' },
                            { name: 'Material Shortage', y: 20, color: '#48b3e8', sliced: true, selected: true },
                            { name: 'Operator Delay', y: 10, color: '#8ec641' },
                            { name: 'Quality Check', y: 12, color: '#f7941d' },
                            { name: 'Tool Missing', y: 8, color: '#e6e7e8' },
                            { name: 'Power Outage', y: 5, color: '#3498db' },
                            { name: 'Schedule Change', y: 10, color: '#2ecc71' },
                            { name: 'Maintenance', y: 7, color: '#e74c3c' },
                            { name: 'Supervisor Sync', y: 8, color: '#f1c40f' },
                            { name: 'Other', y: 5, color: '#9b59b6' }
                        ]
                    }],
                    credits: { enabled: false },
                    exporting: { enabled: false }
                });
            } catch (err) {
                console.error('Error initializing Highcharts:', err);
            }
        }
    }
});

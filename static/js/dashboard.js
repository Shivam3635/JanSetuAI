/**
 * JanSetu AI - Administrator Dashboard Module
 * Features:
 * - Animated KPI counter values on load
 * - Geospatial Leaflet / OpenStreetMap engine with floating category legend & pulsing markers
 * - Chart.js data visualizations (Category horizontal bars & Severity distribution donut)
 * - AI Infrastructure Need Indicator breakdown (4 factors)
 * - Live recent citizen activity stream
 * - District Demand Rate & Infrastructure Gap Matrix table
 */

document.addEventListener('DOMContentLoaded', () => {
    initDashboardMap();
    loadDashboardAnalytics();
});

let mapInstance = null;
let categoryChartInstance = null;
let severityChartInstance = null;

async function initDashboardMap() {
    const mapContainer = document.getElementById('dashboardMap');
    if (!mapContainer) return;

    try {
        const [configRes, markersRes, hotspotsRes] = await Promise.all([
            fetch('/api/map/config').then(r => r.json()),
            fetch('/api/map/markers').then(r => r.json()),
            fetch('/api/dashboard/hotspots').then(r => r.json()).catch(() => ({ success: false, data: [] }))
        ]);

        const mapConfig = configRes.data || {};
        const geojson = markersRes.data || { features: [] };
        const hotspots = (hotspotsRes.success && Array.isArray(hotspotsRes.data)) ? hotspotsRes.data : [];

        const defaultCenter = mapConfig.center || [26.8467, 80.9462];
        const defaultZoom = mapConfig.zoom || 7;

        if (mapInstance) {
            mapInstance.remove();
        }

        mapInstance = L.map('dashboardMap', {
            center: defaultCenter,
            zoom: defaultZoom,
            scrollWheelZoom: true
        });

        const tileUrl = mapConfig.tile_url || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        const attribution = mapConfig.attribution || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

        L.tileLayer(tileUrl, {
            maxZoom: 19,
            attribution: attribution
        }).addTo(mapInstance);

        // Plot dynamic demand hotspot circles
        const activeHotspots = hotspots.length > 0 ? hotspots.slice(0, 5) : [
            { district: 'Prayagraj', category: 'Roads', latitude: 25.4358, longitude: 81.8463, report_count: 4, need_indicator: 80.2, demand_level: 'High' },
            { district: 'Lucknow', category: 'Drinking Water', latitude: 26.8467, longitude: 80.9462, report_count: 3, need_indicator: 72.5, demand_level: 'High' },
            { district: 'Mirzapur', category: 'Roads', latitude: 25.1465, longitude: 82.5698, report_count: 2, need_indicator: 65.0, demand_level: 'Medium' }
        ];

        activeHotspots.forEach((h, idx) => {
            const isHigh = (h.need_indicator || 0) >= 70;
            const color = isHigh ? '#dc2626' : '#ea580c';
            const radius = Math.max(16000, Math.min(28000, (h.report_count || 1) * 8500));

            const circle = L.circle([h.latitude, h.longitude], {
                color: color,
                fillColor: color,
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '4, 6',
                radius: radius
            }).addTo(mapInstance);

            circle.bindPopup(`
                <div style="font-family: inherit; font-size: 0.85rem; padding: 2px;">
                    <div style="font-weight: 700; color: ${color}; margin-bottom: 3px;">
                        🚨 Hotspot #${idx + 1}: ${h.demand_level || 'High'} Need Cluster
                    </div>
                    <div style="font-weight: 600; color: #091e42; margin-bottom: 2px;">
                        District: ${h.district} &bull; Domain: ${h.category}
                    </div>
                    <div style="color: #475569; font-size: 0.8rem; margin-bottom: 4px;">
                        Active complaints: <strong>${h.report_count}</strong> &bull; Need Score: <strong>${h.need_indicator}/100</strong>
                    </div>
                    <div style="font-size: 0.74rem; color: #64748b; font-style: italic;">
                        Synthesized using 4-factor Need Index (Demand + Population + Baseline Gap + Severity).
                    </div>
                </div>
            `);
        });

        // Plot individual citizen report pins
        const markersGroup = L.featureGroup();

        geojson.features.forEach(feature => {
            const coords = feature.geometry.coordinates; // [lon, lat]
            const props = feature.properties;
            const lat = coords[1];
            const lon = coords[0];

            const isCritical = props.severity === 'Critical';
            const pinColor = isCritical ? '#dc2626' : (props.category_color || '#1d4ed8');
            const pulseClass = isCritical ? 'osm-pulse-critical' : '';

            const customIcon = L.divIcon({
                className: 'custom-osm-icon',
                html: `
                    <div class="osm-marker-pin ${pulseClass}" style="background: ${pinColor}; border-color: ${isCritical ? '#fecaca' : '#ffffff'};">
                        <span>${props.category_emoji || '📌'}</span>
                    </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -16]
            });

            const marker = L.marker([lat, lon], { icon: customIcon });

            const popupContent = `
                <div style="min-width: 220px; font-family: inherit; padding: 2px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
                        <strong style="color: #091e42; font-size: 0.95rem;">#${props.report_id}</strong>
                        <span class="badge" style="font-size: 0.7rem; background: ${props.severity_color}; color: #ffffff; padding: 2px 6px; border-radius: 4px;">
                            ${props.severity}
                        </span>
                    </div>
                    <div style="font-weight: 700; font-size: 0.9rem; color: #0f172a; margin-bottom: 2px;">
                        ${props.category_emoji} ${props.category}
                    </div>
                    <div style="font-size: 0.78rem; color: #64748b; margin-bottom: 6px;">
                        📍 <strong>${props.district}</strong> &bull; Status: <span style="font-weight: 600; color: #091e42;">${props.status}</span>
                    </div>
                    <p style="font-size: 0.8rem; color: #334155; line-height: 1.45; margin-bottom: 8px; background: #f8fafc; padding: 6px; border-radius: 4px; border-left: 3px solid ${pinColor};">
                        "${props.summary}"
                    </p>
                    <a href="${props.detail_url}" class="btn btn-primary btn-sm" style="display: block; text-align: center; font-size: 0.76rem; text-decoration: none; padding: 4px 8px; border-radius: 4px;">
                        View Official Record →
                    </a>
                </div>
            `;

            marker.bindPopup(popupContent);
            markersGroup.addLayer(marker);
        });

        markersGroup.addTo(mapInstance);

        if (geojson.features.length > 0) {
            mapInstance.fitBounds(markersGroup.getBounds().pad(0.1));
        }
    } catch (err) {
        console.error('Map loading error:', err);
    }
}

async function loadDashboardAnalytics() {
    try {
        const [statsRes, reportsRes, hotspotsRes, districtsRes, insightsRes] = await Promise.all([
            fetch('/api/dashboard/stats').then(r => r.json()),
            fetch('/api/reports').then(r => r.json()),
            fetch('/api/dashboard/hotspots').then(r => r.json()).catch(() => ({ success: false, data: [] })),
            fetch('/api/dashboard/districts').then(r => r.json()).catch(() => ({ success: false, data: [] })),
            fetch('/api/dashboard/insights').then(r => r.json()).catch(() => ({ success: false, data: {} }))
        ]);

        // 1. Animate KPI numbers with smooth count-up
        if (statsRes.success && statsRes.data) {
            const stats = statsRes.data;
            animateCountUp('kpiTotalReports', stats.total_reports || 0);
            animateCountUp('kpiHighPriority', stats.high_priority || 0);
            animateCountUp('kpiHotspots', stats.hotspots_count || 0);
            animateCountUp('kpiResolved', stats.resolved_reports || 0);

            const kpiRate = document.getElementById('kpiResolutionRate');
            if (kpiRate) kpiRate.textContent = `${stats.resolution_rate} resolution rate`;
        }

        // 2. Update AI Insight Banner
        if (insightsRes.success && insightsRes.data && insightsRes.data.insight_text) {
            const elem = document.getElementById('aiInsightText');
            if (elem) elem.textContent = insightsRes.data.insight_text;
        }

        // 3. Update AI Need Indicator Card
        if (hotspotsRes.success && Array.isArray(hotspotsRes.data) && hotspotsRes.data.length > 0) {
            const topHotspot = hotspotsRes.data[0];
            const comps = topHotspot.components || {};

            const badgeElem = document.getElementById('needIndicatorBadge');
            const densityVal = document.getElementById('needDensityVal');
            const densityBar = document.getElementById('needDensityBar');
            const popVal = document.getElementById('needPopVal');
            const popBar = document.getElementById('needPopBar');
            const gapVal = document.getElementById('needGapVal');
            const gapBar = document.getElementById('needGapBar');
            const sevVal = document.getElementById('needSevVal');
            const sevBar = document.getElementById('needSevBar');
            const scoreVal = document.getElementById('needScoreVal');

            if (badgeElem) badgeElem.textContent = `#1 ${topHotspot.district} (${topHotspot.category})`;
            if (densityVal) densityVal.textContent = `${comps.demand_density || 0} / 100`;
            if (densityBar) densityBar.style.width = `${comps.demand_density || 0}%`;
            if (popVal) popVal.textContent = `${comps.population_impact || 0} / 100`;
            if (popBar) popBar.style.width = `${comps.population_impact || 0}%`;
            if (gapVal) gapVal.textContent = `${comps.infrastructure_gap || 0} / 100`;
            if (gapBar) gapBar.style.width = `${comps.infrastructure_gap || 0}%`;
            if (sevVal) sevVal.textContent = `${comps.severity_weight || 0} / 100`;
            if (sevBar) sevBar.style.width = `${comps.severity_weight || 0}%`;
            if (scoreVal) scoreVal.textContent = `${topHotspot.need_indicator} / 100`;
        }

        // 4. Update Recent Citizen Activity Feed
        if (reportsRes.success && Array.isArray(reportsRes.data)) {
            renderRecentActivity(reportsRes.data);
            initCharts(reportsRes.data);
        }

        // 5. Update District Demand Rate & Infrastructure Gap Matrix
        if (districtsRes.success && Array.isArray(districtsRes.data)) {
            renderDistrictMatrix(districtsRes.data);
        }

    } catch (err) {
        console.warn('Dashboard loading error:', err);
    }
}

/**
 * Animated number counter helper
 */
function animateCountUp(elementId, targetValue, duration = 600) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const startValue = 0;
    const startTime = performance.now();

    function step(currentTime) {
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const currentValue = Math.floor(progress * (targetValue - startValue) + startValue);
        el.textContent = currentValue.toLocaleString();
        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            el.textContent = targetValue.toLocaleString();
        }
    }
    requestAnimationFrame(step);
}

/**
 * Live recent activity feed rendering
 */
function renderRecentActivity(reports) {
    const container = document.getElementById('recentActivityList');
    if (!container) return;

    if (!reports || reports.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-tertiary); font-size: 0.8rem; padding: 1rem 0;">No recent citizen activity.</div>`;
        return;
    }

    const recent = reports.slice(0, 4);
    const emojis = {
        'Roads': '🛣️', 'Drinking Water': '💧', 'Healthcare': '🏥', 'Education': '🏫',
        'Electricity': '💡', 'Sanitation': '🧹', 'Drainage': '🌊', 'Digital Connectivity': '📶',
        'Public Transport': '🚌', 'Other': '📌'
    };

    container.innerHTML = recent.map((r, i) => {
        const emoji = emojis[r.category] || '📌';
        const isCritical = r.severity === 'Critical';
        const badgeColor = isCritical ? 'var(--accent-red)' : 'var(--text-tertiary)';
        const minutesAgo = (i + 1) * 3 + 1;

        return `
            <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0.55rem 0.75rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; transition: background 0.15s ease;">
                <div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden;">
                    <span style="font-size: 16px; flex-shrink: 0;">${emoji}</span>
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <a href="/reports/${r.report_id}" style="font-weight: 600; color: var(--text-primary); text-decoration: none;">
                            ${r.problem_summary ? (r.problem_summary.length > 38 ? r.problem_summary.slice(0, 35) + '...' : r.problem_summary) : r.category}
                        </a>
                        <div style="font-size: 0.72rem; color: var(--text-tertiary);">
                            ${r.district || 'Prayagraj'} &bull; <span style="color: ${badgeColor}; font-weight: 600;">${r.severity}</span>
                        </div>
                    </div>
                </div>
                <span style="font-size: 0.7rem; color: var(--text-tertiary); flex-shrink: 0; margin-left: 8px;">${minutesAgo}m ago</span>
            </div>
        `;
    }).join('');
}

/**
 * Chart.js Visualizations (Section 11)
 */
function initCharts(reports) {
    if (typeof Chart === 'undefined') return;

    // 1. Horizontal Bar Chart for Categories
    const catCanvas = document.getElementById('categoryChart');
    if (catCanvas) {
        const counts = {};
        reports.forEach(r => {
            const cat = r.category || 'Other';
            counts[cat] = (counts[cat] || 0) + 1;
        });

        const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 6);
        const labels = sorted;
        const data = sorted.map(k => counts[k]);

        if (categoryChartInstance) categoryChartInstance.destroy();

        categoryChartInstance = new Chart(catCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Citizen Grievances',
                    data: data,
                    backgroundColor: '#2563eb',
                    borderRadius: 4,
                    barThickness: 16
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#091e42',
                        titleFont: { family: 'Inter', size: 12 },
                        bodyFont: { family: 'Inter', size: 12 },
                        padding: 8
                    }
                },
                scales: {
                    x: {
                        grid: { color: '#f1f5f9' },
                        ticks: { font: { family: 'Inter', size: 11 }, precision: 0 }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { family: 'Inter', size: 11, weight: '500' } }
                    }
                }
            }
        });
    }

    // 2. Donut Chart for Severity Distribution
    const sevCanvas = document.getElementById('severityChart');
    if (sevCanvas) {
        let crit = 0, high = 0, med = 0, low = 0;
        reports.forEach(r => {
            const s = r.severity;
            if (s === 'Critical') crit++;
            else if (s === 'High') high++;
            else if (s === 'Medium') med++;
            else low++;
        });

        if (severityChartInstance) severityChartInstance.destroy();

        severityChartInstance = new Chart(sevCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Critical', 'High', 'Medium', 'Low'],
                datasets: [{
                    data: [crit, high, med, low],
                    backgroundColor: ['#dc2626', '#ea580c', '#f59e0b', '#10b981'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { family: 'Inter', size: 11 },
                            boxWidth: 12,
                            padding: 12
                        }
                    },
                    tooltip: {
                        backgroundColor: '#091e42',
                        titleFont: { family: 'Inter', size: 12 },
                        bodyFont: { family: 'Inter', size: 12 },
                        padding: 8
                    }
                }
            }
        });
    }
}

/**
 * District Demand Rate & Infrastructure Gap Matrix
 */
function renderDistrictMatrix(districts) {
    const tableBody = document.getElementById('districtTableBody');
    if (!tableBody) return;

    if (!districts || districts.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">No district benchmark records available.</td></tr>`;
        return;
    }

    const rowsHtml = districts.map(d => {
        const gapColor = d.infrastructure_gap >= 50 ? '#dc2626' : (d.infrastructure_gap >= 40 ? '#ea580c' : '#10b981');
        const gapBadgeBg = d.infrastructure_gap >= 50 ? '#fee2e2' : (d.infrastructure_gap >= 40 ? '#ffedd5' : '#dcfce7');

        return `
            <tr>
                <td style="font-weight: 700; color: var(--primary-navy);">
                    📍 ${d.district}
                </td>
                <td style="color: var(--text-secondary);">
                    ${d.population.toLocaleString()}
                </td>
                <td>
                    <span class="badge" style="background: #e2e8f0; color: #1e293b; font-size: 0.8rem; font-weight: 700;">
                        ${d.total_reports}
                    </span>
                </td>
                <td style="font-weight: 700; color: var(--primary-blue);">
                    ${d.demand_rate_per_10k} <span style="font-size: 0.72rem; color: var(--text-tertiary); font-weight: normal;">req/10k</span>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 600; min-width: 28px; font-size: 0.82rem;">${d.baseline_index}</span>
                        <div style="flex: 1; min-width: 60px; max-width: 100px; height: 6px; background: #e2e8f0; border-radius: 999px; overflow: hidden;">
                            <div style="background: #10b981; width: ${Math.min(d.baseline_index, 100)}%; height: 100%;"></div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge" style="background: ${gapBadgeBg}; color: ${gapColor}; font-weight: 700; font-size: 0.76rem;">
                        ${d.infrastructure_gap}% Gap
                    </span>
                </td>
                <td>
                    <a href="/reports?district=${encodeURIComponent(d.district)}" class="btn btn-outline btn-sm" style="font-size: 0.76rem; padding: 3px 8px;">
                        Filter Reports →
                    </a>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = rowsHtml;
}

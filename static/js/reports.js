/**
 * JanSetu AI - Public & Admin Reports Directory Module (Phase 5)
 * Features:
 * - Dynamic data retrieval from /api/reports
 * - Client-side real-time multi-facet filtering (Search, Category, District, Severity, Status, Language)
 * - Dynamic counter badges and empty-state messaging
 * - Direct routing to individual report details
 */

document.addEventListener('DOMContentLoaded', () => {
    initReportsDirectory();
});

let allReports = [];

async function initReportsDirectory() {
    const tableBody = document.getElementById('reportsTableBody');
    const countBadge = document.getElementById('reportsCountBadge');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const districtFilter = document.getElementById('districtFilter');
    const severityFilter = document.getElementById('severityFilter');
    const statusFilter = document.getElementById('statusFilter');
    const languageFilter = document.getElementById('languageFilter');
    const resetBtn = document.getElementById('resetFiltersBtn');

    if (!tableBody) return;

    // 1. Fetch initial reports dataset
    try {
        const response = await fetch('/api/reports');
        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
            allReports = result.data;
            
            // Parse initial query params from URL (e.g. /reports?district=Prayagraj)
            const urlParams = new URLSearchParams(window.location.search);
            const distParam = urlParams.get('district');
            const catParam = urlParams.get('category');
            const sevParam = urlParams.get('severity');
            const statParam = urlParams.get('status');

            if (distParam && districtFilter) districtFilter.value = distParam;
            if (catParam && categoryFilter) categoryFilter.value = catParam;
            if (sevParam && severityFilter) severityFilter.value = sevParam;
            if (statParam && statusFilter) statusFilter.value = statParam;

            if (distParam || catParam || sevParam || statParam) {
                applyFilters();
            } else {
                renderReports(allReports);
            }
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: var(--accent-red);">
                        Failed to load reports. Please refresh the page.
                    </td>
                </tr>
            `;
        }
    } catch (err) {
        console.error('Error fetching reports:', err);
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: var(--accent-red);">
                    Network error while fetching reports.
                </td>
            </tr>
        `;
    }

    // 2. Attach Filter Event Listeners
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
    if (districtFilter) districtFilter.addEventListener('change', applyFilters);
    if (severityFilter) severityFilter.addEventListener('change', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    if (languageFilter) languageFilter.addEventListener('change', applyFilters);

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (categoryFilter) categoryFilter.value = '';
            if (districtFilter) districtFilter.value = '';
            if (severityFilter) severityFilter.value = '';
            if (statusFilter) statusFilter.value = '';
            if (languageFilter) languageFilter.value = '';
            renderReports(allReports);
            showToast('Filters cleared.', 'info');
        });
    }

    // 3. Filtering Engine
    function applyFilters() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const cat = categoryFilter ? categoryFilter.value : '';
        const dist = districtFilter ? districtFilter.value : '';
        const sev = severityFilter ? severityFilter.value : '';
        const stat = statusFilter ? statusFilter.value : '';
        const lang = languageFilter ? languageFilter.value : '';

        const filtered = allReports.filter(r => {
            // Text Search matching description, summary, district, report_id, or keywords
            if (query) {
                const desc = (r.description || '').toLowerCase();
                const summary = (r.problem_summary || '').toLowerCase();
                const repId = (r.report_id || '').toLowerCase();
                const district = (r.district || '').toLowerCase();
                const keywords = (r.keywords || []).map(k => String(k).toLowerCase()).join(' ');

                const matchesQuery = desc.includes(query) || 
                                     summary.includes(query) || 
                                     repId.includes(query) || 
                                     district.includes(query) || 
                                     keywords.includes(query);
                if (!matchesQuery) return false;
            }

            if (cat && r.category !== cat) return false;
            if (dist && r.district !== dist) return false;
            if (sev && r.severity !== sev) return false;
            if (stat && r.status !== stat) return false;
            if (lang && r.language !== lang) return false;

            return true;
        });

        renderReports(filtered);
    }

    // 4. Render Table Rows
    function renderReports(reportsList) {
        if (countBadge) {
            countBadge.textContent = `Showing ${reportsList.length} of ${allReports.length} grievances`;
        }

        if (reportsList.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
                        <div style="font-weight: 600; font-size: 1rem; color: var(--primary-navy);">No grievances match the selected criteria</div>
                        <div style="font-size: 0.85rem; margin-top: 0.25rem;">Try clearing your search query or adjusting filter dropdowns.</div>
                    </td>
                </tr>
            `;
            return;
        }

        const categoryEmojis = {
            'Roads': '🛣️',
            'Drinking Water': '💧',
            'Healthcare': '🏥',
            'Education': '🏫',
            'Electricity': '💡',
            'Sanitation': '🧹',
            'Drainage': '🌊',
            'Digital Connectivity': '📶',
            'Public Transport': '🚌',
            'Other': '📌'
        };

        const rowsHtml = reportsList.map(r => {
            const catEmoji = categoryEmojis[r.category] || '📌';
            const sev = r.severity || 'Medium';

            let sevClass = 'badge-severity-medium';
            let sevIcon = '🟡';
            if (sev === 'Critical') {
                sevClass = 'badge-severity-critical';
                sevIcon = '⚠️';
            } else if (sev === 'High') {
                sevClass = 'badge-severity-high';
                sevIcon = '🔴';
            } else if (sev === 'Low') {
                sevClass = 'badge-severity-low';
                sevIcon = '🟢';
            }

            const stat = r.status || 'Submitted';
            let statClass = 'badge-status-review';
            if (stat === 'Resolved') statClass = 'badge-status-resolved';

            const langBadge = r.language === 'Hindi' 
                ? '<span class="badge badge-lang" style="font-size: 0.7rem; margin-top: 0.25rem;">🇮🇳 Hindi</span>'
                : '<span class="badge badge-lang" style="font-size: 0.7rem; margin-top: 0.25rem;">🌐 English</span>';

            const summary = r.problem_summary || r.description || '';
            const descSnippet = r.description ? `"${r.description.length > 60 ? r.description.slice(0, 57) + '...' : r.description}"` : '';

            return `
                <tr style="cursor: pointer;" onclick="if(event.target.tagName !== 'A') window.location='/reports/${r.report_id}'">
                    <td style="font-weight: 700; color: var(--primary-navy);">
                        #${r.report_id}
                    </td>
                    <td style="white-space: nowrap;">
                        <span class="badge badge-category">
                            ${catEmoji} ${r.category || 'General'}
                        </span>
                    </td>
                    <td style="max-width: 340px;">
                        <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-primary); margin-bottom: 0.15rem;">
                            ${summary}
                        </div>
                        <div style="font-size: 0.78rem; color: var(--text-tertiary); font-style: italic;">
                            ${descSnippet}
                        </div>
                        ${langBadge}
                    </td>
                    <td style="font-weight: 500;">
                        ${r.district || 'Unspecified'}
                    </td>
                    <td style="white-space: nowrap;">
                        <span class="badge ${sevClass}">
                            ${sevIcon} ${sev}
                        </span>
                    </td>
                    <td style="white-space: nowrap;">
                        <span class="badge ${statClass}" id="tableStatus-${r.report_id}">
                            ${stat}
                        </span>
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                        <a href="/reports/${r.report_id}" class="btn btn-outline btn-sm" style="font-size: 0.76rem; padding: 3px 8px;">
                            View →
                        </a>
                    </td>
                </tr>
            `;
        }).join('');

        tableBody.innerHTML = rowsHtml;
    }
}

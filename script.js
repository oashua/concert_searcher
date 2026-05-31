let allConcerts = [];
let filteredConcerts = [];
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', () => {
    // Load data from global variable dbData (defined in data.js)
    if (typeof dbData !== 'undefined') {
        const now = new Date();
        // 载入时过滤掉结束时间早于当前时间的此项
        now.setHours(0, 0, 0, 0); // 取今日凌晨，或者不设置直接用当前精确时间
        
        allConcerts = dbData.filter(concert => {
            const timeInfo = parseTimeInfo(concert.time);
            return timeInfo.endDate >= new Date(); // endDate必须晚于等于当前时间
        });
        
        initialize();
    } else {
        console.error('dbData is not defined. Make sure data.js is loaded.');
        alert('Data could not be loaded. Please ensure data.js is present.');
    }

    // Add event listeners for Enter key in search
    document.getElementById('track-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') applyFilters();
    });
});

function initialize() {
    populateCityFilter();
    
    // Display update date if available
    if (typeof updateDate !== 'undefined') {
        const updateDiv = document.getElementById('last-update');
        if (updateDiv) {
            updateDiv.textContent = `\u6570\u636e\u66f4\u65b0\u65f6\u95f4: 2026-05-31`;
        }
    }
    
    applyFilters(); // Show all initially
}

function populateCityFilter() {
    const citySelect = document.getElementById('city-filter');
    const cities = new Set(allConcerts.map(c => c.city));
    
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });
}

function getFilterValues() {
    const priceMinInput = document.getElementById('price-min').value;
    const priceMaxInput = document.getElementById('price-max').value;

    return {
        trackQuery: document.getElementById('track-search').value.toLowerCase().trim(),
        searchType: document.querySelector('input[name="search-type"]:checked').value,
        city: document.getElementById('city-filter').value,
        dateStart: document.getElementById('date-start').value,
        dateEnd: document.getElementById('date-end').value,
        priceMin: priceMinInput === '' ? 0 : parseInt(priceMinInput),
        priceMax: priceMaxInput === '' ? Infinity : parseInt(priceMaxInput),
        sortOrder: document.getElementById('sort-order').value
    };
}

function parseTimeInfo(timeStr) {
    if (!timeStr) return { parsedDisplay: '未知时间', startDate: new Date(0), endDate: new Date(0) };

    const rangeMatch = timeStr.match(/(20\d\d)\.(\d\d)\.(\d\d)-(\d\d)\.(\d\d)/);
    if (rangeMatch) {
        const year = rangeMatch[1];
        return {
            parsedDisplay: `${year}.${rangeMatch[2]}.${rangeMatch[3]} - ${year}.${rangeMatch[4]}.${rangeMatch[5]}`,
            startDate: new Date(`${year}-${rangeMatch[2]}-${rangeMatch[3]}T00:00:00`),
            endDate: new Date(`${year}-${rangeMatch[4]}-${rangeMatch[5]}T23:59:59`)
        };
    }

    const singleMatch = timeStr.match(/(20\d\d)\.(\d\d)\.(\d\d)/);
    if (singleMatch) {
        return {
            parsedDisplay: `${singleMatch[1]}.${singleMatch[2]}.${singleMatch[3]}`,
            startDate: new Date(`${singleMatch[1]}-${singleMatch[2]}-${singleMatch[3]}T00:00:00`),
            endDate: new Date(`${singleMatch[1]}-${singleMatch[2]}-${singleMatch[3]}T23:59:59`)
        };
    }

    let fallbackDate = new Date(timeStr);
    if (isNaN(fallbackDate.getTime())) {
        fallbackDate = new Date();
    }
    
    let fallbackEnd = new Date(fallbackDate.getTime());
    fallbackEnd.setHours(23, 59, 59, 999);
    
    return {
        parsedDisplay: timeStr,
        startDate: fallbackDate,
        endDate: fallbackEnd
    };
}

function applyFilters() {
    const filters = getFilterValues();
    
    let filtered = allConcerts.filter(concert => {
        // 1. Search (Track or Title)
        let searchMatch = true;
        if (filters.trackQuery) {
            if (filters.searchType === 'track') {
                searchMatch = concert.tracks.some(track => 
                    track.toLowerCase().includes(filters.trackQuery)
                );
            } else if (filters.searchType === 'title') {
                searchMatch = concert.name.toLowerCase().includes(filters.trackQuery);
            }
        }

        // 2. City Filter
        let cityMatch = true;
        if (filters.city) {
            cityMatch = concert.city === filters.city;
        }

        // 3. Time Filter
        let timeMatch = true;
        const timeInfo = parseTimeInfo(concert.time);
        const concertDate = timeInfo.startDate;
        if (filters.dateStart) {
            timeMatch = timeMatch && (concertDate >= new Date(filters.dateStart));
        }
        if (filters.dateEnd) {
            // Add 1 day to end date to include the whole day if simple date comparison
            // Or just compare standard parts. Here we treat input date as midnight check.
            // Let's assume end date is inclusive.
            const endDate = new Date(filters.dateEnd);
            endDate.setHours(23, 59, 59, 999);
            timeMatch = timeMatch && (concertDate <= endDate);
        }

        // 4. Price Filter
        // User wants concerts that fit their budget.
        // Intersection: (ConcertMin <= UserMax) AND (ConcertMax >= UserMin)
        let priceMatch = true;
        // Check if there is any overlap between [concert.min, concert.max] and [user.min, user.max]
        if (concert.price_min > filters.priceMax || concert.price_max < filters.priceMin) {
            priceMatch = false;
        }

        return searchMatch && cityMatch && timeMatch && priceMatch;
    });

    // Sort
    filtered.sort((a, b) => {
        const dateA = parseTimeInfo(a.time).startDate;
        const dateB = parseTimeInfo(b.time).startDate;
        
        switch(filters.sortOrder) {
            case 'time-asc':
                return dateA - dateB;
            case 'time-desc':
                return dateB - dateA;
            case 'price-asc':
                return a.price_min - b.price_min;
            case 'price-desc':
                return b.price_min - a.price_min;
            default:
                return 0;
        }
    });

    filteredConcerts = filtered;
    currentPage = 1;
    renderPage(currentPage);
}

function renderPage(page) {
    const filters = getFilterValues();
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageConcerts = filteredConcerts.slice(startIndex, endIndex);
    
    renderResults(pageConcerts, filters.trackQuery, filteredConcerts.length);
    renderPagination(page, Math.ceil(filteredConcerts.length / itemsPerPage));
}

function renderPagination(current, totalPages) {
    const container = document.getElementById('pagination-controls');
    container.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '上一页';
    prevBtn.disabled = current === 1;
    prevBtn.style.padding = '5px 10px';
    prevBtn.onclick = () => renderPage(current - 1);
    container.appendChild(prevBtn);
    
    const pageInfo = document.createElement('span');
    pageInfo.textContent = ` 第 ${current} / ${totalPages} 页 `;
    pageInfo.style.margin = '0 15px';
    container.appendChild(pageInfo);
    
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '下一页';
    nextBtn.disabled = current === totalPages;
    nextBtn.style.padding = '5px 10px';
    nextBtn.onclick = () => renderPage(current + 1);
    container.appendChild(nextBtn);
}

function resetFilters() {
    document.getElementById('track-search').value = '';
    document.getElementById('city-filter').value = '';
    document.getElementById('date-start').value = '';
    document.getElementById('date-end').value = '';
    document.getElementById('price-min').value = '';
    document.getElementById('price-max').value = '';
    document.getElementById('sort-order').value = 'time-asc';
    applyFilters();
}

function renderResults(concerts, highlightQuery, totalCount) {
    const list = document.getElementById('concert-list');
    const countDiv = document.getElementById('results-count');
    
    list.innerHTML = '';
    countDiv.textContent = `找到 ${totalCount} 个音乐会`;

    if (concerts.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding: 20px;">没有找到符合条件的音乐会。</div>';
        return;
    }

    concerts.forEach(concert => {
        const div = document.createElement('div');
        div.className = 'concert-card';

        const timeInfo = parseTimeInfo(concert.time);
        const displayDate = timeInfo.parsedDisplay;

        // Highlight tracks
        const tracksHtml = concert.tracks.map(track => {
            if (highlightQuery && track.toLowerCase().includes(highlightQuery)) {
                return `<li class="matched-track">${track}</li>`;
            }
            return `<li>${track}</li>`;
        }).join('');

        div.innerHTML = `
            <div class="concert-header">
                <h3 class="concert-title">${concert.name}</h3>
                <span class="concert-price">￥${concert.price_min} - ${concert.price_max}</span>
            </div>
            <div class="concert-details">
                <div class="detail-item"><strong>城市:</strong> ${concert.city}</div>
                <div class="detail-item"><strong>时间:</strong> ${displayDate}</div>
                <div class="detail-item" style="grid-column: span 2"><strong>地点:</strong> ${concert.venue}</div>
            </div>
            <div class="concert-tracks">
                <span class="tracks-label">演出曲目:</span>
                <ul class="tracks-list">
                    ${tracksHtml}
                </ul>
            </div>
            <div class="concert-actions" style="margin-top: 15px; text-align: right;">
                <a href="${concert.link || '#'}" target="_blank" class="book-btn">查看详情</a>
            </div>
        `;
        list.appendChild(div);
    });
}

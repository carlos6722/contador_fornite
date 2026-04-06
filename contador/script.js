document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // TAB NAVIGATION LOGIC
    // ---------------------------------------------------------
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active-tab'));

            // Add active class to clicked button and target content
            button.classList.add('active');
            const targetId = `tab-${button.dataset.tab}`;
            document.getElementById(targetId).classList.add('active-tab');
        });
    });

    // ---------------------------------------------------------
    // SEASON COUNTDOWN LOGIC (Target: June 5, 2026 08:00 UTC)
    // ---------------------------------------------------------
    const seasonTargetDate = new Date('2026-06-05T08:00:00Z').getTime();

    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    
    const seasonCountdownContainer = document.getElementById('season-countdown-container');
    const seasonStartedMessage = document.getElementById('season-started-message');

    let [prevDays, prevHours, prevMinutes, prevSeconds] = [-1, -1, -1, -1];

    function applyPulse(element) {
        element.classList.remove('pulse');
        void element.offsetWidth;
        element.classList.add('pulse');
    }

    function updateSeasonCountdown() {
        const now = new Date().getTime();
        const distance = seasonTargetDate - now;

        if (distance <= 0) {
            clearInterval(seasonInterval);
            if (seasonCountdownContainer) seasonCountdownContainer.classList.add('hide');
            if (seasonStartedMessage) seasonStartedMessage.classList.remove('hide');
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        if (days !== prevDays) { daysEl.innerText = days.toString().padStart(2, '0'); applyPulse(daysEl); prevDays = days; }
        if (hours !== prevHours) { hoursEl.innerText = hours.toString().padStart(2, '0'); applyPulse(hoursEl); prevHours = hours; }
        if (minutes !== prevMinutes) { minutesEl.innerText = minutes.toString().padStart(2, '0'); applyPulse(minutesEl); prevMinutes = minutes; }
        if (seconds !== prevSeconds) { secondsEl.innerText = seconds.toString().padStart(2, '0'); applyPulse(secondsEl); prevSeconds = seconds; }
    }

    const seasonInterval = setInterval(updateSeasonCountdown, 1000);
    updateSeasonCountdown();

    // ---------------------------------------------------------
    // DAILY SHOP COUNTDOWN LOGIC (Target: 00:00 UTC)
    // ---------------------------------------------------------
    const shopCountdownEl = document.getElementById('shop-countdown');
    
    // The shop resets when the next UTC midnight hits
    function getNextShopResetTime() {
        const now = new Date();
        const resetTime = new Date();
        resetTime.setUTCHours(24, 0, 0, 0); // Next UTC 00:00:00
        return resetTime.getTime();
    }

    function updateShopCountdown() {
        const now = new Date().getTime();
        const target = getNextShopResetTime();
        let distance = target - now;
        
        // If somehow distance is negative, calculate for tomorrow
        if (distance <= 0) distance += 24 * 60 * 60 * 1000; 

        const hours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        shopCountdownEl.innerText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    setInterval(updateShopCountdown, 1000);
    updateShopCountdown();

    // ---------------------------------------------------------
    // SHOP API FETCH & RENDER
    // ---------------------------------------------------------
    const shopGrid = document.getElementById('shop-grid');
    const vbuckIconUrl = 'https://fortnite-api.com/images/vbuck.png'; // Universal fallback

    function renderShop(entries) {
        shopGrid.innerHTML = ''; // Limpiar estado de carga

        if (!entries || entries.length === 0) {
            shopGrid.innerHTML = '<p>No se encontraron resultados en la tienda.</p>';
            return;
        }

        // Agrupar los objetos por Categoría (layout.name)
        const categories = {};

        entries.forEach(entry => {
            const price = entry.finalPrice;
            
            let name = entry.layout?.name || entry.devName || 'Objeto Desconocido';
            let imageUrl = '';
            let rarity = 'common';

            // Determinar qué tipo de objeto es y sacar sus datos
            if (entry.brItems && entry.brItems.length > 0) {
                const item = entry.brItems[0];
                name = item.name;
                imageUrl = item.images?.icon || item.images?.featured || '';
                rarity = item.rarity?.value || 'common';
            } else if (entry.tracks && entry.tracks.length > 0) {
                const track = entry.tracks[0];
                name = track.title + ' (Jam Track)';
                imageUrl = track.albumArt || '';
                rarity = 'epic'; 
            } else if (entry.instruments && entry.instruments.length > 0) {
                const instr = entry.instruments[0];
                name = instr.name;
                imageUrl = instr.images?.large || instr.images?.small || '';
                rarity = 'rare';
            } else if (entry.cars && entry.cars.length > 0) {
                const car = entry.cars[0];
                name = car.name;
                imageUrl = car.images?.large || car.images?.small || '';
                rarity = 'epic';
            } else if (entry.items && entry.items.length > 0) {
                const item = entry.items[0];
                name = item.name;
                imageUrl = item.images?.icon || item.images?.featured || '';
                rarity = item.rarity?.value || 'common';
            } else if (entry.bundle) {
                // Es un paquete/bundle
                name = entry.bundle.name;
                imageUrl = entry.bundle.image || '';
                rarity = 'epic';
            } else {
                return;
            }

            // A veces el newDisplayAsset es la mejor imagen
            if (entry.newDisplayAsset?.materialInstances?.[0]?.images?.OfferImage) {
                imageUrl = entry.newDisplayAsset.materialInstances[0].images.OfferImage;
            }

            if (!imageUrl) return;

            // Obtener el nombre de la sección de la API (ej. Destacados, Diario, Lotes)
            const sectionName = entry.section?.name || entry.layout?.name || 'Otras Ofertas';
            const categoryIndex = entry.layout?.index || 999;
            const categoryRank = entry.layout?.rank || 999;

            if (!categories[sectionName]) {
                categories[sectionName] = {
                    items: [],
                    index: categoryIndex,
                    rank: categoryRank
                };
            }

            categories[sectionName].items.push(`
                <div class="shop-item rarity-${rarity.toLowerCase()}">
                    <img class="item-image" src="${imageUrl}" alt="${name}" loading="lazy">
                    <div class="item-info">
                        <div class="item-name">${name}</div>
                        <div class="item-price">
                            <img src="${vbuckIconUrl}" class="vbuck-icon" alt="V-Bucks">
                            ${price === 0 ? 'Gratis' : price}
                        </div>
                    </div>
                </div>
            `);
        });

        // Ordenar las categorías para que se parezca al juego (basado en el índice y rango de la API)
        const sortedCategories = Object.keys(categories).sort((a, b) => {
            if (categories[a].index !== categories[b].index) {
                return categories[a].index - categories[b].index;
            }
            return categories[a].rank - categories[b].rank;
        });

        // Construir el DOM con los encabezados
        shopGrid.style.display = 'block'; // Quitar el layout principal grid porque ahora tendremos varios grids
        
        sortedCategories.forEach(catName => {
            const sectionBlock = document.createElement('div');
            sectionBlock.className = 'shop-category-section';
            
            sectionBlock.innerHTML = `
                <h2 class="category-title">${catName}</h2>
                <div class="shop-grid">
                    ${categories[catName].items.join('')}
                </div>
            `;
            shopGrid.appendChild(sectionBlock);
        });
    }

    async function fetchShop() {
        try {
            const response = await fetch('https://fortnite-api.com/v2/shop');
            if (!response.ok) throw new Error('Error en HTTP: ' + response.status);
            
            const json = await response.json();
            const entries = json.data?.entries || [];
            
            // Eliminamos duplicados o variaciones si son la misma cosa
            // En API modernas, `entries` ya está estructurado propiamente para rendering
            renderShop(entries);
        } catch (error) {
            console.error("No se pudo cargar la tienda:", error);
            shopGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: red;">No se pudo cargar la tienda. Inténtalo más tarde.</p>`;
        }
    }

    // Inicializar obtención de tienda
    fetchShop();
});

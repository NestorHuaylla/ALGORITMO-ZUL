"use strict";

document.addEventListener('DOMContentLoaded', async () => {
    const btnGenerate = document.getElementById('btn-generate');
    const btnClear = document.getElementById('btn-clear');
    const inputCount = document.getElementById('generate-count');
    const totalRecordsSpan = document.getElementById('total-records');
    const tbody = document.getElementById('product-tbody');
    
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');
    const pageInfo = document.getElementById('page-info');

    const PAGE_SIZE = 15;
    let currentPage = 1;
    let totalProducts = 0;

    const categorias = ['Electrónica', 'Hogar', 'Ropa', 'Deportes', 'Alimentos', 'Juguetes'];

    async function updateTotal() {
        totalProducts = await window.appDb.getCount();
        totalRecordsSpan.textContent = totalProducts.toLocaleString();
        renderTable();
    }

    async function renderTable() {
        const offset = (currentPage - 1) * PAGE_SIZE;
        const products = await window.appDb.getProductsPaginated(offset, PAGE_SIZE);
        
        tbody.innerHTML = '';
        products.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${p.id}</td>
                <td>${p.name}</td>
                <td><span class="category-badge">${p.category}</span></td>
                <td>$${p.price.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });

        // Update pagination controls
        pageInfo.textContent = `Página ${currentPage} de ${Math.max(1, Math.ceil(totalProducts / PAGE_SIZE))}`;
        btnPrev.disabled = currentPage === 1;
        btnNext.disabled = (currentPage * PAGE_SIZE) >= totalProducts;
    }

    btnGenerate.addEventListener('click', async () => {
        const count = parseInt(inputCount.value) || 1000;
        
        btnGenerate.disabled = true;
        btnGenerate.textContent = 'Generando...';

        const newProducts = [];
        for(let i=0; i<count; i++) {
            newProducts.push({
                name: `Producto Genérico ${Math.floor(Math.random() * 10000)}`,
                category: categorias[Math.floor(Math.random() * categorias.length)],
                price: parseFloat((Math.random() * 500 + 10).toFixed(2))
            });
        }

        try {
            await window.appDb.addProductsBulk(newProducts);
            await updateTotal();
        } catch (e) {
            console.error("Error al generar:", e);
            alert("Error al generar datos.");
        } finally {
            btnGenerate.disabled = false;
            btnGenerate.textContent = 'Generar Datos';
        }
    });

    btnClear.addEventListener('click', async () => {
        if(confirm('¿Seguro que deseas vaciar toda la base de datos de productos?')) {
            await window.appDb.clearProducts();
            currentPage = 1;
            await updateTotal();
        }
    });

    btnPrev.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    btnNext.addEventListener('click', () => {
        if ((currentPage * PAGE_SIZE) < totalProducts) {
            currentPage++;
            renderTable();
        }
    });

    // Initialize DB and load
    await window.appDb.init();
    await updateTotal();
});

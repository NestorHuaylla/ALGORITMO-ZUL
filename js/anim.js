document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-container');
    const btnLoad = document.getElementById('btn-load-sim');
    const btnPlay = document.getElementById('btn-play');
    const btnPause = document.getElementById('btn-pause');
    const btnStep = document.getElementById('btn-step');
    const inputCount = document.getElementById('sim-count');
    const selectAlgo = document.getElementById('algo-select');
    const inputSpeed = document.getElementById('sim-speed');
    const searchContainer = document.getElementById('search-target-container');
    const inputTarget = document.getElementById('sim-target');

    let array = [];
    let traces = [];
    let currentStep = 0;
    let isPlaying = false;
    let animationId = null;
    let lastDrawTime = 0;
    let currentTarget = null;
    let currentSearchBounds = null;

    // Show/Hide binary target input
    selectAlgo.addEventListener('change', () => {
        searchContainer.style.display = selectAlgo.value === 'binary' ? 'flex' : 'none';
    });

    // =====================================================
    //  THREE.JS SETUP - Premium Visual Configuration
    // =====================================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.012);

    let W = container.clientWidth || 900;
    let H = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 1000);
    camera.position.set(0, 28, 65);
    camera.lookAt(0, 8, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 20;
    controls.maxDistance = 160;
    controls.target.set(0, 8, 0);

    // ─── LIGHTING ─────────────────────────────────────────
    // Soft ambient
    scene.add(new THREE.AmbientLight(0x1a1a2e, 2.5));

    // Key light (warm top-right)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(30, 60, 30);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 200;
    keyLight.shadow.camera.left = -60;
    keyLight.shadow.camera.right = 60;
    keyLight.shadow.camera.top = 60;
    keyLight.shadow.camera.bottom = -60;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Fill light (cool left)
    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.8);
    fillLight.position.set(-40, 30, -20);
    scene.add(fillLight);

    // Rim light (back rim glow)
    const rimLight = new THREE.DirectionalLight(0x8b5cf6, 1.0);
    rimLight.position.set(0, 20, -60);
    scene.add(rimLight);

    // Neon colored point lights for ambient glow
    const purplePoint = new THREE.PointLight(0x8b5cf6, 3, 80);
    purplePoint.position.set(-35, 15, 10);
    scene.add(purplePoint);

    const tealPoint = new THREE.PointLight(0x2dd4bf, 3, 80);
    tealPoint.position.set(35, 15, 10);
    scene.add(tealPoint);

    // ─── FLOOR ─────────────────────────────────────────────
    const floorGeo = new THREE.PlaneGeometry(200, 200, 1, 1);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x0d0d14,
        roughness: 0.95,
        metalness: 0.0
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // ─── GRID (vivid neon style) ──────────────────────────
    const grid = new THREE.GridHelper(120, 30, 0x6d28d9, 0x1e1b4b);
    grid.position.y = 0.05;
    grid.material.opacity = 0.5;
    grid.material.transparent = true;
    scene.add(grid);

    // ─── BARS ─────────────────────────────────────────────
    let barGroup = new THREE.Group();
    scene.add(barGroup);

    // ─── COLORS ───────────────────────────────────────────
    // Colores especiales para estados concretos
    const STATE_COLORS = {
        highlight: { hex: 0xff2d55, emissive: 0x7a0018, opacity: 0.92 }, // Vivid Rose
        pivot:     { hex: 0xffcc00, emissive: 0x7a5c00, opacity: 0.95 }, // Gold
        dimmed:    { hex: 0x1a2030, emissive: 0x000000, opacity: 0.3  }, // Dark transparent
        found:     { hex: 0x00ff88, emissive: 0x005533, opacity: 1.0  }, // Neon Green
    };

    // Para barras normales: color basado en su posición (gradiente arcoíris)
    function getNormalColor(index, total) {
        // Hue va de 180 (cyan) a 300 (purple) según posición
        const hue = 180 + (index / total) * 120;
        const color = new THREE.Color();
        color.setHSL(hue / 360, 1.0, 0.55); // Full saturation, vivid
        return color;
    }

    function makeMaterial(colorKey, index, total) {
        if (colorKey === 'normal') {
            const col = getNormalColor(index, total);
            return new THREE.MeshPhongMaterial({
                color:       col,
                emissive:    col.clone().multiplyScalar(0.25),
                shininess:   100,
                specular:    new THREE.Color(0xffffff),
                transparent: true,
                opacity:     0.78,
                depthWrite:  false
            });
        }
        const c = STATE_COLORS[colorKey];
        return new THREE.MeshPhongMaterial({
            color:       c.hex,
            emissive:    c.emissive,
            shininess:   130,
            specular:    0xffffff,
            transparent: true,
            opacity:     c.opacity,
            depthWrite:  false
        });
    }

    // ─── RESIZE OBSERVER ──────────────────────────────────
    const ro = new ResizeObserver(entries => {
        for (const e of entries) {
            const w = e.contentRect.width;
            const h = e.contentRect.height;
            if (w > 0 && h > 0) {
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
            }
        }
    });
    ro.observe(container);

    // ─── RENDER LOOP ──────────────────────────────────────
    function renderLoop() {
        requestAnimationFrame(renderLoop);
        // Animate point lights gently
        const t = performance.now() * 0.001;
        purplePoint.intensity = 2.5 + Math.sin(t * 1.3) * 0.8;
        tealPoint.intensity   = 2.5 + Math.sin(t * 1.7 + 1) * 0.8;
        controls.update();
        renderer.render(scene, camera);
    }
    renderLoop();

    // ─── DRAW BARS ────────────────────────────────────────
    function drawArray3D(highlights = [], pivotIdx = -1, searchBounds = null, foundIdx = -1) {
        // Dispose previous
        while (barGroup.children.length) {
            const c = barGroup.children[0];
            barGroup.remove(c);
            c.geometry.dispose();
            c.material.dispose();
        }

        if (!array.length) return;

        const n = array.length;
        const maxVal = Math.max(...array);
        const totalWidth = 70;
        const barW = totalWidth / n;
        const gap = barW * 0.15;
        const actualW = barW - gap;
        const startX = -totalWidth / 2;

        // Ordenar por transparencia si hay materiales mezclados (back-to-front no lo haremos
        // manualmente pero depthWrite=false ayuda mucho)
        for (let i = 0; i < n; i++) {
            const val = array[i];
            const h = Math.max(0.5, (val / maxVal) * 35);

            let colorKey = 'normal';
            if (i === foundIdx)              colorKey = 'found';
            else if (i === pivotIdx)        colorKey = 'pivot';
            else if (highlights.includes(i)) colorKey = 'highlight';
            else if (searchBounds && (i < searchBounds.left || i > searchBounds.right))
                colorKey = 'dimmed';

            const geo = new THREE.BoxGeometry(actualW, h, actualW);
            const mat = makeMaterial(colorKey, i, n);

            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true;
            mesh.receiveShadow = false; // avoid z-fight with transparent
            mesh.position.set(startX + i * barW + barW / 2, h / 2, 0);
            barGroup.add(mesh);
        }
    }

    // ─── LOAD DATA ────────────────────────────────────────
    btnLoad.addEventListener('click', async () => {
        const count = Math.min(parseInt(inputCount.value) || 50, 200);

        const products = await window.appDb.getProductsPaginated(0, count);
        if (!products.length) { alert('No hay productos en la base de datos.'); return; }

        array = products.map(p => p.price);

        try {
            const algo = selectAlgo.value;
            const userTarget = parseFloat(inputTarget.value);
            const result = window.AlgorithmsEngine.sortAndGetTraces(array, algo, userTarget);

            array = result.sortedArray;
            traces = result.traces;
            currentTarget = result.target;
            if (algo === 'binary') inputTarget.value = currentTarget;

            currentStep = 0;
            isPlaying = false;
            currentSearchBounds = null;

            drawArray3D();

            // Reset camera to nice default
            camera.position.set(0, 28, 65);
            controls.target.set(0, 8, 0);

            // Update Module C
            ['merge','quick','bubble','binary'].forEach(a => {
                const el = document.getElementById(`lbl-${a}-ops`);
                if (el) el.textContent = '0';
            });
            const opEl = document.getElementById(`lbl-${algo}-ops`);
            if (opEl) opEl.textContent = traces.length.toLocaleString();

            btnPlay.disabled = false;
            btnStep.disabled = false;
            btnPause.disabled = true;

        } catch (err) {
            console.error(err);
            alert('Error ejecutando el algoritmo.');
        }
    });

    // ─── STEP LOGIC ───────────────────────────────────────
    function applyStep(idx) {
        if (idx >= traces.length) return;
        const step = traces[idx];
        const algo = selectAlgo.value;

        if (step.type === 2) {
            [array[step.idx1], array[step.idx2]] = [array[step.idx2], array[step.idx1]];
        } else if (step.type === 3) {
            array[step.idx1] = step.val1;
        } else if (algo === 'binary' && step.type === 0) {
            currentSearchBounds = { left: step.idx1, right: step.idx2 };
        }

        window.dispatchEvent(new CustomEvent('algo-step', { detail: step }));

        let pivotIdx = -1, foundIdx = -1, highlights = [];

        if (algo === 'binary') {
            if (step.type === 4)      { pivotIdx = step.idx1; highlights = [step.idx1]; }
            else if (step.type === 1) { highlights = [step.idx1]; }
            else if (step.type === 5) { foundIdx = step.idx1; }
        } else {
            if (step.type === 4) pivotIdx = step.idx1;
            if (algo === 'quick' && step.type === 1 && pivotIdx === -1) pivotIdx = step.idx2;
            if (step.type !== 0 && step.idx1 !== -1 && step.idx2 !== -1)
                highlights = [step.idx1, step.idx2];
        }

        drawArray3D(highlights, pivotIdx, currentSearchBounds, foundIdx);
    }

    // ─── SIMULATION LOOP ─────────────────────────────────
    function simLoop(ts) {
        if (!isPlaying) return;

        const spd = parseInt(inputSpeed.value);
        const delay = 1000 * Math.pow(0.01, (spd - 1) / 99); // 1000ms → 10ms

        if (ts - lastDrawTime > delay) {
            if (currentStep < traces.length) {
                applyStep(currentStep++);
                lastDrawTime = ts;
            } else {
                isPlaying = false;
                btnPlay.disabled = false;
                btnPause.disabled = true;
                currentSearchBounds = null;
                drawArray3D();
            }
        }
        if (isPlaying) animationId = requestAnimationFrame(simLoop);
    }

    btnPlay.addEventListener('click', () => {
        if (currentStep >= traces.length) { currentStep = 0; currentSearchBounds = null; }
        isPlaying = true;
        btnPlay.disabled = true;
        btnPause.disabled = false;
        btnStep.disabled = true;
        lastDrawTime = performance.now();
        animationId = requestAnimationFrame(simLoop);
    });

    btnPause.addEventListener('click', () => {
        isPlaying = false;
        cancelAnimationFrame(animationId);
        btnPlay.disabled = false;
        btnPause.disabled = true;
        btnStep.disabled = false;
    });

    btnStep.addEventListener('click', () => {
        if (currentStep < traces.length) applyStep(currentStep++);
    });
});

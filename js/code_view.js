/**
 * code_view.js — C++ Code Viewer with live step highlighting
 * Listens to global 'algo-changed' and 'algo-step' events.
 */
document.addEventListener('DOMContentLoaded', () => {
    const lblStepType = document.getElementById('lbl-step-type');
    const lblIdx1 = document.getElementById('lbl-idx1');
    const lblIdx2 = document.getElementById('lbl-idx2');
    const lblVal1 = document.getElementById('lbl-val1');
    const lblVal2 = document.getElementById('lbl-val2');
    const lblLine = document.getElementById('lbl-line');
    const codeBlock = document.getElementById('cpp-code-block');

    // ─── C++ CODE REPRESENTATIONS ────────────────────────
    const ALGO_CODES = {
        'merge': [
            "void mergeSort(float arr[], int left, int right) {",
            "    if (left >= right) return;",
            "",
            "    int mid = left + (right - left) / 2;",
            "    mergeSort(arr, left, mid);",
            "    mergeSort(arr, mid + 1, right);",
            "    merge(arr, left, mid, right);",
            "}",
            "",
            "void merge(float arr[], int left, int mid, int right) {",
            "    // ... crear arrays temporales L[], R[]",
            "    while (i < n1 && j < n2) {",
            "        if (L[i] <= R[j]) {",
            "            arr[k] = L[i]; i++;",
            "        } else {",
            "            arr[k] = R[j]; j++;",
            "        }",
            "        k++;",
            "    }",
            "    // copiar restantes de L[] y R[]",
            "}"
        ],
        'quick': [
            "int partition(float arr[], int low, int high) {",
            "    float pivot = arr[high];",
            "    int i = (low - 1);",
            "",
            "    for (int j = low; j <= high - 1; j++) {",
            "        if (arr[j] < pivot) {",
            "            i++;",
            "            swap(&arr[i], &arr[j]);",
            "        }",
            "    }",
            "    swap(&arr[i + 1], &arr[high]);",
            "    return (i + 1);",
            "}",
            "",
            "void quickSort(float arr[], int low, int high) {",
            "    if (low < high) {",
            "        int pi = partition(arr, low, high);",
            "        quickSort(arr, low, pi - 1);",
            "        quickSort(arr, pi + 1, high);",
            "    }",
            "}"
        ],
        'bubble': [
            "void bubbleSort(float arr[], int n) {",
            "    int i, j;",
            "    for (i = 0; i < n - 1; i++) {",
            "        for (j = 0; j < n - i - 1; j++) {",
            "            if (arr[j] > arr[j + 1]) {",
            "                swap(&arr[j], &arr[j + 1]);",
            "            }",
            "        }",
            "    }",
            "}"
        ],
        'binary': [
            "int binarySearch(float arr[], int n, float target) {",
            "    int left = 0;",
            "    int right = n - 1;",
            "",
            "    while (left <= right) {",
            "        int mid = left + (right - left) / 2;",
            "",
            "        if (arr[mid] == target)",
            "            return mid;  // Encontrado",
            "",
            "        if (arr[mid] < target)",
            "            left = mid + 1;",
            "        else",
            "            right = mid - 1;",
            "    }",
            "",
            "    return -1;  // No encontrado",
            "}"
        ]
    };

    // ─── LINE ID → VISUAL INDEX MAPPING ──────────────────
    const mapLineIdToVisualIndex = {
        // Merge Sort
        1: 0, 2: 1, 4: 3, 5: 4, 6: 5, 7: 6,
        10: 11, 11: 12, 13: 14, 17: 19, 21: 19,
        // Quick Sort
        31: 1, 34: 4, 36: 7, 40: 10, 44: 14, 47: 16, 48: 17, 49: 18,
        // Bubble Sort
        55: 0, 57: 2, 59: 3, 61: 5,
        // Binary Search
        70: 0, 74: 5, 76: 7, 78: 8, 81: 10, 83: 11, 86: 13, 91: 16
    };

    let currentAlgo = 'merge';

    // ─── RENDER CODE ─────────────────────────────────────
    function renderCode(highlightVisualIndex = -1) {
        const codeLines = ALGO_CODES[currentAlgo];
        if (!codeLines) return;

        let html = '';
        for (let i = 0; i < codeLines.length; i++) {
            const isHighlighted = (i === highlightVisualIndex);
            const lineClass = isHighlighted ? 'code-line highlighted' : 'code-line';

            // Escape HTML
            const escaped = (codeLines[i] || ' ')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            html += `<span class="${lineClass}"><span class="line-num">${i + 1}</span>${escaped}</span>`;
        }
        codeBlock.innerHTML = html;

        // Scroll to highlighted line
        if (highlightVisualIndex !== -1) {
            const scrollContainer = codeBlock.parentElement;
            const lineHeight = 24;
            const targetScroll = (highlightVisualIndex * lineHeight) - (scrollContainer.clientHeight / 2);
            scrollContainer.scrollTop = Math.max(0, targetScroll);
        }
    }

    // Initial render
    renderCode();

    // ─── ACTION TYPES ────────────────────────────────────
    const ACTION_TYPES = {
        0: 'Llamada / Salto (Init)',
        1: 'Comparación Lógica (if)',
        2: 'Intercambio (Swap)',
        3: 'Sobrescritura de Valor',
        4: 'Cálculo de Pivote / Mitad',
        5: '✅ Encontrado (Target)',
        6: '❌ No Encontrado'
    };

    // ─── LISTEN TO ALGO STEPS ────────────────────────────
    window.addEventListener('algo-step', (e) => {
        const step = e.detail;

        // Detect algorithm from lineId to switch code view
        if (step.lineId < 30)       currentAlgo = 'merge';
        else if (step.lineId < 50)  currentAlgo = 'quick';
        else if (step.lineId < 65)  currentAlgo = 'bubble';
        else if (step.lineId < 100) currentAlgo = 'binary';

        lblStepType.textContent = ACTION_TYPES[step.type] || 'Acción Desconocida';
        lblIdx1.textContent = step.idx1 !== -1 ? step.idx1 : '—';
        lblIdx2.textContent = step.idx2 !== -1 ? step.idx2 : '—';
        lblVal1.textContent = step.val1 !== -1 ? step.val1.toFixed(2) : '—';
        lblVal2.textContent = step.val2 !== -1 ? step.val2.toFixed(2) : '—';
        lblLine.textContent = `Línea ${step.lineId} (C++)`;

        const visualIndex = mapLineIdToVisualIndex[step.lineId];
        renderCode(visualIndex !== undefined ? visualIndex : -1);
    });

    // ─── LISTEN TO GLOBAL ALGO CHANGE ────────────────────
    window.addEventListener('algo-changed', (e) => {
        currentAlgo = e.detail.algorithm;
        renderCode(); // Re-render with new algorithm code
        
        // Reset variables display
        lblStepType.textContent = 'Esperando inicio...';
        lblIdx1.textContent = '—';
        lblIdx2.textContent = '—';
        lblVal1.textContent = '—';
        lblVal2.textContent = '—';
        lblLine.textContent = '—';
    });
});

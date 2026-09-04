document.addEventListener('DOMContentLoaded', () => {
    const lblStepType = document.getElementById('lbl-step-type');
    const lblIdx1 = document.getElementById('lbl-idx1');
    const lblIdx2 = document.getElementById('lbl-idx2');
    const lblVal1 = document.getElementById('lbl-val1');
    const lblVal2 = document.getElementById('lbl-val2');
    const lblLine = document.getElementById('lbl-line');
    const codeBlock = document.getElementById('cpp-code-block');

    const ALGO_CODES = {
        'merge': [
            "void mergeSort(float arr[], int left, int right) {", // 0 (ID 1)
            "    if (left >= right) return;",                     // 1 (ID 2)
            "    int mid = left + (right - left) / 2;",           // 2 (ID 4)
            "    mergeSort(arr, left, mid);",                     // 3 (ID 5)
            "    mergeSort(arr, mid + 1, right);",                // 4 (ID 6)
            "    merge(arr, left, mid, right);",                  // 5 (ID 7)
            "}",                                                  // 6
            "",                                                   // 7
            "void merge(...) {",                                  // 8 (ID 10)
            "    while (i < n1 && j < n2) {",                     // 9 
            "        if (L[i] <= R[j]) {",                        // 10 (ID 11)
            "            arr[k] = L[i];",                         // 11 
            "            i++;",                                   // 12
            "        } else {",                                   // 13 (ID 13)
            "            arr[k] = R[j];",                         // 14
            "            j++;",                                   // 15
            "        }",                                          // 16
            "        k++;",                                       // 17
            "    }",                                              // 18
            "    // ... copiar restantes (ID 17, 21) ...",        // 19
            "}"                                                   // 20
        ],
        'quick': [
            "int partition(float arr[], int low, int high) {",    // 0
            "    float pivot = arr[high];",                       // 1 (ID 31)
            "    int i = (low - 1);",                             // 2
            "    for (int j = low; j <= high - 1; j++) {",        // 3 (ID 34)
            "        if (arr[j] < pivot) {",                      // 4
            "            i++;",                                   // 5
            "            swap(&arr[i], &arr[j]);",                // 6 (ID 36)
            "        }",                                          // 7
            "    }",                                              // 8
            "    swap(&arr[i + 1], &arr[high]);",                 // 9 (ID 40)
            "    return (i + 1);",                                // 10
            "}",                                                  // 11
            "",                                                   // 12
            "void quickSort(float arr[], int low, int high) {",   // 13 (ID 44)
            "    if (low < high) {",                              // 14
            "        int pi = partition(arr, low, high);",        // 15 (ID 47)
            "        quickSort(arr, low, pi - 1);",               // 16 (ID 48)
            "        quickSort(arr, pi + 1, high);",              // 17 (ID 49)
            "    }",                                              // 18
            "}"                                                   // 19
        ],
        'bubble': [
            "void bubbleSort(float arr[], int n) {",              // 0 (ID 55)
            "    int i, j;",                                      // 1
            "    for (i = 0; i < n - 1; i++) {",                  // 2 (ID 57)
            "        for (j = 0; j < n - i - 1; j++) {",          // 3 (ID 59)
            "            if (arr[j] > arr[j + 1]) {",             // 4
            "                swap(&arr[j], &arr[j + 1]);",        // 5 (ID 61)
            "            }",                                      // 6
            "        }",                                          // 7
            "    }",                                              // 8
            "}"                                                   // 9
        ],
        'binary': [
            "int binarySearch(float arr[], int target) {",        // 0 (ID 70)
            "    int left = 0;",                                  // 1
            "    int right = n - 1;",                             // 2
            "    while (left <= right) {",                        // 3 (ID 74)
            "        int mid = left + (right - left) / 2;",       // 4
            "        if (arr[mid] == target)",                    // 5 (ID 76)
            "            return mid;",                            // 6 (ID 78)
            "        if (arr[mid] < target)",                     // 7 (ID 81)
            "            left = mid + 1;",                        // 8 (ID 83)
            "        else",                                       // 9
            "            right = mid - 1;",                       // 10 (ID 86)
            "    }",                                              // 11
            "    return -1;",                                     // 12 (ID 91)
            "}"                                                   // 13
        ]
    };

    const mapLineIdToVisualIndex = {
        1: 0, 2: 1, 4: 2, 5: 3, 6: 4, 7: 5, 10: 8, 11: 10, 13: 13, 17: 19, 21: 19, // Merge
        31: 1, 34: 3, 36: 6, 40: 9, 44: 13, 47: 15, 48: 16, 49: 17,               // Quick
        55: 0, 57: 2, 59: 3, 61: 5,                                               // Bubble
        70: 0, 74: 3, 76: 5, 78: 6, 81: 7, 83: 8, 86: 10, 91: 12                  // Binary
    };

    let currentAlgo = 'merge';

    function renderCode(highlightVisualIndex = -1) {
        const codeLines = ALGO_CODES[currentAlgo];
        let html = '';
        for (let i = 0; i < codeLines.length; i++) {
            const isHighlighted = (i === highlightVisualIndex);
            
            const lineStyle = isHighlighted 
                ? 'background-color: #3f3f46; border-left: 4px solid #38bdf8; display: block; padding-left: 10px; color: #ffffff;' 
                : 'display: block; padding-left: 14px; color: #d4d4d4;';
                
            const lineNumStyle = 'color: #858585; display: inline-block; width: 30px; user-select: none; border-right: 1px solid #444; margin-right: 10px; text-align: right; padding-right: 5px;';
                
            html += `<span style="${lineStyle}"><span style="${lineNumStyle}">${i + 1}</span>${codeLines[i] || ' '}</span>`;
        }
        codeBlock.innerHTML = html;

        if (highlightVisualIndex !== -1) {
            const scrollContainer = codeBlock.parentElement;
            const lineHeight = 24;
            scrollContainer.scrollTop = (highlightVisualIndex * lineHeight) - (scrollContainer.clientHeight / 2);
        }
    }

    renderCode();

    const ACTION_TYPES = {
        0: 'Llamada / Salto (Init)',
        1: 'Comparación Lógica (if)',
        2: 'Intercambio (Swap)',
        3: 'Sobrescritura de Valor',
        4: 'Cálculo de Pivote / Mitad',
        5: 'Encontrado (Target)',
        6: 'No Encontrado'
    };

    window.addEventListener('algo-step', (e) => {
        const step = e.detail;

        // Detect algo from lineId ranges roughly to switch view if needed
        if (step.lineId < 30) currentAlgo = 'merge';
        else if (step.lineId < 50) currentAlgo = 'quick';
        else if (step.lineId < 65) currentAlgo = 'bubble';
        else if (step.lineId < 100) currentAlgo = 'binary';

        lblStepType.textContent = ACTION_TYPES[step.type] || 'Acción Desconocida';
        lblIdx1.textContent = step.idx1 !== -1 ? step.idx1 : '-';
        lblIdx2.textContent = step.idx2 !== -1 ? step.idx2 : '-';
        lblVal1.textContent = step.val1 !== -1 ? step.val1.toFixed(2) : '-';
        lblVal2.textContent = step.val2 !== -1 ? step.val2.toFixed(2) : '-';
        lblLine.textContent = `Línea ${step.lineId} (C++)`;

        const visualIndex = mapLineIdToVisualIndex[step.lineId];
        renderCode(visualIndex);
    });
});

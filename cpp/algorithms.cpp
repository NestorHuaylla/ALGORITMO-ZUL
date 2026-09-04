#include <vector>
#include <emscripten.h>

// Estructura de cada paso para la animación y análisis
// Cada elemento mide 4 bytes, total 24 bytes por Step.
struct Step {
    int type;      // 0: Init, 1: Comparar, 2: Swap, 3: Sobrescribir (Merge), 4: Seleccionar Pivote
    int idx1;      // Índice 1
    int idx2;      // Índice 2
    float val1;    // Valor 1
    float val2;    // Valor 2
    int lineId;    // ID de la línea de código para el Módulo D
};

std::vector<Step> trace_buffer;

void record_step(int type, int idx1, int idx2, float val1, float val2, int lineId) {
    trace_buffer.push_back({type, idx1, idx2, val1, val2, lineId});
}

// ---------------------------------------------------------
// MERGE SORT
// ---------------------------------------------------------
void merge(float arr[], int left, int mid, int right) {
    int n1 = mid - left + 1;
    int n2 = right - mid;

    std::vector<float> L(n1);
    std::vector<float> R(n2);

    for (int i = 0; i < n1; i++) L[i] = arr[left + i];
    for (int j = 0; j < n2; j++) R[j] = arr[mid + 1 + j];

    int i = 0, j = 0, k = left;

    while (i < n1 && j < n2) {
        record_step(1, left + i, mid + 1 + j, L[i], R[j], 10); // Línea 10: Comparación if(L[i] <= R[j])
        if (L[i] <= R[j]) {
            arr[k] = L[i];
            record_step(3, k, -1, L[i], -1, 11); // Línea 11: arr[k] = L[i]
            i++;
        } else {
            arr[k] = R[j];
            record_step(3, k, -1, R[j], -1, 13); // Línea 13: arr[k] = R[j]
            j++;
        }
        k++;
    }

    while (i < n1) {
        arr[k] = L[i];
        record_step(3, k, -1, L[i], -1, 17); // Línea 17: Copiar restantes de L
        i++;
        k++;
    }

    while (j < n2) {
        arr[k] = R[j];
        record_step(3, k, -1, R[j], -1, 21); // Línea 21: Copiar restantes de R
        j++;
        k++;
    }
}

void mergeSort(float arr[], int left, int right) {
    record_step(0, left, right, -1, -1, 1); // Línea 1: Inicio función
    if (left >= right) {
        return; // Línea 2: Caso base
    }
    
    int mid = left + (right - left) / 2;
    record_step(0, mid, -1, -1, -1, 4); // Línea 4: Calculo mid
    
    mergeSort(arr, left, mid);          // Línea 5: mergeSort izq
    mergeSort(arr, mid + 1, right);     // Línea 6: mergeSort der
    merge(arr, left, mid, right);       // Línea 7: merge
}

// ---------------------------------------------------------
// QUICK SORT
// ---------------------------------------------------------
void swap(float* a, float* b) {
    float t = *a;
    *a = *b;
    *b = t;
}

int partition(float arr[], int low, int high) {
    float pivot = arr[high];
    record_step(4, high, -1, pivot, -1, 31); // Línea 31: Seleccionar pivote
    
    int i = (low - 1);
    
    for (int j = low; j <= high - 1; j++) {
        record_step(1, j, high, arr[j], pivot, 34); // Línea 34: Comparar con pivote
        if (arr[j] < pivot) {
            i++;
            swap(&arr[i], &arr[j]);
            record_step(2, i, j, arr[i], arr[j], 36); // Línea 36: Swap
        }
    }
    swap(&arr[i + 1], &arr[high]);
    record_step(2, i + 1, high, arr[i + 1], arr[high], 40); // Línea 40: Swap final del pivote
    
    return (i + 1);
}

void quickSort(float arr[], int low, int high) {
    record_step(0, low, high, -1, -1, 44); // Línea 44: Inicio función QuickSort
    if (low < high) {
        int pi = partition(arr, low, high);
        record_step(0, pi, -1, -1, -1, 47); // Línea 47: Partición obtenida
        
        quickSort(arr, low, pi - 1);        // Línea 48: Sort izq
        quickSort(arr, pi + 1, high);       // Línea 49: Sort der
    }
}

// ---------------------------------------------------------
// EXPORTS PARA WEBASSEMBLY
// ---------------------------------------------------------
extern "C" {

    EMSCRIPTEN_KEEPALIVE
    void clear_trace() {
        trace_buffer.clear();
    }

    EMSCRIPTEN_KEEPALIVE
    int get_trace_size() {
        return trace_buffer.size();
    }

    EMSCRIPTEN_KEEPALIVE
    Step* get_trace_ptr() {
        return trace_buffer.data();
    }

    // Retorna el puntero para que JS sepa dónde escribir el arreglo inicial
    EMSCRIPTEN_KEEPALIVE
    float* allocate_array(int size) {
        return new float[size];
    }

    EMSCRIPTEN_KEEPALIVE
    void free_array(float* ptr) {
        delete[] ptr;
    }

    EMSCRIPTEN_KEEPALIVE
    void run_merge_sort(float* arr, int size) {
        clear_trace();
        mergeSort(arr, 0, size - 1);
    }

    EMSCRIPTEN_KEEPALIVE
    void run_quick_sort(float* arr, int size) {
        clear_trace();
        quickSort(arr, 0, size - 1);
    }
}

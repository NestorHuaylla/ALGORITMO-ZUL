/**
 * algorithms_js.js — Pure JavaScript implementations of all 4 algorithms
 * Used as the PRIMARY engine (or fallback if WASM is unavailable).
 * All algorithms produce step traces compatible with the animation system.
 */
const AlgorithmsEngine = {
    traces: [],

    recordStep: function(type, idx1, idx2, val1, val2, lineId) {
        this.traces.push({ type, idx1, idx2, val1, val2, lineId });
    },

    // ---------------------------------------------------------
    // MERGE SORT
    // ---------------------------------------------------------
    merge: function(arr, left, mid, right) {
        let n1 = mid - left + 1;
        let n2 = right - mid;

        let L = new Array(n1);
        let R = new Array(n2);

        for (let i = 0; i < n1; i++) L[i] = arr[left + i];
        for (let j = 0; j < n2; j++) R[j] = arr[mid + 1 + j];

        let i = 0, j = 0, k = left;

        while (i < n1 && j < n2) {
            this.recordStep(1, left + i, mid + 1 + j, L[i], R[j], 10);
            if (L[i] <= R[j]) {
                arr[k] = L[i];
                this.recordStep(3, k, -1, L[i], -1, 11);
                i++;
            } else {
                arr[k] = R[j];
                this.recordStep(3, k, -1, R[j], -1, 13);
                j++;
            }
            k++;
        }

        while (i < n1) {
            arr[k] = L[i];
            this.recordStep(3, k, -1, L[i], -1, 17);
            i++;
            k++;
        }

        while (j < n2) {
            arr[k] = R[j];
            this.recordStep(3, k, -1, R[j], -1, 21);
            j++;
            k++;
        }
    },

    mergeSortInternal: function(arr, left, right) {
        this.recordStep(0, left, right, -1, -1, 1);
        if (left >= right) return;
        
        let mid = Math.floor(left + (right - left) / 2);
        this.recordStep(0, mid, -1, -1, -1, 4);
        
        this.mergeSortInternal(arr, left, mid);
        this.mergeSortInternal(arr, mid + 1, right);
        this.merge(arr, left, mid, right);
    },

    // ---------------------------------------------------------
    // QUICK SORT
    // ---------------------------------------------------------
    swap: function(arr, i, j) {
        let t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
    },

    partition: function(arr, low, high) {
        let pivot = arr[high];
        this.recordStep(4, high, -1, pivot, -1, 31);
        
        let i = (low - 1);
        
        for (let j = low; j <= high - 1; j++) {
            this.recordStep(1, j, high, arr[j], pivot, 34);
            if (arr[j] < pivot) {
                i++;
                this.swap(arr, i, j);
                this.recordStep(2, i, j, arr[i], arr[j], 36);
            }
        }
        this.swap(arr, i + 1, high);
        this.recordStep(2, i + 1, high, arr[i + 1], arr[high], 40);
        
        return (i + 1);
    },

    quickSortInternal: function(arr, low, high) {
        this.recordStep(0, low, high, -1, -1, 44);
        if (low < high) {
            let pi = this.partition(arr, low, high);
            this.recordStep(0, pi, -1, -1, -1, 47);
            
            this.quickSortInternal(arr, low, pi - 1);
            this.quickSortInternal(arr, pi + 1, high);
        }
    },

    // ---------------------------------------------------------
    // BUBBLE SORT (C++ equivalent)
    // ---------------------------------------------------------
    bubbleSortInternal: function(arr, n) {
        this.recordStep(0, 0, n, -1, -1, 55);
        for (let i = 0; i < n - 1; i++) {
            this.recordStep(0, i, -1, -1, -1, 57);
            for (let j = 0; j < n - i - 1; j++) {
                this.recordStep(1, j, j + 1, arr[j], arr[j+1], 59);
                if (arr[j] > arr[j + 1]) {
                    this.swap(arr, j, j + 1);
                    this.recordStep(2, j, j + 1, arr[j], arr[j+1], 61);
                }
            }
        }
    },

    // ---------------------------------------------------------
    // BINARY SEARCH (C++ equivalent)
    // ---------------------------------------------------------
    binarySearchInternal: function(arr, target) {
        this.recordStep(0, 0, arr.length - 1, -1, -1, 70);
        let left = 0;
        let right = arr.length - 1;

        while (left <= right) {
            let mid = Math.floor(left + (right - left) / 2);
            this.recordStep(4, mid, left, right, -1, 74);

            this.recordStep(1, mid, -1, arr[mid], target, 76);
            if (arr[mid] === target) {
                this.recordStep(5, mid, -1, -1, -1, 78);
                return mid;
            }

            this.recordStep(1, mid, -1, arr[mid], target, 81);
            if (arr[mid] < target) {
                left = mid + 1;
                this.recordStep(0, left, right, -1, -1, 83);
            } else {
                right = mid - 1;
                this.recordStep(0, left, right, -1, -1, 86);
            }
        }
        
        this.recordStep(6, -1, -1, -1, -1, 91);
        return -1;
    },

    // ---------------------------------------------------------
    // MAIN ENTRY POINT
    // ---------------------------------------------------------
    sortAndGetTraces: function(array, algorithm, targetVal) {
        this.traces = [];
        
        let workingArray = [...array];

        if (algorithm === 'merge') {
            this.mergeSortInternal(workingArray, 0, workingArray.length - 1);
        } else if (algorithm === 'quick') {
            this.quickSortInternal(workingArray, 0, workingArray.length - 1);
        } else if (algorithm === 'bubble') {
            this.bubbleSortInternal(workingArray, workingArray.length);
        } else if (algorithm === 'binary') {
            // Binary search requires a sorted array
            workingArray.sort((a, b) => a - b);
            
            if (targetVal === undefined || isNaN(targetVal)) {
                targetVal = workingArray[Math.floor(Math.random() * workingArray.length)];
            }
            
            this.binarySearchInternal(workingArray, targetVal);
            
            return {
                sortedArray: workingArray,
                traces: [...this.traces],
                target: targetVal
            };
        }

        return {
            sortedArray: workingArray,
            traces: [...this.traces]
        };
    }
};

window.AlgorithmsEngine = AlgorithmsEngine;

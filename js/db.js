"use strict";

const DB_NAME = 'AlgoStoreDB';
const DB_VERSION = 1;
const STORE_NAME = 'products';

let dbInstance = null;

const db = {
    init: function() {
        return new Promise((resolve, reject) => {
            if (dbInstance) {
                resolve(dbInstance);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("Error IndexedDB:", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                dbInstance = event.target.result;
                resolve(dbInstance);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    // Create store with autoIncrement key
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    // Index for sorting by price if needed later
                    store.createIndex('price', 'price', { unique: false });
                }
            };
        });
    },

    addProductsBulk: async function(products) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            // Using standard events instead of transaction.oncomplete for bulk
            transaction.oncomplete = () => resolve();
            transaction.onerror = (e) => reject(e.target.error);

            products.forEach(p => store.add(p));
        });
    },

    clearProducts: async function() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    },

    getCount: async function() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    getProductsPaginated: async function(offset, limit) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.openCursor();
            
            const results = [];
            let advanced = false;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (!cursor) {
                    resolve(results);
                    return;
                }

                if (offset > 0 && !advanced) {
                    advanced = true;
                    cursor.advance(offset);
                    return;
                }

                results.push(cursor.value);
                if (results.length < limit) {
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };

            request.onerror = (e) => reject(e.target.error);
        });
    }
};

window.appDb = db;

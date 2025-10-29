# TALENT FLOW 

A front-end-only React. TALENT FLOW simulates a mini-hiring platform , allowing them to manage job postings, track candidates through a Kanban pipeline, and build dynamic skill assessments.

This project is built with **no backend**. It features a complete mock API layer (using **Mock Service Worker**) and persists all data locally in the browser (using **Dexie.js / IndexedDB**) to simulate a full-stack, persistent user experience.

## Live Demo

**[https://talentflow-app-one.vercel.app/](https://talentflow-app-one.vercel.app/)**

---

## Core Features

### 1. Jobs Board
* **Full CRUD:** Create, Edit, and Archive jobs in a modal or on a separate route.
* **Drag-and-Drop Reordering:** Change job order with `@dnd-kit`.
* **Optimistic Updates:** UI updates instantly on reorder, with an automatic rollback on (simulated) API failure to test error handling.
* **Server-Side Simulation:** Features server-like pagination and filtering (by title, status, tags).

### 2. Candidate Tracking
* **Kanban Board:** Visually track candidates by dragging them between stages (`Applied`, `Screen`, `Tech`, etc.).
* **High-Performance List:** Renders 1,000+ seeded candidates smoothly using `@tanstack/react-virtual` (List Virtualization).
* **Search & Filter:** Fast client-side search (name/email) and server-like filtering (by stage).
* **Profile & Timeline:** View a candidate's status change history and attach notes.



---

##  Tech Stack & Tooling

* **UI Framework:** React & TypeScript
* **Routing:** React Router DOM
* **Server State & Caching:** `@tanstack/react-query` (React Query)
* **UI Components:** Shadcn UI & Tailwind CSS
* **Drag & Drop:** `@dnd-kit`
* **Forms:** `react-hook-form` & `zod` (for schema validation)
* **Virtualization:** `@tanstack/react-virtual`
* **Mock API Layer:** Mock Service Worker (MSW)
* **Local Persistence:** Dexie.js (as an IndexedDB wrapper)
* **Build Tool:** Vite (or Create React App)

---

##  Architecture & Technical Decisions

This project's architecture is designed to *simulate* a modern, high-performance web application, despite having no "real" backend.

### 1. The "No Backend" Data Layer: `MSW` + `Dexie.js`
* **Problem:** The app needs to perform CRUD operations, fetch data, and persist changes, all on the client.
* **Solution:**
    * **Mock Service Worker (MSW)** acts as the "network" layer. It intercepts `fetch` requests (e.g., `GET /api/jobs`) at the service worker level. This is crucial because the application code (like React Query hooks) is *completely unaware* it's talking to a mock.
    * **Dexie.js (IndexedDB)** acts as the "database". MSW handlers are wired to read from and write to Dexie, providing true persistence across page refreshes.
    * **Simulated Unreliability:** The MSW handlers also artificially inject latency (200-1200ms) and a 5-10% error rate on write endpoints, as required, to test loading states and error handling.

### 2. State Management: `React Query` vs. `useState`
* **Server State (React Query):** All data fetched from the "API" (like jobs and candidates) is managed by React Query. This gives us caching, background refetching, and query invalidation for free. For example, after editing a job, the `useMutation` hook invalidates the `['jobs']` query key, triggering an automatic refetch.
* **UI State (useState/useReducer):** Simple, local state (like dialog visibility, search input values, or the live state of the assessment builder) is handled by standard React hooks.

### 3. Implementing Optimistic Updates
* **Problem:** Drag-and-drop reordering needs to feel instantaneous, but the mock API has (simulated) latency and can fail.
* **Solution:** The `@dnd-kit` `onDragEnd` handler triggers a `useMutation` hook from React Query.
    1.  **`onMutate`:** We *immediately* update the local React Query cache (`queryClient.setQueryData`) with the new order. The UI updates instantly.
    2.  **`mutationFn`:** The (slow, failable) API call to `PATCH /api/jobs/:id/reorder` runs in the background.
    3.  **`onError` (Rollback):** If the mutation fails (a simulated 500 error), React Query automatically uses the context from `onMutate` to roll the cache back to its original state, and an error toast is shown.

### 4. Performance: The 1,000 Candidate List
* **Problem:** Rendering 1,000+ DOM nodes at once is extremely slow.
* **Solution:** The list is virtualized using `@tanstack/react-virtual`. This technique only renders the ~15-20 items currently visible in the viewport, ensuring smooth scrolling and a fast initial load.

---

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/Rashidashraf7/TALENTFLOW.git]
    cd TALENTFLOW
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Run the development server:**
    * MSW is configured to run automatically in development mode.
    ```bash
    npm run dev
    # or
    yarn dev
    ```

4.  Open [http://localhost:5173](http://localhost:5173) (or 3000) to view it in the browser.

---

## 🗺️ Known Issues & Future Improvements

* **Known Issues:**
    * (List any bugs you didn't get to fix. e.g., "The file upload stub in the assessment builder is UI-only and does not store the file.")
* **Future Improvements:**
    * **Unit & Integration Testing:** Add tests for `react-hook-form` logic and React Query mutations using Vitest and React Testing Library.
    * **WebSockets:** Implement a mock WebSocket for real-time updates (e.g., another user moves a candidate).
    * **Full Authentication:** Add a mock login/signup flow for the HR team.

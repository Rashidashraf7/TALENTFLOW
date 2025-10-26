import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { worker } from './lib/msw-browser';
import { seedDatabase } from './lib/seed';

async function prepare() {
  await worker.start({ onUnhandledRequest: 'bypass' });
  await seedDatabase();
}

prepare().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import { ConvexProvider, ConvexReactClient } from "convex/react";

// Get Convex URL from environment
const getConvexUrl = () => {
  const url = import.meta.env.VITE_CONVEX_URL;
  console.log("🔍 Checking Convex URL:", url ? "Found" : "Missing");
  if (!url) {
    console.error("❌ VITE_CONVEX_URL is not set. Please set your Convex cloud URL.");
    console.error("1. Deploy to Convex: npx convex deploy");
    console.error("2. Get your URL from the output or dashboard.convex.dev");
    console.error("3. Add to client/.env: VITE_CONVEX_URL=https://your-project.convex.cloud");
    throw new Error("VITE_CONVEX_URL environment variable is required. Please configure your Convex deployment URL.");
  }
  console.log("✅ Using Convex URL:", url);
  return url;
};

const convexUrl = getConvexUrl();
const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ConvexProvider>
  </StrictMode>,
)

import './index.css';
import {
    RouterProvider,
    createBrowserHistory,
    createHashHistory,
    createRouter,
} from '@tanstack/react-router';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import { Toaster } from '@/components/ui/sonner';

import { ThemeProvider } from './components/theme-provider';
import { TooltipProvider } from './components/ui/tooltip';
import { initializeStore } from './lib/store';
// Import the generated route tree
import { routeTree } from './routeTree.gen';

const history = window.location.protocol === 'file:' ? createHashHistory() : createBrowserHistory();

// Create a new router instance
const router = createRouter({ routeTree, history });

// Register the router instance for type safety
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}

// Initialize the AppStore
initializeStore();

// Render the app
const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <StrictMode>
            <ThemeProvider defaultTheme='dark' storageKey='vite-ui-theme'>
                <TooltipProvider>
                    <RouterProvider router={router} />
                    <Toaster />
                </TooltipProvider>
            </ThemeProvider>
        </StrictMode>,
    );
}

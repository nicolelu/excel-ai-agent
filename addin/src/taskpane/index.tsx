import React from 'react';
import { createRoot } from 'react-dom/client';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import App from './App';
import './styles.css';

// Initialize Office.js
Office.onReady(() => {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <FluentProvider theme={webLightTheme}>
          <App />
        </FluentProvider>
      </React.StrictMode>
    );
  }
});

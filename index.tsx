import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';;
import { createRoot } from "react-dom/client";

const root = createRoot(document.getElementById("root")!);
root.render(
  <div style={{ padding: 40, fontSize: 24 }}>
    LinkFlow está funcionando!  🚀
  </div>
);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

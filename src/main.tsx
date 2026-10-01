import {createRoot} from 'react-dom/client';
import 'katex/dist/katex.min.css';
import 'prismjs/themes/prism-tomorrow.css';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

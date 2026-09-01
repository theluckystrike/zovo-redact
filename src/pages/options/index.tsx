import { createRoot } from 'react-dom/client';

import Popup from '@pages/popup/Popup';
import '@pages/popup/redactConsole.css';

document.documentElement.dataset.surface = 'options';

function init() {
  const rootContainer = document.querySelector('#__root');
  if (!rootContainer) throw new Error("Can't find Options root element");
  const root = createRoot(rootContainer);
  root.render(<Popup surface="options" />);
}

init();

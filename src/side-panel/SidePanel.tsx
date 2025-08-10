import React, { useEffect } from 'react';

const SidePanel = () => {
  useEffect(() => {
    const iframe = document.createElement('iframe');
    iframe.src = 'http://localhost/chat/R7MeVUx8dM3FEero';
    iframe.style.cssText = 'border: none; width: 100%; height: 100vh; border-radius: 0.75rem;';
    iframe.id = 'dify-chatbot-bubble-window';

    const container = document.getElementById('root');
    if (container) {
      container.appendChild(iframe);
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      {/* Dify面板将在这里显示 */}
    </div>
  );
};

export default SidePanel;

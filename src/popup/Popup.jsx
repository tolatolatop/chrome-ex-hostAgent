import React, { useState } from 'react';

const Popup = () => {
  const [count, setCount] = useState(0);

  return (
    <div style={{ 
      padding: '20px',
      minWidth: '300px',
      minHeight: '200px'
    }}>
      <h1>我的 Chrome 扩展</h1>
      <button 
        onClick={() => setCount(count + 1)}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        点击次数: {count}
      </button>
    </div>
  );
};

export default Popup;
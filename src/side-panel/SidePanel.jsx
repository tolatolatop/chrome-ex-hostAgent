import React, { useState, useEffect, useCallback } from 'react';

const SidePanel = () => {

    const createIframe = () => {
        const iframe = document.createElement('iframe');
        iframe.allow = "fullscreen;microphone"
        iframe.title = "dify chatbot bubble window"
        iframe.id = 'dify-chatbot-bubble-window'
        iframe.src = 'https://udify.app/chatbot/KzC2LHFnK6rLa0nA'
        iframe.style.cssText = 'border: none; position: fixed; flex-direction: column; justify-content: space-between; box-shadow: rgba(150, 150, 150, 0.2) 0px 10px 30px 0px, rgba(150, 150, 150, 0.2) 0px 0px 0px 1px; bottom: 6.7rem; right: 1rem; width: 30rem; height: 48rem; border-radius: 0.75rem; display: flex; z-index: 2147483647; overflow: hidden; left: unset; background-color: #F3F4F6;'
        iframe.referrerPolicy = "same-origin";
        iframe.referrer = "https://react.dev";
        document.body.appendChild(iframe);
      }

    return (
        <div style={{ padding: '20px' }}>
        <button onClick={() => {
                window.location.reload();
        }}>
            reload page
        </button>
        <button onClick={() => {
            createIframe();
        }}>
            create iframe
        </button>
        </div>
    );
};

export default SidePanel; 
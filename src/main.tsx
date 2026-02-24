import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import App from './App'
import './index.css'

const { darkAlgorithm } = theme

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        algorithm: darkAlgorithm,
        token: {
          colorPrimary: '#a78bfa',
          colorSuccess: '#4ade80',
          colorWarning: '#fbbf24',
          colorError: '#f87171',
          colorInfo: '#38bdf8',
          borderRadius: 12,
          fontSize: 14,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          // Lighter background colors
          colorBgContainer: 'rgba(30, 30, 50, 0.85)',
          colorBgElevated: 'rgba(35, 35, 55, 0.95)',
          colorBgLayout: '#1a1a2e',
        },
        components: {
          Input: {
            colorBgContainer: 'rgba(40, 40, 65, 0.7)',
            colorBorder: 'rgba(167, 139, 250, 0.25)',
            colorText: '#ffffff',
            colorTextPlaceholder: 'rgba(255, 255, 255, 0.4)',
            borderRadius: 12,
          },
          Select: {
            colorBgContainer: 'rgba(40, 40, 65, 0.7)',
            colorBorder: 'rgba(167, 139, 250, 0.25)',
            colorText: '#ffffff',
            optionSelectedBg: 'rgba(167, 139, 250, 0.25)',
          },
          Card: {
            colorBgContainer: 'rgba(35, 35, 60, 0.75)',
            colorBorderSecondary: 'rgba(167, 139, 250, 0.25)',
          },
          Modal: {
            colorBgElevated: 'rgba(30, 30, 50, 0.95)',
            colorBorderSecondary: 'rgba(167, 139, 250, 0.25)',
          },
          Popover: {
            colorBgElevated: 'rgba(30, 30, 50, 0.95)',
            colorBorderSecondary: 'rgba(167, 139, 250, 0.25)',
          },
          Tooltip: {
            colorBgElevated: 'rgba(30, 30, 50, 0.95)',
            colorBorder: 'rgba(167, 139, 250, 0.25)',
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
)

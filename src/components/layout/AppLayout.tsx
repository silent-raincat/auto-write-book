import React, { useEffect, useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown } from 'antd';
import {
  BookOutlined,
  UserOutlined,
  TeamOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  LogoutOutlined,
  StarFilled,
  BulbOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore, type User } from "@/stores/useAuthStore";

const { Header, Sider, Content } = Layout;

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let mounted = true;
    api
      .get<User>('/users/me')
      .then((data) => {
        if (!mounted) return;
        setUser(data);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
      });
    return () => {
      mounted = false;
    };
  }, [setUser]);

  const menuItems = [
    {
      key: '/dashboard',
      icon: <BookOutlined />,
      label: '创作工作台',
    },
    {
      key: '/characters',
      icon: <TeamOutlined />,
      label: '人物管理',
    },
    {
      key: '/worldview',
      icon: <GlobalOutlined />,
      label: '世界观设定',
    },
    {
      key: '/smart-worldview',
      icon: <ThunderboltOutlined />,
      label: '智能世界观',
    },
    {
      key: '/inspirations',
      icon: <BulbOutlined />,
      label: '灵感池',
    },
    {
      key: '/knowledge',
      icon: <DatabaseOutlined />,
      label: '知识库',
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: '个人中心',
    },
  ];

  const userMenu = {
    items: [
      {
        key: 'logout',
        label: '退出登录',
        icon: <LogoutOutlined />,
      },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') {
        logout();
        navigate('/dashboard');
      }
    },
  };

  return (
    <>
      {/* Cosmic Background */}
      <div className="cosmic-bg" />

      <Layout className="min-h-screen relative z-10">
        <Sider
          width={240}
          className="site-layout-background animate-slide-in-left"
          style={{
            background: 'rgba(18, 18, 31, 0.8)',
            backdropFilter: 'blur(20px) saturate(180%)',
            borderRight: '1px solid rgba(167, 139, 250, 0.15)',
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
          }}
        >
          {/* Logo Section */}
          <div className="p-6 border-b border-[rgba(167,139,250,0.15)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-aurora)] to-[var(--accent-plasma)] flex items-center justify-center shadow-lg shadow-[rgba(167,139,250,0.3)]">
                <StarFilled className="text-white text-lg" />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                  星云创作
                </span>
                <span className="text-xs text-[rgba(255,255,255,0.5)]">AI Novel Studio</span>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <Menu
            mode="inline"
            theme="dark"
            selectedKeys={[location.pathname]}
            style={{
              height: 'calc(100% - 140px)',
              borderRight: 0,
              background: 'transparent',
              paddingTop: '16px',
            }}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
          />

          {/* Sidebar Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[rgba(167,139,250,0.15)] bg-[rgba(10,10,18,0.5)] backdrop-blur-sm">
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-[rgba(167,139,250,0.1)] border border-[rgba(167,139,250,0.2)]">
              <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
              <span className="text-xs text-[rgba(255,255,255,0.6)]">AI 助手在线</span>
            </div>
          </div>
        </Sider>

        <Layout style={{ marginLeft: 240 }}>
          <Header
            className="flex items-center justify-between px-8"
            style={{
              background: 'rgba(18, 18, 31, 0.6)',
              backdropFilter: 'blur(20px) saturate(180%)',
              borderBottom: '1px solid rgba(167, 139, 250, 0.15)',
              height: 72,
              position: 'sticky',
              top: 0,
              zIndex: 100,
            }}
          >
            {/* Page Title */}
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-white m-0" style={{ fontFamily: 'var(--font-display)' }}>
                {getPageTitle(location.pathname)}
              </h2>
            </div>

            {/* User Menu */}
            <Dropdown menu={userMenu} placement="bottomRight">
              <Button
                type="text"
                className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-[rgba(167,139,250,0.1)] transition-all duration-300 border border-transparent hover:border-[rgba(167,139,250,0.2)]"
              >
                <Avatar
                  icon={<UserOutlined />}
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-aurora), var(--accent-plasma))',
                  }}
                />
                <span className="text-white font-medium">{user?.name || '创作者'}</span>
              </Button>
            </Dropdown>
          </Header>

          <Content
            className="p-8"
            style={{
              minHeight: 'calc(100vh - 72px)',
            }}
          >
            {mounted && (
              <div className="animate-fade-in-up">
                <Outlet />
              </div>
            )}
          </Content>
        </Layout>
      </Layout>
    </>
  );
};

// Helper function to get page title
function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/dashboard': '创作工作台',
    '/characters': '人物管理',
    '/worldview': '世界观设定',
    '/smart-worldview': '智能世界观',
    '/inspirations': '灵感池',
    '/knowledge': '知识库',
    '/profile': '个人中心',
  };
  return titles[pathname] || '星云创作';
}

export default AppLayout;

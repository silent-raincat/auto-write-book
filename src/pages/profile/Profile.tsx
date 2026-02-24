import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  Typography,
  message,
  Descriptions,
  Row,
  Col,
  Statistic,
  Tabs,
  Tag,
  Space,
} from 'antd';
import {
  BookOutlined,
  FileTextOutlined,
  TeamOutlined,
  GlobalOutlined,
  KeyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api';
import { useAuthStore, type User } from '@/stores/useAuthStore';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

type ProfileFormValues = {
  email?: string;
  name: string;
  plan?: User['plan'];
  modelscopeToken?: string;
};

const MODELSCOPE_TOKEN_STORAGE_KEY = 'modelscope_api_key';
// 默认的 ModelScope API Key
const DEFAULT_MODELSCOPE_TOKEN = 'ms-54964895-9e08-409e-80ab-fe3709c1b1e0';

interface Stats {
  novelsCount: number;
  chaptersCount: number;
  charactersCount: number;
  worldViewEntriesCount: number;
}

const Profile: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats>({
    novelsCount: 0,
    chaptersCount: 0,
    charactersCount: 0,
    worldViewEntriesCount: 0,
  });
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (!user) {
      fetchUserInfo();
      return;
    }
    loadUserData();
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchUserInfo = async () => {
    try {
      const data = await api.get<User>('/users/me');
      setUser(data);
    } catch {
      setUser(null);
    }
  };

  const loadUserData = () => {
    if (typeof window !== 'undefined') {
      const savedToken = window.localStorage.getItem(MODELSCOPE_TOKEN_STORAGE_KEY) || DEFAULT_MODELSCOPE_TOKEN;
      form.setFieldsValue({
        name: user?.name || '',
        email: user?.email || '',
        plan: user?.plan || 'free',
        modelscopeToken: savedToken,
      });
    }
  };

  const fetchStats = async () => {
    try {
      // 获取小说数量
      const novels = await api.get<any[]>('/novels');
      const novelsCount = novels?.length || 0;

      // 获取章节总数
      let chaptersCount = 0;
      for (const novel of novels || []) {
        const chapters = await api.get<any[]>(`/chapters?novel_id=${novel.id}`);
        chaptersCount += chapters?.length || 0;
      }

      // 获取角色总数
      let charactersCount = 0;
      for (const novel of novels || []) {
        const characters = await api.get<any[]>(`/characters?novel_id=${novel.id}`);
        charactersCount += characters?.length || 0;
      }

      // 获取世界观条目总数
      let worldViewEntriesCount = 0;
      for (const novel of novels || []) {
        const entries = await api.get<any[]>(`/worldview-entries?novel_id=${novel.id}`);
        worldViewEntriesCount += entries?.length || 0;
      }

      setStats({
        novelsCount,
        chaptersCount,
        charactersCount,
        worldViewEntriesCount,
      });
    } catch {
      // Ignore error
    }
  };

  const handleSave = async (values: ProfileFormValues) => {
    setLoading(true);
    try {
      // 保存 API Key 到本地存储
      if (typeof window !== 'undefined') {
        const nextToken = values.modelscopeToken?.trim() || DEFAULT_MODELSCOPE_TOKEN;
        window.localStorage.setItem(MODELSCOPE_TOKEN_STORAGE_KEY, nextToken);
      }

      // 更新用户信息
      const updated = await api.put<User>('/users/me', {
        name: values.name,
        plan: values.plan,
      });
      setUser(updated);
      message.success('保存成功');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '保存失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetKey = () => {
    form.setFieldValue('modelscopeToken', DEFAULT_MODELSCOPE_TOKEN);
    message.success('已重置为默认 API Key');
  };

  const tabItems = [
    {
      key: 'profile',
      label: '个人信息',
      icon: <UserOutlined />,
      children: (
        <div className="space-y-6">
          <Card title="基本资料">
            <Form form={form} layout="vertical" onFinish={handleSave}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="用户ID">
                    <Input value={user?.id || ''} disabled />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="邮箱">
                    <Input value={user?.email || ''} disabled />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="name"
                label="昵称"
                rules={[{ required: true, message: '请输入昵称' }]}
              >
                <Input placeholder="请输入昵称" prefix={<UserOutlined />} />
              </Form.Item>

              <Form.Item name="plan" label="套餐">
                <Select
                  options={[
                    { value: 'free', label: '免费版' },
                    { value: 'premium', label: '高级版' },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="modelscopeToken"
                label={
                  <Space>
                    <KeyOutlined />
                    <span>ModelScope API Key</span>
                  </Space>
                }
                extra="用于调用魔塔社区大模型，已设置默认值"
              >
                <Input.Password
                  placeholder="ModelScope API Key"
                  autoComplete="off"
                  suffix={
                    <Button
                      type="link"
                      size="small"
                      onClick={handleResetKey}
                    >
                      重置默认
                    </Button>
                  }
                />
              </Form.Item>

              <div className="flex justify-end gap-2">
                <Button onClick={loadUserData}>重置</Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存
                </Button>
              </div>
            </Form>
          </Card>

          <Card title="账号状态">
            <Descriptions column={1} bordered>
              <Descriptions.Item label="当前套餐">
                <Tag color={user?.plan === 'premium' ? 'gold' : 'default'}>
                  {user?.plan === 'premium' ? '高级版' : '免费版'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="API Key 状态">
                <Tag color="green">已配置</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </div>
      ),
    },
    {
      key: 'stats',
      label: '数据统计',
      icon: <BookOutlined />,
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="小说数量"
                value={stats.novelsCount}
                prefix={<BookOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="章节数量"
                value={stats.chaptersCount}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="角色数量"
                value={stats.charactersCount}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="世界观条目"
                value={stats.worldViewEntriesCount}
                prefix={<GlobalOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'help',
      label: '使用说明',
      icon: <FileTextOutlined />,
      children: (
        <Card>
          <Title level={4}>快速入门</Title>
          <Paragraph>
            <Text strong>1. 创作工作台</Text>
            <br />
            创建和管理你的小说项目，查看所有作品的进度。
          </Paragraph>
          <Paragraph>
            <Text strong>2. 人物管理</Text>
            <br />
            创建角色档案，管理角色关系，查看角色弧光（角色成长轨迹）。
          </Paragraph>
          <Paragraph>
            <Text strong>3. 世界观设定</Text>
            <br />
            自定义分类管理世界观设定，如地理、历史、魔法体系等。
          </Paragraph>
          <Paragraph>
            <Text strong>4. AI 辅助</Text>
            <br />
            系统已预配置 ModelScope API Key，可直接使用 AI 生成章节内容和大纲。
          </Paragraph>
        </Card>
      ),
    },
  ];

  return (
    <div className="max-w-5xl">
      <Title level={2}>个人中心</Title>
      <Paragraph type="secondary">管理你的账户信息和查看创作统计</Paragraph>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </div>
  );
};

export default Profile;

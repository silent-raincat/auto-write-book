import React, { useEffect, useState } from 'react';
import { Card, Button, Typography, Row, Col, Empty, Modal, Form, Input, Select, message, Space, Tag, Statistic } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BookOutlined, FireOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

interface Novel {
  id: string;
  title: string;
  description: string;
  genre: string;
  style: string;
  updated_at: string;
}

type CreateNovelValues = {
  title: string;
  description?: string;
  genre?: string;
  style?: string;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [keyword, setKeyword] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editing, setEditing] = useState<Novel | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchNovels = async () => {
    setLoading(true);
    try {
      const data = await api.get<Novel[]>('/novels');
      setNovels(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNovels();
    setMounted(true);
  }, []);

  const filteredNovels = novels.filter((n) => {
    const k = keyword.trim();
    if (!k) return true;
    return (n.title || '').toLowerCase().includes(k.toLowerCase());
  });

  const visibleNovels = [...filteredNovels].sort((a, b) => {
    const at = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return bt - at;
  });

  const handleCreate = async (values: CreateNovelValues) => {
    try {
      const created = await api.post<Novel>('/novels', values);
      setNovels((prev) => [created, ...prev]);
      message.success('创建成功');
      setIsModalVisible(false);
      form.resetFields();
      navigate(`/novel/${created.id}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '创建失败';
      message.error(msg);
    }
  };

  const openEdit = (novel: Novel, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(novel);
    editForm.setFieldsValue({
      title: novel.title,
      description: novel.description,
      genre: novel.genre,
      style: novel.style,
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async (values: CreateNovelValues) => {
    if (!editing) return;
    try {
      const updated = await api.put<Novel>(`/novels/${editing.id}`, values);
      setNovels((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      message.success('保存成功');
      setEditOpen(false);
      setEditing(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '保存失败';
      message.error(msg);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这部小说吗？所有章节和人物也将被删除。',
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.delete(`/novels/${id}`);
          message.success('删除成功');
          fetchNovels();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  // Get genre color
  const getGenreColor = (genre: string) => {
    const colors: Record<string, string> = {
      '玄幻': 'purple',
      '科幻': 'cyan',
      '都市': 'blue',
      '历史': 'orange',
      '悬疑': 'red',
    };
    return colors[genre] || 'default';
  };

  // Calculate stats
  const totalWords = novels.reduce((acc, n) => acc + 0, 0); // You can add actual word count later
  const recentNovels = novels.filter(n => {
    if (!n.updated_at) return false;
    const daysSinceUpdate = (Date.now() - new Date(n.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate <= 7;
  }).length;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex justify-between items-center animate-fade-in-up">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold m-0 text-gradient">创作工作台</h1>
          <p className="text-[rgba(255,255,255,0.5)] m-0">开始你的创作之旅</p>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => setIsModalVisible(true)}
          className="h-12 px-6 rounded-xl font-medium"
        >
          创建新小说
        </Button>
      </div>

      {/* Stats Section */}
      {novels.length > 0 && (
        <Row gutter={[24, 24]} className="animate-fade-in-up stagger-1">
          <Col xs={24} sm={8}>
            <Card className="glass-card glass-card-shine h-full">
              <Statistic
                title={<span className="text-[rgba(255,255,255,0.6)]">作品总数</span>}
                value={novels.length}
                prefix={<BookOutlined />}
                valueStyle={{ color: '#ffffff', fontFamily: 'var(--font-display)' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="glass-card glass-card-shine h-full">
              <Statistic
                title={<span className="text-[rgba(255,255,255,0.6)]">本周活跃</span>}
                value={recentNovels}
                suffix={<span className="text-[rgba(255,255,255,0.5)]">部</span>}
                prefix={<FireOutlined />}
                valueStyle={{ color: '#ffffff', fontFamily: 'var(--font-display)' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="glass-card glass-card-shine h-full">
              <Statistic
                title={<span className="text-[rgba(255,255,255,0.6)]">总字数</span>}
                value={totalWords}
                suffix="字"
                valueStyle={{ color: '#ffffff', fontFamily: 'var(--font-display)' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Search Section */}
      <div className="flex items-center gap-4 animate-fade-in-up stagger-2">
        <div className="flex-1">
          <Input.Search
            allowClear
            size="large"
            placeholder="搜索作品标题..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="search-input"
            style={{
              borderRadius: '12px',
            }}
          />
        </div>
        <Text type="secondary" className="text-[rgba(255,255,255,0.5)]">
          共 {novels.length} 部作品
        </Text>
      </div>

      {/* Novels Grid */}
      {filteredNovels.length === 0 && !loading ? (
        <div className="animate-fade-in-up stagger-3">
          <Empty
            description={
              <div className="space-y-4">
                <p className="text-[rgba(255,255,255,0.5)]">
                  {keyword ? '没有找到匹配的作品' : '暂无作品，开始创作吧！'}
                </p>
              </div>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {!keyword && (
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => setIsModalVisible(true)}
                className="h-12 px-6 rounded-xl"
              >
                创建第一部小说
              </Button>
            )}
          </Empty>
        </div>
      ) : (
        <Row gutter={[20, 20]} className="animate-fade-in-up stagger-3">
          {visibleNovels.map((novel, index) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={novel.id}>
              <Card
                hoverable
                className="glass-card glass-card-shine novel-card h-full flex flex-col"
                style={{ animationDelay: `${(index % 8) * 0.1}s` }}
                onClick={() => navigate(`/novel/${novel.id}`)}
                actions={[
                  <EditOutlined
                    key="edit"
                    onClick={(e) => openEdit(novel, e)}
                    className="text-[rgba(255,255,255,0.6)] hover:text-[var(--accent-aurora)] transition-colors"
                  />,
                  <DeleteOutlined
                    key="delete"
                    onClick={(e) => handleDelete(novel.id, e)}
                    className="text-[rgba(255,255,255,0.6)] hover:text-[var(--error)] transition-colors"
                  />,
                ]}
              >
                <div className="flex-1">
                  {/* Genre Badge */}
                  <div className="mb-3">
                    <Tag color={getGenreColor(novel.genre)} className="mb-0">
                      {novel.genre}
                    </Tag>
                  </div>

                  {/* Title */}
                  <Title level={4} className="mb-3 text-white" ellipsis={{ rows: 1 }}>
                    {novel.title}
                  </Title>

                  {/* Description */}
                  <Paragraph
                    className="text-[rgba(255,255,255,0.6)] mb-4"
                    ellipsis={{ rows: 3 }}
                    style={{ minHeight: '60px' }}
                  >
                    {novel.description || '暂无简介...'}
                  </Paragraph>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-xs text-[rgba(255,255,255,0.4)] border-t border-[rgba(167,139,250,0.15)] pt-3 mt-auto">
                    <Space size={12}>
                      <span>{novel.style}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <ClockCircleOutlined />
                        {novel.updated_at ? new Date(novel.updated_at).toLocaleDateString() : '未编辑'}
                      </span>
                    </Space>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Create Modal */}
      <Modal
        title={
          <span className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            创建新小说
          </span>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        okText="创建"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="title"
            label={<span className="text-[rgba(255,255,255,0.9)]">小说标题</span>}
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="输入一个引人入胜的标题..." size="large" />
          </Form.Item>
          <Form.Item
            name="description"
            label={<span className="text-[rgba(255,255,255,0.9)]">简介</span>}
          >
            <Input.TextArea rows={4} placeholder="描述你的小说故事..." />
          </Form.Item>
          <div className="flex gap-4">
            <Form.Item
              name="genre"
              label={<span className="text-[rgba(255,255,255,0.9)]">类型</span>}
              initialValue="玄幻"
              className="flex-1"
            >
              <Select size="large">
                <Option value="玄幻">玄幻</Option>
                <Option value="科幻">科幻</Option>
                <Option value="都市">都市</Option>
                <Option value="历史">历史</Option>
                <Option value="悬疑">悬疑</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="style"
              label={<span className="text-[rgba(255,255,255,0.9)]">风格</span>}
              initialValue="热血"
              className="flex-1"
            >
              <Select size="large">
                <Option value="热血">热血</Option>
                <Option value="轻松">轻松</Option>
                <Option value="暗黑">暗黑</Option>
                <Option value="正剧">正剧</Option>
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={
          <span className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            编辑小说信息
          </span>
        }
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setEditing(null);
        }}
        onOk={() => editForm.submit()}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={editForm} layout="vertical" onFinish={handleSaveEdit}>
          <Form.Item
            name="title"
            label={<span className="text-[rgba(255,255,255,0.9)]">小说标题</span>}
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="输入小说标题..." size="large" />
          </Form.Item>
          <Form.Item
            name="description"
            label={<span className="text-[rgba(255,255,255,0.9)]">简介</span>}
          >
            <Input.TextArea rows={4} placeholder="描述你的小说故事..." />
          </Form.Item>
          <div className="flex gap-4">
            <Form.Item
              name="genre"
              label={<span className="text-[rgba(255,255,255,0.9)]">类型</span>}
              initialValue="玄幻"
              className="flex-1"
            >
              <Select size="large">
                <Option value="玄幻">玄幻</Option>
                <Option value="科幻">科幻</Option>
                <Option value="都市">都市</Option>
                <Option value="历史">历史</Option>
                <Option value="悬疑">悬疑</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="style"
              label={<span className="text-[rgba(255,255,255,0.9)]">风格</span>}
              initialValue="热血"
              className="flex-1"
            >
              <Select size="large">
                <Option value="热血">热血</Option>
                <Option value="轻松">轻松</Option>
                <Option value="暗黑">暗黑</Option>
                <Option value="正剧">正剧</Option>
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <style>{`
        .search-input {
          height: 48px;
          display: flex;
          align-items: center;
        }
        .search-input .ant-input-affix-wrapper {
          height: 48px;
          display: flex;
          align-items: center;
        }
        .search-input .ant-input {
          font-size: 16px;
        }
        .search-input .ant-input-search-button {
          height: 46px !important;
        }
        .novel-card .ant-card-actions {
          background: transparent;
          border-top: 1px solid rgba(167, 139, 250, 0.15);
        }
        .novel-card .ant-card-actions > li {
          margin: 8px 0;
        }
        .novel-card .ant-card-actions > li > span {
          color: rgba(255, 255, 255, 0.6);
          transition: all 0.3s ease;
        }
        .novel-card .ant-card-actions > li > span:hover {
          color: var(--accent-aurora);
        }
      `}</style>
    </div>
  );
};

export default Dashboard;

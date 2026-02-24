import React, { useEffect, useState } from 'react';
import { Card, Button, Row, Col, Empty, Modal, Form, Input, Select, message, Tag, Avatar, Space, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, EyeOutlined, TeamOutlined, BookOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';
import CharacterDetail from './CharacterDetail';
import RelationshipEditor from './RelationshipEditor';
import type { Character } from '@/types/character';

const { Option } = Select;
const { Text } = Typography;

interface Novel {
  id: string;
  title: string;
}

type CreateCharacterValues = {
  name: string;
  age?: number;
  gender?: string;
  personality?: string;
  background?: string;
  appearance?: string;
  relationships?: string;
};

const CharacterList: React.FC = () => {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [selectedNovelId, setSelectedNovelId] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [showRelationshipEditor, setShowRelationshipEditor] = useState(false);
  const [form] = Form.useForm();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchNovels();
  }, []);

  useEffect(() => {
    if (selectedNovelId) {
      fetchCharacters(selectedNovelId);
    } else {
      setCharacters([]);
    }
  }, [selectedNovelId]);

  const fetchNovels = async () => {
    try {
      const data = await api.get<Novel[]>('/novels');
      setNovels(data || []);
      if (data && data.length > 0) {
        setSelectedNovelId(data[0].id);
      }
    } catch {
      message.error('获取小说列表失败');
    }
  };

  const fetchCharacters = async (novelId: string) => {
    setLoading(true);
    try {
      const data = await api.get<Character[]>(`/characters?novel_id=${novelId}`);
      setCharacters(data || []);
    } catch {
      message.error('获取人物列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: CreateCharacterValues) => {
    if (!selectedNovelId) {
      message.error('请先选择小说');
      return;
    }
    try {
      await api.post('/characters', { ...values, novel_id: selectedNovelId });
      message.success('创建成功');
      setIsModalVisible(false);
      form.resetFields();
      fetchCharacters(selectedNovelId);
    } catch {
      message.error('创建失败');
    }
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个人物吗？',
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.delete(`/characters/${id}`);
          message.success('删除成功');
          if (selectedNovelId) {
            fetchCharacters(selectedNovelId);
          }
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  // Get gender-based gradient
  const getAvatarGradient = (gender?: string) => {
    if (gender === '女') {
      return 'linear-gradient(135deg, #f472b6, #c084fc)';
    } else if (gender === '男') {
      return 'linear-gradient(135deg, #38bdf8, #a78bfa)';
    }
    return 'linear-gradient(135deg, #a78bfa, #c084fc)';
  };

  // Get gender tag color
  const getGenderTagColor = (gender?: string) => {
    if (gender === '女') return 'magenta';
    if (gender === '男') return 'blue';
    return 'default';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in-up">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold m-0 text-gradient">人物管理</h1>
          <p className="text-[rgba(255,255,255,0.5)] m-0">创建和管理你小说中的角色</p>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => setIsModalVisible(true)}
          disabled={!selectedNovelId}
          className="h-11 px-5 rounded-xl font-medium"
        >
          添加人物
        </Button>
      </div>

      {/* Novel Selector */}
      <Card className="glass-card animate-fade-in-up stagger-1">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-comet)] to-[var(--accent-aurora)] flex items-center justify-center">
              <BookOutlined className="text-white" />
            </div>
            <div>
              <div className="text-sm text-[rgba(255,255,255,0.6)]">当前小说</div>
              <Select
                style={{ minWidth: 200 }}
                placeholder="请选择小说"
                value={selectedNovelId}
                onChange={setSelectedNovelId}
                size="large"
                className="novel-select"
              >
                {novels.map((novel) => (
                  <Option key={novel.id} value={novel.id}>
                    {novel.title}
                  </Option>
                ))}
              </Select>
            </div>
          </div>
          {selectedNovelId && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(167,139,250,0.1)] border border-[rgba(167,139,250,0.2)]">
              <TeamOutlined className="text-[var(--accent-aurora)]" />
              <Text className="text-white">{characters.length} 个角色</Text>
            </div>
          )}
        </div>
      </Card>

      {/* Characters Grid */}
      {!selectedNovelId ? (
        <div className="animate-fade-in-up stagger-2">
          <Empty
            description={
              <div className="space-y-2">
                <p className="text-[rgba(255,255,255,0.5)]">请先选择一部小说</p>
              </div>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      ) : characters.length === 0 && !loading ? (
        <div className="animate-fade-in-up stagger-2">
          <Empty
            description={
              <div className="space-y-2">
                <p className="text-[rgba(255,255,255,0.5)]">暂无人物，添加一个吧！</p>
              </div>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => setIsModalVisible(true)}
              className="h-12 px-6 rounded-xl"
            >
              创建第一个角色
            </Button>
          </Empty>
        </div>
      ) : (
        <Row gutter={[16, 16]} className="animate-fade-in-up stagger-2">
          {characters.map((char, index) => (
            <Col xs={24} sm={12} md={8} lg={6} key={char.id}>
              <Card
                hoverable
                className="glass-card glass-card-shine character-card h-full"
                style={{ animationDelay: `${(index % 8) * 0.05}s` }}
                actions={[
                  <EyeOutlined
                    key="detail"
                    onClick={() => setSelectedCharacter(char)}
                    className="text-[rgba(255,255,255,0.6)] hover:text-[var(--accent-comet)] transition-colors"
                  />,
                  <TeamOutlined
                    key="relationships"
                    onClick={() => { setSelectedCharacter(char); setShowRelationshipEditor(true); }}
                    className="text-[rgba(255,255,255,0.6)] hover:text-[var(--accent-aurora)] transition-colors"
                  />,
                  <DeleteOutlined
                    key="delete"
                    onClick={() => handleDelete(char.id)}
                    className="text-[rgba(255,255,255,0.6)] hover:text-[var(--error)] transition-colors"
                  />,
                ]}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* Avatar */}
                  <Avatar
                    icon={<UserOutlined />}
                    size={80}
                    style={{
                      background: getAvatarGradient(char.gender),
                      boxShadow: '0 8px 24px rgba(167, 139, 250, 0.3)',
                    }}
                  />

                  {/* Name and Gender */}
                  <div className="w-full">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-white m-0" style={{ fontFamily: 'var(--font-display)' }}>
                        {char.name}
                      </h3>
                      <Tag color={getGenderTagColor(char.gender)} className="mb-0">
                        {char.gender}
                      </Tag>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="w-full space-y-2 text-left">
                    <div className="flex items-center justify-between text-sm py-2 border-b border-[rgba(167,139,250,0.1)]">
                      <span className="text-[rgba(255,255,255,0.5)]">年龄</span>
                      <span className="text-white font-medium">{char.age || '?'} 岁</span>
                    </div>
                    <div className="text-sm py-2">
                      <div className="text-[rgba(255,255,255,0.5)] mb-1">性格</div>
                      <div className="text-white/90 line-clamp-2">
                        {char.personality || '暂无描述'}
                      </div>
                    </div>
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
            添加新人物
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
            name="name"
            label={<span className="text-[rgba(255,255,255,0.9)]">姓名</span>}
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="人物姓名..." size="large" />
          </Form.Item>
          <div className="flex gap-4">
            <Form.Item
              name="age"
              label={<span className="text-[rgba(255,255,255,0.9)]">年龄</span>}
              className="flex-1"
            >
              <Input type="number" placeholder="年龄" size="large" />
            </Form.Item>
            <Form.Item
              name="gender"
              label={<span className="text-[rgba(255,255,255,0.9)]">性别</span>}
              className="flex-1"
              initialValue="男"
            >
              <Select size="large">
                <Option value="男">男</Option>
                <Option value="女">女</Option>
                <Option value="其他">其他</Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item
            name="personality"
            label={<span className="text-[rgba(255,255,255,0.9)]">性格特征</span>}
          >
            <Input.TextArea rows={2} placeholder="描述人物的性格..." />
          </Form.Item>
          <Form.Item
            name="appearance"
            label={<span className="text-[rgba(255,255,255,0.9)]">外貌描写</span>}
          >
            <Input.TextArea rows={2} placeholder="描述人物的外貌..." />
          </Form.Item>
          <Form.Item
            name="background"
            label={<span className="text-[rgba(255,255,255,0.9)]">背景故事</span>}
          >
            <Input.TextArea rows={3} placeholder="人物的背景故事..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Character Detail Modal */}
      <CharacterDetail
        visible={!!selectedCharacter && !showRelationshipEditor}
        onClose={() => setSelectedCharacter(null)}
        character={selectedCharacter}
        novelId={selectedNovelId}
      />

      {/* Relationship Editor Modal */}
      <RelationshipEditor
        visible={showRelationshipEditor}
        onClose={() => { setShowRelationshipEditor(false); setSelectedCharacter(null); }}
        character={selectedCharacter}
        novelId={selectedNovelId}
      />

      <style>{`
        .novel-select .ant-select-selector {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(167, 139, 250, 0.15) !important;
          color: #ffffff !important;
          border-radius: 10px !important;
          height: 40px !important;
        }
        .novel-select .ant-select-selector:hover {
          border-color: rgba(167, 139, 250, 0.3) !important;
        }
        .novel-select .ant-select-focused .ant-select-selector {
          border-color: var(--accent-aurora) !important;
          box-shadow: 0 0 20px rgba(167, 139, 250, 0.1) !important;
        }
        .character-card .ant-card-actions {
          background: transparent;
          border-top: 1px solid rgba(167, 139, 250, 0.15);
        }
        .character-card .ant-card-actions > li {
          margin: 8px 0;
        }
        .character-card .ant-card-actions > li > span {
          color: rgba(255, 255, 255, 0.6);
          transition: all 0.3s ease;
        }
        .character-card .ant-card-actions > li > span:hover {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
};

export default CharacterList;

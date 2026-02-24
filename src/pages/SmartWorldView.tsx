import React, { useState, useEffect } from 'react';
import {
  Layout,
  Input,
  Button,
  Card,
  Typography,
  Space,
  message,
  Spin,
  Tree,
  Tag,
  Modal,
  Tooltip,
  Divider
} from 'antd';
import {
  PlusOutlined,
  SendOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  BranchesOutlined
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';

const { Content, Sider } = Layout;
const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

interface WorldViewEntry {
  id: string;
  title: string;
  content: string;
  entry_type: string;
  tags: string[];
  parent_id: string | null;
  children: WorldViewEntry[];
  source_type: string;
  confidence: number;
  created_at: string;
}

const ENTRY_TYPE_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  civilization: { icon: '🏛️', color: 'blue', label: '文明' },
  faction: { icon: '⚔️', color: 'red', label: '势力' },
  item: { icon: '🎒', color: 'orange', label: '物品' },
  skill: { icon: '✨', color: 'purple', label: '技能' },
  concept: { icon: '💡', color: 'cyan', label: '概念' },
  character: { icon: '👤', color: 'green', label: '人物' },
  location: { icon: '🗺️', color: 'lime', label: '地点' },
  event: { icon: '📜', color: 'gold', label: '事件' },
  rule: { icon: '⚖️', color: 'magenta', label: '规则' },
};

const SmartWorldView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const novelId = searchParams.get('novelId') || '';
  const navigate = useNavigate();

  const [novels, setNovels] = useState<any[]>([]);
  const [selectedNovelId, setSelectedNovelId] = useState(novelId);
  const [inputText, setInputText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [entries, setEntries] = useState<WorldViewEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<WorldViewEntry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchNovels();
  }, []);

  useEffect(() => {
    if (selectedNovelId) {
      fetchWorldViewTree();
    } else {
      setEntries([]);
      setLoading(false);
    }
  }, [selectedNovelId]);

  const fetchNovels = async () => {
    try {
      const response = await fetch('/api/novels');
      const data = await response.json();
      if (data.data) {
        setNovels(data.data);
        if (!selectedNovelId && data.data.length > 0) {
          setSelectedNovelId(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch novels:', error);
    }
  };

  const fetchWorldViewTree = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/worldview/tree/${selectedNovelId}`);
      const data = await response.json();
      if (data.success) {
        setEntries(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch worldview:', error);
      message.error('加载世界观失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedNovelId) {
      message.warning('请先选择小说');
      return;
    }

    if (!inputText.trim()) {
      message.warning('请输入内容');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch('/api/worldview/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novelId: selectedNovelId,
          content: inputText
        })
      });

      const data = await response.json();
      if (data.success) {
        message.success(data.data.message);
        setInputText('');
        fetchWorldViewTree();
      } else {
        message.error(data.error || '分析失败');
      }
    } catch (error) {
      console.error('Analyze failed:', error);
      message.error('分析失败');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个条目吗？',
      onOk: async () => {
        try {
          const response = await fetch(`/api/worldview/entry/${entryId}`, {
            method: 'DELETE'
          });
          if (response.ok) {
            message.success('删除成功');
            fetchWorldViewTree();
            setShowDetailModal(false);
          } else {
            const data = await response.json();
            message.error(data.error || '删除失败');
          }
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  // 构建树形数据结构
  const buildTreeData = (entries: WorldViewEntry[]): any[] => {
    return entries.map(entry => ({
      title: (
        <Space>
          <span>{ENTRY_TYPE_ICONS[entry.entry_type]?.icon || '📝'}</span>
          <Text strong style={{ color: '#fff' }}>{entry.title}</Text>
          {entry.source_type === 'ai_analyzed' && (
            <Tag color="blue">AI</Tag>
          )}
        </Space>
      ),
      key: entry.id,
      children: entry.children && entry.children.length > 0 ? buildTreeData(entry.children) : undefined,
      entry
    }));
  };

  const handleTreeSelect = (selectedKeys: React.Key[], info: any) => {
    if (info.node.entry) {
      setSelectedEntry(info.node.entry);
      setShowDetailModal(true);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#0f0f0f' }}>
      <Content style={{ padding: '24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Title level={2} style={{ margin: 0, color: '#fff' }}>
                    <ThunderboltOutlined style={{ color: '#faad14', marginRight: 12 }} />
                    智能世界观
                  </Title>
                  <Text type="secondary">随意输入你的想象，AI自动解析并归类</Text>
                </div>
                {novels.length > 0 && (
                  <div style={{ minWidth: 200 }}>
                    <Text strong style={{ color: '#fff', marginRight: 8 }}>选择小说:</Text>
                    <select
                      value={selectedNovelId}
                      onChange={(e) => setSelectedNovelId(e.target.value)}
                      style={{
                        background: '#0f0f0f',
                        color: '#fff',
                        border: '1px solid #333',
                        padding: '6px 12px',
                        borderRadius: 4,
                        minWidth: 200
                      }}
                    >
                      {novels.map(novel => (
                        <option key={novel.id} value={novel.id}>{novel.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 输入区域 */}
              <Card style={{ background: '#1a1a1a', borderColor: '#333' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <div>
                    <Text strong style={{ color: '#fff' }}>输入你的想象</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      例如：晶卡文明的人会使用品卡仪，将各种卡都放在品卡仪上才能使用...
                    </Text>
                  </div>

                  <TextArea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="在这里随意输入你想象的内容，AI会自动提取世界观元素并智能归类..."
                    rows={6}
                    style={{ background: '#0f0f0f', color: '#fff', border: '1px solid #333' }}
                  />

                  <Button
                    type="primary"
                    size="large"
                    icon={<ThunderboltOutlined />}
                    onClick={handleAnalyze}
                    loading={analyzing}
                    block
                  >
                    AI 智能解析
                  </Button>

                  <Divider style={{ margin: '8px 0', borderColor: '#333' }} />

                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      💡 提示：
                      <br />• 可以描述文明、势力、物品、技能等任何元素
                      <br />• 提到"XX是YY的一种"会自动建立层级关系
                      <br />• AI会自动匹配已有的条目进行归类
                    </Text>
                  </div>
                </Space>
              </Card>
            </Space>
          </div>

          {/* 世界观树形展示 */}
          <Card
            title="世界观知识树"
            style={{ background: '#1a1a1a', borderColor: '#333' }}
            styles={{ body: { padding: 16 } }}
            extra={
              <Button icon={<BranchesOutlined />} onClick={fetchWorldViewTree}>
                刷新
              </Button>
            }
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
              </div>
            ) : entries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <BulbOutlined style={{ fontSize: 48, color: '#444', marginBottom: 16 }} />
                <Text type="secondary">还没有世界观设定，开始输入你的想象吧</Text>
              </div>
            ) : (
              <Tree
                treeData={buildTreeData(entries)}
                onSelect={handleTreeSelect}
                style={{ background: 'transparent' }}
                showLine
                defaultExpandAll
              />
            )}
          </Card>
        </div>
      </Content>

      {/* 详情模态框 */}
      <Modal
        title={
          <Space>
            <span>{ENTRY_TYPE_ICONS[selectedEntry?.entry_type || 'concept']?.icon || '📝'}</span>
            <span>{selectedEntry?.title}</span>
            <Tag color={ENTRY_TYPE_ICONS[selectedEntry?.entry_type || 'concept']?.color}>
              {ENTRY_TYPE_ICONS[selectedEntry?.entry_type || 'concept']?.label}
            </Tag>
          </Space>
        }
        open={showDetailModal}
        onCancel={() => setShowDetailModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowDetailModal(false)}>
            关闭
          </Button>,
          <Button
            key="delete"
            danger
            icon={<DeleteOutlined />}
            onClick={() => selectedEntry && handleDeleteEntry(selectedEntry.id)}
          >
            删除
          </Button>
        ]}
        width={600}
        style={{ background: '#1a1a1a' }}
      >
        {selectedEntry && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text strong style={{ color: '#fff' }}>描述</Text>
              <Paragraph style={{ color: '#ccc', marginTop: 8, background: '#0f0f0f', padding: 12, borderRadius: 4 }}>
                {selectedEntry.content}
              </Paragraph>
            </div>

            {selectedEntry.tags && selectedEntry.tags.length > 0 && (
              <div>
                <Text strong style={{ color: '#fff' }}>标签</Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    {selectedEntry.tags.map((tag, index) => (
                      <Tag key={index}>{tag}</Tag>
                    ))}
                  </Space>
                </div>
              </div>
            )}

            <div>
              <Space>
                <Text type="secondary">来源: </Text>
                <Tag color={selectedEntry.source_type === 'ai_analyzed' ? 'blue' : 'default'}>
                  {selectedEntry.source_type === 'ai_analyzed' ? 'AI解析' : '手动创建'}
                </Tag>
                {selectedEntry.source_type === 'ai_analyzed' && (
                  <Text type="secondary">置信度: {(selectedEntry.confidence * 100).toFixed(0)}%</Text>
                )}
              </Space>
            </div>
          </Space>
        )}
      </Modal>
    </Layout>
  );
};

export default SmartWorldView;

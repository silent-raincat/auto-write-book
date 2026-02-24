import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Empty, Form, Input, InputNumber, Modal, Space, Typography, message, List, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';

const { Title, Text } = Typography;

type KnowledgeFile = {
  id: string;
  user_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  content_summary: string | null;
  created_at: string;
};

type CreateKnowledgeValues = {
  filename: string;
  file_type?: string;
  file_size?: number;
  storage_path: string;
  content_summary?: string;
};

const KnowledgeBase: React.FC = () => {
  const [items, setItems] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await api.get<KnowledgeFile[]>('/knowledge');
      setItems(data || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '获取知识库失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return items;
    return items.filter((x) => {
      const base = `${x.filename || ''} ${x.content_summary || ''} ${x.storage_path || ''}`.toLowerCase();
      return base.includes(k);
    });
  }, [items, keyword]);

  const handleCreate = async (values: CreateKnowledgeValues) => {
    try {
      const created = await api.post<KnowledgeFile>('/knowledge', {
        filename: values.filename,
        file_type: values.file_type,
        file_size: values.file_size,
        storage_path: values.storage_path,
        content_summary: values.content_summary,
      });
      setItems((prev) => [created, ...prev]);
      message.success('添加成功');
      setOpen(false);
      form.resetFields();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '添加失败';
      message.error(msg);
    }
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后不可恢复，确定继续吗？',
      onOk: async () => {
        try {
          await api.delete(`/knowledge/${id}`);
          message.success('删除成功');
          setItems((prev) => prev.filter((x) => x.id !== id));
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : '删除失败';
          message.error(msg);
        }
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="mb-0">知识库</Title>
          <Text type="secondary">用于沉淀设定、资料与世界观，供 AI 生成时参考。</Text>
        </div>
        <Space>
          <Input.Search
            allowClear
            placeholder="搜索文件名/摘要/路径"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 280 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            添加条目
          </Button>
        </Space>
      </div>

      {filtered.length === 0 && !loading ? (
        <Empty description="暂无知识条目">
          <Button type="primary" onClick={() => setOpen(true)}>添加条目</Button>
        </Empty>
      ) : (
        <List
          loading={loading}
          dataSource={filtered}
          renderItem={(item) => (
            <List.Item>
              <Card
                className="w-full"
                size="small"
                title={
                  <Space>
                    <span>{item.filename}</span>
                    <Tag>{item.file_type}</Tag>
                    <Tag>{Math.round(item.file_size / 1024)} KB</Tag>
                  </Space>
                }
                extra={
                  <Button
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(item.id)}
                  >
                    删除
                  </Button>
                }
              >
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">路径：{item.storage_path}</div>
                  <div className="text-sm">{item.content_summary || '暂无摘要'}</div>
                  <div className="text-xs text-gray-400">创建于 {new Date(item.created_at).toLocaleString()}</div>
                </div>
              </Card>
            </List.Item>
          )}
        />
      )}

      <Modal
        title="添加知识条目"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ file_type: 'text/plain', file_size: 0 }}
        >
          <Form.Item name="filename" label="文件名" rules={[{ required: true, message: '请输入文件名' }]}>
            <Input placeholder="例如：世界观设定.txt" />
          </Form.Item>
          <Form.Item name="storage_path" label="存储路径" rules={[{ required: true, message: '请输入存储路径' }]}>
            <Input placeholder="例如：kb/worldbuilding/setting.txt" />
          </Form.Item>
          <div className="flex gap-4">
            <Form.Item name="file_type" label="类型" className="flex-1">
              <Input placeholder="例如：text/plain" />
            </Form.Item>
            <Form.Item name="file_size" label="大小(字节)" className="flex-1">
              <InputNumber className="w-full" min={0} placeholder="默认 0" />
            </Form.Item>
          </div>
          <Form.Item name="content_summary" label="内容摘要">
            <Input.TextArea rows={4} placeholder="写一些关键信息，便于检索与 AI 使用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default KnowledgeBase;

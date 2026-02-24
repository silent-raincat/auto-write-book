import React, { useState } from 'react';
import { Card, List, Button, Modal, Form, Input, Select, Space, message, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined } from '@ant-design/icons';
import { useWorldViewStore } from '@/stores/useWorldViewStore';
import type { WorldViewCategory } from '@/types/worldview';

const { Option } = Select;
const { TextArea } = Input;

const PRESET_ICONS = [
  { label: '地球', value: 'global' },
  { label: '书籍', value: 'book' },
  { label: '建筑', value: 'building' },
  { label: '闪电', value: 'thunderbolt' },
  { label: '实验', value: 'experiment' },
  { label: '皇冠', value: 'crown' },
  { label: '刀剑', value: 'robot' },
  { label: '魔法', value: 'magic' },
];

const PRESET_COLORS = [
  { label: '蓝色', value: '#1890ff' },
  { label: '绿色', value: '#52c41a' },
  { label: '橙色', value: '#fa8c16' },
  { label: '红色', value: '#f5222d' },
  { label: '紫色', value: '#722ed1' },
  { label: '青色', value: '#13c2c2' },
  { label: '灰色', value: '#8c8c8c' },
];

interface CategoryManagerProps {
  novelId: string;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ novelId }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const {
    categories,
    selectedCategory,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    setSelectedCategory,
  } = useWorldViewStore();

  const handleSubmit = async (values: any) => {
    try {
      if (editingId) {
        await updateCategory(editingId, values);
        message.success('更新成功');
      } else {
        await createCategory({ ...values, novel_id: novelId });
        message.success('创建成功');
      }
      setIsModalVisible(false);
      form.resetFields();
      setEditingId(null);
    } catch {
      message.error(editingId ? '更新失败' : '创建失败');
    }
  };

  const handleEdit = (category: WorldViewCategory) => {
    setEditingId(category.id);
    form.setFieldsValue(category);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      message.success('删除成功');
      if (selectedCategory === id) {
        setSelectedCategory(null);
      }
    } catch {
      message.error('删除失败');
    }
  };

  return (
    <>
      <Card
        title="设定分类"
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => { setEditingId(null); form.resetFields(); setIsModalVisible(true); }}
          >
            添加
          </Button>
        }
      >
        {categories.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            暂无分类，点击上方按钮添加
          </div>
        ) : (
          <List
            dataSource={categories}
            renderItem={(category) => (
              <List.Item
                className={selectedCategory === category.id ? 'bg-blue-50' : ''}
                onClick={() => setSelectedCategory(category.id)}
                actions={[
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(e) => { e.stopPropagation(); handleEdit(category); }}
                  />,
                  <Popconfirm
                    title="确认删除"
                    description="删除分类将同时删除该分类下的所有条目"
                    onConfirm={(e) => { e?.stopPropagation(); handleDelete(category.id); }}
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <FolderOutlined
                      style={{
                        fontSize: '24px',
                        color: category.color || '#1890ff',
                      }}
                    />
                  }
                  title={
                    <Space>
                      <span className="font-medium">{category.name}</span>
                      {category.description && (
                        <span className="text-xs text-gray-500">{category.description}</span>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        title={editingId ? '编辑分类' : '添加分类'}
        open={isModalVisible}
        onCancel={() => { setIsModalVisible(false); setEditingId(null); form.resetFields(); }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="如：地理、历史、魔法体系等" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="分类描述（可选）" />
          </Form.Item>

          <Form.Item name="icon" label="图标" initialValue="global">
            <Select>
              {PRESET_ICONS.map(icon => (
                <Option key={icon.value} value={icon.value}>
                  {icon.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="color" label="颜色" initialValue="#1890ff">
            <Select>
              {PRESET_COLORS.map(color => (
                <Option key={color.value} value={color.value}>
                  <Tag color={color.value}>{color.label}</Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default CategoryManager;

import React, { useState } from 'react';
import { Card, Tag, Typography, Space, Dropdown, Button, Modal, Input, Select, ColorPicker } from 'antd';
import {
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BulbOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { ColorPickerProps } from 'antd';

const { Text, Paragraph } = Typography;

interface Inspiration {
  id: string;
  content: string;
  category: string;
  tags: string[];
  is_used: boolean;
  used_chapters: string[];
  color: string;
  created_at: string;
  updated_at: string;
}

interface InspirationCardProps {
  inspiration: Inspiration;
  isSelected?: boolean;
  onSelect?: () => void;
  onUpdate?: (id: string, data: Partial<Inspiration>) => void;
  onDelete?: (id: string) => void;
  showUsedStatus?: boolean;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  scene: { label: '场景', color: 'blue', icon: '🎬' },
  dialogue: { label: '对话', color: 'green', icon: '💬' },
  plot: { label: '情节', color: 'purple', icon: '📖' },
  atmosphere: { label: '氛围', color: 'cyan', icon: '🌟' },
  action: { label: '动作', color: 'red', icon: '⚡' },
  character: { label: '角色', color: 'orange', icon: '👤' },
  general: { label: '通用', color: 'default', icon: '💡' },
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => ({
  label: `${icon} ${label}`,
  value: key,
}));

export const InspirationCard: React.FC<InspirationCardProps> = ({
  inspiration,
  isSelected = false,
  onSelect,
  onUpdate,
  onDelete,
  showUsedStatus = true,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(inspiration.content);
  const [editCategory, setEditCategory] = useState(inspiration.category);
  const [editColor, setEditColor] = useState<ColorPickerProps['value']>(inspiration.color);

  const categoryInfo = CATEGORY_LABELS[inspiration.category] || CATEGORY_LABELS.general;

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    let colorValue = inspiration.color;
    if (typeof editColor === 'string') {
      colorValue = editColor;
    } else if (editColor && typeof editColor === 'object' && 'toHexString' in editColor && typeof editColor.toHexString === 'function') {
      colorValue = editColor.toHexString();
    }
    onUpdate?.(inspiration.id, {
      content: editContent,
      category: editCategory,
      color: colorValue,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(inspiration.content);
    setEditCategory(inspiration.category);
    setEditColor(inspiration.color);
    setIsEditing(false);
  };

  const handleColorChange: ColorPickerProps['onChange'] = (color, css) => {
    setEditColor(color);
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
      onClick: handleEdit,
    },
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: '确认删除',
          content: '确定要删除这个灵感素材吗？',
          onOk: () => onDelete?.(inspiration.id),
        });
      },
    },
  ];

  return (
    <Card
      size="small"
      className={`inspiration-card ${isSelected ? 'selected' : ''} ${inspiration.is_used ? 'used' : ''}`}
      style={{
        marginBottom: 12,
        cursor: onSelect ? 'pointer' : 'default',
        borderLeft: `4px solid ${inspiration.color}`,
        opacity: inspiration.is_used ? 0.7 : 1,
        backgroundColor: inspiration.is_used ? '#1a1a1a' : undefined,
      }}
      onClick={onSelect}
      hoverable={!isEditing}
    >
      {isEditing ? (
        <div className="inspiration-edit" onClick={(e) => e.stopPropagation()}>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Select
              value={editCategory}
              onChange={setEditCategory}
              options={CATEGORY_OPTIONS}
              style={{ width: '100%' }}
            />
            <Input.TextArea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
              placeholder="输入灵感内容..."
            />
            <Space>
              <ColorPicker
                value={editColor}
                onChange={handleColorChange}
                showText
                format="hex"
              />
              <Button type="primary" size="small" onClick={handleSave}>
                保存
              </Button>
              <Button size="small" onClick={handleCancel}>
                取消
              </Button>
            </Space>
          </Space>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <Space size="small">
              <Tag color={categoryInfo.color}>
                {categoryInfo.icon} {categoryInfo.label}
              </Tag>
              {showUsedStatus && (
                inspiration.is_used ? (
                  <Tag icon={<CheckCircleOutlined />} color="success">
                    已使用
                  </Tag>
                ) : (
                  <Tag icon={<ClockCircleOutlined />} color="default">
                    未使用
                  </Tag>
                )
              )}
            </Space>
            <Dropdown menu={{ items: menuItems }} trigger={['click']}>
              <Button
                type="text"
                size="small"
                icon={<MoreOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          </div>

          <Paragraph
            ellipsis={{ rows: 4, expandable: true, symbol: '展开' }}
            style={{ marginBottom: 8, color: inspiration.is_used ? '#888' : undefined }}
          >
            {inspiration.content}
          </Paragraph>

          {inspiration.tags && inspiration.tags.length > 0 && (
            <Space size={4} wrap>
              {inspiration.tags.map((tag, index) => (
                <Tag key={index}>
                  {tag}
                </Tag>
              ))}
            </Space>
          )}
        </>
      )}
    </Card>
  );
};

export default InspirationCard;

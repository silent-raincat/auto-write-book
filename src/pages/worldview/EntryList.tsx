import React, { useEffect, useState } from 'react';
import { Card, List, Button, Input, Tag, Space, Empty, Spin } from 'antd';
import { SearchOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons';
import { useWorldViewStore } from '@/stores/useWorldViewStore';
import type { WorldViewEntry, WorldViewCategory } from '@/types/worldview';

const { Search } = Input;

interface EntryListProps {
  novelId: string;
  categoryId: string | null;
  onEntryClick: (entryId: string) => void;
  onCreateEntry: () => void;
}

const EntryList: React.FC<EntryListProps> = ({
  novelId,
  categoryId,
  onEntryClick,
  onCreateEntry,
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [categoryName, setCategoryName] = useState<string>('');

  const {
    categories,
    entries,
    loading,
    fetchEntries,
    searchEntries,
  } = useWorldViewStore();

  useEffect(() => {
    if (categoryId) {
      const category = categories.find(c => c.id === categoryId);
      setCategoryName(category?.name || '');
    }
  }, [categoryId, categories]);

  const handleSearch = async (value: string) => {
    if (!value.trim()) {
      fetchEntries(novelId, categoryId || undefined);
      return;
    }
    setIsSearching(true);
    try {
      await searchEntries(novelId, value);
    } finally {
      setIsSearching(false);
    }
  };

  const filteredEntries = searchKeyword
    ? entries
    : entries.filter(e => e.category_id === categoryId);

  return (
    <Card
      title={categoryName || '设定条目'}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreateEntry}
          disabled={!categoryId}
        >
          添加条目
        </Button>
      }
    >
      <div className="mb-4">
        <Search
          placeholder="搜索条目标题或内容"
          allowClear
          onSearch={handleSearch}
          onChange={(e) => { if (!e.target.value) fetchEntries(novelId, categoryId || undefined); }}
        />
      </div>

      {loading || isSearching ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : filteredEntries.length === 0 ? (
        <Empty
          description={searchKeyword ? '未找到匹配的条目' : '暂无条目'}
        />
      ) : (
        <List
          dataSource={filteredEntries}
          renderItem={(entry) => (
            <List.Item
              key={entry.id}
              onClick={() => onEntryClick(entry.id)}
              className="cursor-pointer hover:bg-gray-50"
            >
              <List.Item.Meta
                avatar={<FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
                title={
                  <Space>
                    <span>{entry.title}</span>
                    {entry.is_locked && <Tag color="orange">已锁定</Tag>}
                  </Space>
                }
                description={
                  <div>
                    <div className="line-clamp-2 text-sm mb-1">
                      {entry.content || '暂无内容'}
                    </div>
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {entry.tags.map((tag, idx) => (
                          <Tag key={idx} className="text-xs">
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};

export default EntryList;

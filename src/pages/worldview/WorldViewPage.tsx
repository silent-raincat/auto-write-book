import React, { useEffect, useState } from 'react';
import { Select, Empty, Spin } from 'antd';
import { useWorldViewStore } from '@/stores/useWorldViewStore';
import CategoryManager from './CategoryManager';
import EntryList from './EntryList';
import EntryEditor from './EntryEditor';
import EntryDetail from './EntryDetail';

const { Option } = Select;

interface Novel {
  id: string;
  title: string;
}

const WorldViewPage: React.FC = () => {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [selectedNovelId, setSelectedNovelId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isEditingEntry, setIsEditingEntry] = useState(false);
  const [isCreatingEntry, setIsCreatingEntry] = useState(false);

  const {
    categories,
    selectedCategory,
    entries,
    loading,
    fetchCategories,
    fetchEntries,
    setSelectedCategory,
    setSelectedEntry,
    setSelectedNovel,
  } = useWorldViewStore();

  useEffect(() => {
    fetchNovels();
  }, []);

  useEffect(() => {
    if (selectedNovelId) {
      fetchCategories(selectedNovelId);
      setSelectedNovel(selectedNovelId);
    } else {
      setSelectedNovel(null);
    }
  }, [selectedNovelId, fetchCategories, setSelectedNovel]);

  useEffect(() => {
    if (selectedNovelId && selectedCategory) {
      fetchEntries(selectedNovelId, selectedCategory);
    } else if (selectedNovelId) {
      fetchEntries(selectedNovelId);
    }
  }, [selectedNovelId, selectedCategory, fetchEntries]);

  const fetchNovels = async () => {
    try {
      const res = await fetch('/api/novels');
      const json = await res.json();
      setNovels(json.data || []);
      if (json.data && json.data.length > 0) {
        setSelectedNovelId(json.data[0].id);
      }
    } catch {
      // Ignore error
    }
  };

  const handleEntryClick = (entryId: string) => {
    setSelectedEntryId(entryId);
    setIsEditingEntry(false);
    setIsCreatingEntry(false);
  };

  const handleEditEntry = () => {
    setIsEditingEntry(true);
    setIsCreatingEntry(false);
  };

  const handleCreateEntry = () => {
    setIsCreatingEntry(true);
    setIsEditingEntry(false);
    setSelectedEntryId(null);
  };

  const handleEntryModalClose = () => {
    setIsEditingEntry(false);
    setIsCreatingEntry(false);
    setSelectedEntryId(null);
    if (selectedNovelId && selectedCategory) {
      fetchEntries(selectedNovelId, selectedCategory);
    }
  };

  if (!selectedNovelId) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">世界观设定</h2>
        </div>
        <Empty description="请先创建一部小说" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">世界观设定</h2>
        <Select
          style={{ width: 200 }}
          placeholder="选择小说"
          value={selectedNovelId}
          onChange={setSelectedNovelId}
        >
          {novels.map((novel) => (
            <Option key={novel.id} value={novel.id}>
              {novel.title}
            </Option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-96">
          <Spin size="large" />
        </div>
      ) : categories.length === 0 ? (
        <CategoryManager novelId={selectedNovelId} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧分类管理 */}
          <div className="lg:col-span-1">
            <CategoryManager novelId={selectedNovelId} />
          </div>

          {/* 右侧条目列表 */}
          <div className="lg:col-span-3">
            {selectedCategory ? (
              <>
                <EntryList
                  novelId={selectedNovelId}
                  categoryId={selectedCategory}
                  onEntryClick={handleEntryClick}
                  onCreateEntry={handleCreateEntry}
                />
                {selectedEntryId && !isCreatingEntry && (
                  <EntryDetail
                    visible={!!selectedEntryId && !isEditingEntry && !isCreatingEntry}
                    onClose={() => setSelectedEntryId(null)}
                    entryId={selectedEntryId}
                    onEdit={handleEditEntry}
                  />
                )}
                {(isEditingEntry || isCreatingEntry) && (
                  <EntryEditor
                    visible={isEditingEntry || isCreatingEntry}
                    onClose={handleEntryModalClose}
                    novelId={selectedNovelId}
                    categoryId={selectedCategory}
                    entryId={isCreatingEntry ? undefined : selectedEntryId}
                  />
                )}
              </>
            ) : (
              <Empty description="请选择一个分类查看条目" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldViewPage;

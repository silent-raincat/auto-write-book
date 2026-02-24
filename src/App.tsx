import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/dashboard/Dashboard";
import CharacterList from "@/pages/characters/CharacterList";
import WorldViewPage from "@/pages/worldview/WorldViewPage";
import KnowledgeBase from "@/pages/knowledge/KnowledgeBase";
import Profile from "@/pages/profile/Profile";
import NovelDetail from "@/pages/editor/NovelDetail";
import ChapterEditor from "@/pages/editor/ChapterEditor";
import InspirationPool from "@/pages/InspirationPool";
import SmartWorldView from "@/pages/SmartWorldView";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="characters" element={<CharacterList />} />
          <Route path="worldview" element={<WorldViewPage />} />
          <Route path="smart-worldview" element={<SmartWorldView />} />
          <Route path="knowledge" element={<KnowledgeBase />} />
          <Route path="profile" element={<Profile />} />
          <Route path="novel/:id" element={<NovelDetail />} />
          <Route path="novel/:novelId/chapter/:chapterId" element={<ChapterEditor />} />
          <Route path="editor" element={<ChapterEditor />} />
          <Route path="inspirations" element={<InspirationPool />} />
        </Route>
      </Routes>
    </Router>
  );
}
